import pool from '../config/db.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendRecoveryDecisionEmail } from '../services/emailService.js';

/**
 * List all recovery submissions across the platform with filtering and search.
 * GET /api/admin/recoveries
 */
export const getAdminRecoveries = async (req, res, next) => {
    try {
        const { status, search } = req.query;

        let query = `
            SELECT
                r.id, r.lost_item_id, r.finder_id, r.item_name, r.brand, r.model, r.color,
                r.found_date, r.found_location, r.city, r.status, r.decision_reason,
                r.created_at, r.updated_at, r.reviewed_at,
                l.title as lost_title, l.category as lost_category, l.location as lost_location,
                l.status as lost_status,
                finder.name as finder_name, finder.email as finder_email,
                owner.name as owner_name, owner.email as owner_email,
                (SELECT COUNT(*) FROM RECOVERY_IMAGES WHERE recovery_id = r.id) as image_count
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS finder ON r.finder_id = finder.id
            JOIN USERS owner ON l.user_id = owner.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'ALL') {
            query += ' AND r.status = ?';
            params.push(status);
        }

        if (search && search.trim()) {
            query += ` AND (
                r.item_name LIKE ? OR
                l.title LIKE ? OR
                finder.name LIKE ? OR
                finder.email LIKE ? OR
                owner.name LIKE ? OR
                owner.email LIKE ?
            )`;
            const pattern = `%${search.trim()}%`;
            params.push(pattern, pattern, pattern, pattern, pattern, pattern);
        }

        query += ' ORDER BY r.created_at DESC';

        const [recoveries] = await pool.query(query, params);

        const normalized = recoveries.map(r => ({
            ...r,
            lostItemTitle: r.lost_title,
            lost_item_title: r.lost_title,
            finderItemName: r.item_name,
            finder_item_name: r.item_name,
            foundLocation: r.found_location,
            foundCity: r.city,
            foundDate: r.found_date,
            createdAt: r.created_at,
        }));

        return res.status(200).json(normalized);
    } catch (error) {
        next(error);
    }
};

/**
 * Get comprehensive recovery comparison details for administrator review.
 * GET /api/admin/recoveries/:id
 */
export const getAdminRecoveryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                r.*,
                l.title as lost_title, l.category as lost_category, l.description as lost_description,
                l.brand as lost_brand, l.model as lost_model, l.color as lost_color,
                l.identifying_details as lost_identifying_details, l.location as lost_location,
                l.lost_date, l.lost_time, l.status as lost_status, l.user_id as owner_id,
                owner.name as owner_name, owner.email as owner_email, owner.phone as owner_phone,
                finder.name as finder_name, finder.email as finder_email, finder.phone as finder_phone,
                reviewer.name as reviewer_name
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS owner ON l.user_id = owner.id
            JOIN USERS finder ON r.finder_id = finder.id
            LEFT JOIN USERS reviewer ON r.reviewed_by = reviewer.id
            WHERE r.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Recovery submission not found.' });
        }

        const recovery = rows[0];

        // Fetch recovery photos uploaded by finder
        const [images] = await pool.query(`
            SELECT id, image_url, public_id, file_type, created_at
            FROM RECOVERY_IMAGES
            WHERE recovery_id = ?
            ORDER BY created_at ASC
        `, [id]);

        // Fetch original lost item photos uploaded by owner
        const [lostImages] = await pool.query(`
            SELECT id, image_url, public_id, created_at
            FROM ITEM_IMAGES
            WHERE lost_item_id = ?
            ORDER BY created_at ASC
        `, [recovery.lost_item_id]);

        // Fetch audit logs
        const [auditLogs] = await pool.query(`
            SELECT a.id, a.from_status, a.to_status, a.action, a.notes, a.created_at, u.name as performed_by_name
            FROM RECOVERY_AUDIT_LOGS a
            JOIN USERS u ON a.performed_by = u.id
            WHERE a.recovery_id = ?
            ORDER BY a.created_at ASC
        `, [id]);

        return res.status(200).json({
            ...recovery,
            lostItemTitle: recovery.lost_title,
            lost_item_title: recovery.lost_title,
            lostItemCategory: recovery.lost_category,
            lostItemDescription: recovery.lost_description,
            lostItemLocation: recovery.lost_location,
            lostItemCity: recovery.city,
            lostDate: recovery.lost_date,
            finderItemName: recovery.item_name,
            finder_item_name: recovery.item_name,
            foundLocation: recovery.found_location,
            foundCity: recovery.city,
            foundDate: recovery.found_date,
            itemCondition: recovery.item_condition,
            additionalContext: recovery.additional_information,
            lostItemImage: lostImages[0]?.image_url || null,
            images,
            lostImages,
            auditLogs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Administrator decides a recovery submission (Approve or Reject).
 * Enforces strict parent->child lock order to prevent deadlocks.
 * Never sets LOST_ITEMS.status to RETURNED.
 * POST /api/admin/recoveries/:id/decide
 */
export const decideRecovery = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { decision, decisionReason, adminNotes } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            return res.status(400).json({ message: 'Decision must be either APPROVED or REJECTED.' });
        }

        if (!decisionReason || decisionReason.trim().length < 5) {
            return res.status(400).json({ message: 'A public decision reason must be provided (at least 5 characters).' });
        }

        // 1. Initial lookup to identify parent lost_item_id
        const [targetRows] = await connection.query(
            'SELECT lost_item_id FROM RECOVERY_SUBMISSIONS WHERE id = ?',
            [id]
        );

        if (targetRows.length === 0) {
            return res.status(404).json({ message: 'Recovery submission not found.' });
        }

        const lostItemId = targetRows[0].lost_item_id;

        await connection.beginTransaction();

        // 2. Lock parent LOST_ITEMS row first (Consistent Lock Ordering)
        const [lostRows] = await connection.query(
            'SELECT id, title, user_id, status FROM LOST_ITEMS WHERE id = ? FOR UPDATE',
            [lostItemId]
        );

        if (lostRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Parent lost item record not found.' });
        }

        // 3. Lock child RECOVERY_SUBMISSIONS row second
        const [recRows] = await connection.query(
            'SELECT id, status, lost_item_id, finder_id FROM RECOVERY_SUBMISSIONS WHERE id = ? FOR UPDATE',
            [id]
        );

        const recovery = recRows[0];

        // Terminal state check
        if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(recovery.status)) {
            await connection.rollback();
            return res.status(400).json({
                message: `Cannot decide a recovery submission that is already in '${recovery.status}' state.`
            });
        }

        // 4. Concurrency check: If decision is APPROVED, verify no other recovery is already approved for this lost item
        if (decision === 'APPROVED') {
            const [alreadyApproved] = await connection.query(
                `SELECT id FROM RECOVERY_SUBMISSIONS
                 WHERE lost_item_id = ? AND status = 'APPROVED' AND id != ?
                 FOR UPDATE`,
                [lostItemId, id]
            );

            if (alreadyApproved.length > 0) {
                await connection.rollback();
                return res.status(409).json({
                    message: `Cannot approve this recovery. Recovery submission #${alreadyApproved[0].id} is already approved for this lost item.`
                });
            }
        }

        // 5. Update recovery status and notes
        await connection.query(`
            UPDATE RECOVERY_SUBMISSIONS
            SET status = ?,
                decision_reason = ?,
                admin_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [decision, decisionReason.trim(), adminNotes ? adminNotes.trim() : null, adminId, id]);

        // 6. Record immutable audit log
        const auditAction = decision === 'APPROVED' ? 'RECOVERY_APPROVED' : 'RECOVERY_REJECTED';
        await connection.query(`
            INSERT INTO RECOVERY_AUDIT_LOGS (recovery_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            id,
            adminId,
            recovery.status,
            decision,
            auditAction,
            `Decision by Admin: ${decisionReason.trim()}`
        ]);

        await connection.commit();

        // ── Post-commit notifications & emails ──────────────────────────────
        pool.query(`
            SELECT
                owner.id as owner_id, owner.name as owner_name, owner.email as owner_email,
                finder.id as finder_id, finder.name as finder_name, finder.email as finder_email,
                l.title as lost_title
            FROM LOST_ITEMS l
            JOIN USERS owner ON l.user_id = owner.id
            JOIN USERS finder ON finder.id = ?
            WHERE l.id = ?
        `, [recovery.finder_id, lostItemId]).then(([rows]) => {
            if (rows.length === 0) return;
            const { owner_id, owner_name, owner_email, finder_id, finder_name, finder_email, lost_title } = rows[0];
            const isApproved = decision === 'APPROVED';

            // In-app notifications
            createNotification(
                finder_id,
                isApproved ? 'RECOVERY_APPROVED' : 'RECOVERY_REJECTED',
                isApproved ? 'Recovery Approved! 🎉' : 'Recovery Update',
                isApproved
                    ? `Your recovery submission for "${lost_title}" was APPROVED by the administrator!`
                    : `Your recovery submission for "${lost_title}" was not approved: ${decisionReason.trim()}`,
                `/recoveries/${id}`
            );

            createNotification(
                owner_id,
                isApproved ? 'RECOVERY_APPROVED' : 'RECOVERY_REJECTED',
                isApproved ? 'Item Recovery Verified!' : 'Recovery Update',
                isApproved
                    ? `Administrator verified that "${lost_title}" was recovered by ${finder_name}. You can coordinate handover.`
                    : `A recovery submission for "${lost_title}" was reviewed and rejected.`,
                `/recoveries/${id}`
            );

            // Brevo transactional emails
            sendRecoveryDecisionEmail(finder_email, finder_name, lost_title, id, decision, decisionReason.trim()).catch(() => {});
            sendRecoveryDecisionEmail(owner_email, owner_name, lost_title, id, decision, decisionReason.trim()).catch(() => {});
        }).catch(err => {
            console.error('[Recovery] Post-decision notification error:', err.message);
        });
        // ────────────────────────────────────────────────────────────────────

        return res.status(200).json({
            message: `Recovery submission successfully ${decision.toLowerCase()}.`
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Administrator revokes a previously approved recovery.
 * Mandatory reason required (>= 10 characters).
 * Transitions status from APPROVED to CANCELLED and logs ADMIN_REVOCATION.
 * POST /api/admin/recoveries/:id/revoke
 */
export const revokeRecoveryApproval = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { revocationReason, adminNotes } = req.body;

        if (!revocationReason || revocationReason.trim().length < 10) {
            return res.status(400).json({
                message: 'A detailed revocation reason must be provided (at least 10 characters).'
            });
        }

        // 1. Initial lookup to identify parent lost_item_id
        const [targetRows] = await connection.query(
            'SELECT lost_item_id FROM RECOVERY_SUBMISSIONS WHERE id = ?',
            [id]
        );

        if (targetRows.length === 0) {
            return res.status(404).json({ message: 'Recovery submission not found.' });
        }

        const lostItemId = targetRows[0].lost_item_id;

        await connection.beginTransaction();

        // 2. Lock parent LOST_ITEMS row first (Consistent Lock Ordering)
        const [lostRows] = await connection.query(
            'SELECT id, title, user_id FROM LOST_ITEMS WHERE id = ? FOR UPDATE',
            [lostItemId]
        );

        if (lostRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Parent lost item record not found.' });
        }

        // 3. Lock child RECOVERY_SUBMISSIONS row second
        const [recRows] = await connection.query(
            'SELECT id, status, finder_id FROM RECOVERY_SUBMISSIONS WHERE id = ? FOR UPDATE',
            [id]
        );

        const recovery = recRows[0];

        if (recovery.status !== 'APPROVED') {
            await connection.rollback();
            return res.status(400).json({
                message: `Only APPROVED recovery submissions can be revoked (current status: ${recovery.status}).`
            });
        }

        // 4. Update status to CANCELLED
        await connection.query(`
            UPDATE RECOVERY_SUBMISSIONS
            SET status = 'CANCELLED',
                decision_reason = ?,
                admin_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [
            `Approval Revoked: ${revocationReason.trim()}`,
            adminNotes ? adminNotes.trim() : null,
            adminId,
            id
        ]);

        // 5. Append-only audit log
        await connection.query(`
            INSERT INTO RECOVERY_AUDIT_LOGS (recovery_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, 'APPROVED', 'CANCELLED', 'ADMIN_REVOCATION', ?)
        `, [id, adminId, revocationReason.trim()]);

        await connection.commit();

        // ── Post-commit notifications & emails ──────────────────────────────
        pool.query(`
            SELECT
                owner.id as owner_id, owner.name as owner_name, owner.email as owner_email,
                finder.id as finder_id, finder.name as finder_name, finder.email as finder_email,
                l.title as lost_title
            FROM LOST_ITEMS l
            JOIN USERS owner ON l.user_id = owner.id
            JOIN USERS finder ON finder.id = ?
            WHERE l.id = ?
        `, [recovery.finder_id, lostItemId]).then(([rows]) => {
            if (rows.length === 0) return;
            const { owner_id, owner_name, owner_email, finder_id, finder_name, finder_email, lost_title } = rows[0];

            createNotification(
                finder_id,
                'RECOVERY_REVOKED',
                'Recovery Approval Revoked',
                `The previous approval for "${lost_title}" was revoked: ${revocationReason.trim()}`,
                `/recoveries/${id}`
            );

            createNotification(
                owner_id,
                'RECOVERY_REVOKED',
                'Recovery Status Update',
                `The recovery approval for "${lost_title}" was revoked by the administrator: ${revocationReason.trim()}`,
                `/recoveries/${id}`
            );

            sendRecoveryDecisionEmail(finder_email, finder_name, lost_title, id, 'CANCELLED', revocationReason.trim()).catch(() => {});
            sendRecoveryDecisionEmail(owner_email, owner_name, lost_title, id, 'CANCELLED', revocationReason.trim()).catch(() => {});
        }).catch(err => {
            console.error('[Recovery] Post-revocation notification error:', err.message);
        });
        // ────────────────────────────────────────────────────────────────────

        return res.status(200).json({
            message: 'Recovery approval was successfully revoked and logged.'
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
