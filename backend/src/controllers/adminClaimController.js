import pool from '../config/db.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendClaimDecisionEmail } from '../services/emailService.js';

/**
 * List and filter all claims across the platform (Admin only)
 * GET /api/admin/claims
 */
export const getAdminClaims = async (req, res, next) => {
    try {
        const { status, search } = req.query;

        let query = `
            SELECT
                c.id, c.found_item_id, c.claimant_id, c.lost_item_id, c.match_id,
                c.claim_reason, c.status, c.finder_response, c.decision_reason,
                c.created_at, c.updated_at, c.reviewed_at,
                f.title as found_title, f.category as found_category, f.location as found_location,
                claimant.name as claimant_name, claimant.email as claimant_email,
                finder.name as finder_name, finder.email as finder_email,
                (SELECT COUNT(*) FROM CLAIM_EVIDENCE WHERE claim_id = c.id) as evidence_count
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS claimant ON c.claimant_id = claimant.id
            JOIN USERS finder ON f.user_id = finder.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'ALL') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (search && search.trim()) {
            query += ` AND (
                f.title LIKE ? OR
                claimant.name LIKE ? OR
                claimant.email LIKE ? OR
                c.claim_reason LIKE ?
            )`;
            const pattern = `%${search.trim()}%`;
            params.push(pattern, pattern, pattern, pattern);
        }

        query += ' ORDER BY c.created_at DESC';

        const [claims] = await pool.query(query, params);

        return res.status(200).json(claims);
    } catch (error) {
        next(error);
    }
};

/**
 * Get complete claim detail including private admin notes and audit trail (Admin only)
 * GET /api/admin/claims/:id
 */
export const getAdminClaimDetail = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [claims] = await pool.query(`
            SELECT
                c.*,
                f.title as found_title, f.category as found_category,
                f.brand as found_brand, f.model as found_model, f.color as found_color,
                f.description as found_description, f.identifying_details as found_identifying_details,
                f.location as found_location, f.found_date, f.found_time,
                f.status as found_status, f.created_at as found_created_at,
                f.user_id as finder_id,
                claimant.name as claimant_name, claimant.email as claimant_email, claimant.phone as claimant_phone,
                finder.name as finder_name, finder.email as finder_email, finder.phone as finder_phone,
                admin.name as reviewer_name,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS claimant ON c.claimant_id = claimant.id
            JOIN USERS finder ON f.user_id = finder.id
            LEFT JOIN USERS admin ON c.reviewed_by = admin.id
            WHERE c.id = ?
        `, [id]);

        if (claims.length === 0) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        // Fetch original photos uploaded by finder for this found item
        const [foundItemImages] = await pool.query(`
            SELECT id, image_url, public_id, created_at
            FROM ITEM_IMAGES
            WHERE found_item_id = ?
            ORDER BY created_at ASC
        `, [claim.found_item_id]);

        // Fetch evidence
        const [evidence] = await pool.query(`
            SELECT id, image_url, public_id, file_type, description, created_at
            FROM CLAIM_EVIDENCE
            WHERE claim_id = ?
            ORDER BY created_at ASC
        `, [id]);

        // Fetch audit logs
        const [auditLogs] = await pool.query(`
            SELECT l.id, l.from_status, l.to_status, l.action, l.notes, l.created_at,
                   u.name as actor_name, u.role as actor_role
            FROM CLAIM_AUDIT_LOGS l
            JOIN USERS u ON l.performed_by = u.id
            WHERE l.claim_id = ?
            ORDER BY l.created_at ASC
        `, [id]);

        // If linked to a lost item, fetch its details
        let lostItem = null;
        if (claim.lost_item_id) {
            const [lostRows] = await pool.query(`
                SELECT id, title, category, brand, model, color, description, identifying_details, location, lost_date, lost_time, status, created_at
                FROM LOST_ITEMS WHERE id = ?
            `, [claim.lost_item_id]);
            if (lostRows.length > 0) lostItem = lostRows[0];
        }

        return res.status(200).json({
            claim: {
                ...claim,
                foundItemImages: foundItemImages || []
            },
            foundItemImages: foundItemImages || [],
            evidence,
            auditLogs,
            lostItem
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Administrator makes final ownership decision (APPROVE or REJECT)
 * POST /api/admin/claims/:id/decide
 */
export const decideClaim = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const adminId = req.user.id;
        const { decision, decisionReason, adminNotes } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Decision must be either APPROVED or REJECTED.' });
        }

        if (!decisionReason || decisionReason.trim().length < 5) {
            await connection.rollback();
            return res.status(400).json({ message: 'A public decision reason must be provided (at least 5 characters).' });
        }

        const [claims] = await connection.query(`
            SELECT c.id, c.status, c.found_item_id, c.claimant_id, f.status as found_status
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            WHERE c.id = ? FOR UPDATE
        `, [id]);

        if (claims.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        // Terminal state check
        if (['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(claim.status)) {
            await connection.rollback();
            return res.status(400).json({
                message: `Cannot decide a claim that is already in '${claim.status}' state.`
            });
        }

        // 1. Update claim status
        await connection.query(`
            UPDATE CLAIMS
            SET status = ?,
                decision_reason = ?,
                admin_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [decision, decisionReason.trim(), adminNotes ? adminNotes.trim() : null, adminId, id]);

        // 2. Record audit log
        const auditAction = decision === 'APPROVED' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED';
        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            id,
            adminId,
            claim.status,
            decision,
            auditAction,
            `Decision by Admin: ${decisionReason.trim()}`
        ]);

        // 3. Item status handling:
        // If APPROVED: Make item eligible for future return workflow (mark as MATCHED if it was OPEN).
        // Do NOT mark it RETURNED automatically.
        if (decision === 'APPROVED' && claim.found_status === 'OPEN') {
            await connection.query(`
                UPDATE FOUND_ITEMS SET status = 'MATCHED' WHERE id = ?
            `, [claim.found_item_id]);
        }

        await connection.commit();

        // ── Fire-and-forget: notify claimant + finder + send email ───────
        pool.query(
            `SELECT c.claimant_id, c.found_item_id,
                    claimant.email as claimant_email, claimant.name as claimant_name,
                    finder.id as finder_id, finder.email as finder_email, finder.name as finder_name,
                    f.title as found_title
             FROM CLAIMS c
             JOIN FOUND_ITEMS f ON c.found_item_id = f.id
             JOIN USERS claimant ON c.claimant_id = claimant.id
             JOIN USERS finder ON f.user_id = finder.id
             WHERE c.id = ?`,
            [id]
        ).then(([rows]) => {
            if (rows.length === 0) return;
            const { claimant_id, claimant_email, claimant_name,
                    finder_id, finder_email, finder_name, found_title } = rows[0];
            const isApproved = decision === 'APPROVED';

            // Notify claimant
            createNotification(
                claimant_id,
                'CLAIM_DECISION',
                isApproved ? '✅ Your Claim Has Been Approved' : '❌ Your Claim Was Rejected',
                decisionReason.trim(),
                `/claims/${id}`
            );
            // Notify finder
            createNotification(
                finder_id,
                'CLAIM_DECISION',
                isApproved ? 'Claim Approved for Your Found Item' : 'Claim Rejected for Your Found Item',
                decisionReason.trim(),
                `/claims/${id}`
            );
            // Email claimant (fire-and-forget)
            sendClaimDecisionEmail(
                claimant_email, claimant_name, found_title, id, decision, decisionReason.trim()
            ).catch(() => {});
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────

        return res.status(200).json({
            message: `Claim successfully ${decision.toLowerCase()}.`,
            decision
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Administrator: List all reported messages for moderation (Feature F)
 * GET /api/admin/claims/reports
 */
export const getAdminMessageReports = async (req, res, next) => {
    try {
        const [reports] = await pool.query(`
            SELECT
                r.id, r.message_id, r.conversation_id, r.reporter_id, r.reported_user_id,
                r.reason, r.details, r.status, r.reviewed_by, r.reviewed_at, r.admin_notes, r.created_at,
                m.message_text, m.created_at as message_sent_at,
                reporter.name as reporter_name, reporter.email as reporter_email,
                reported.name as reported_name, reported.email as reported_email,
                conv.claim_id,
                f.title as found_title
            FROM MESSAGE_REPORTS r
            JOIN CLAIM_MESSAGES m ON r.message_id = m.id
            JOIN CLAIM_CONVERSATIONS conv ON r.conversation_id = conv.id
            JOIN CLAIMS c ON conv.claim_id = c.id
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS reporter ON r.reporter_id = reporter.id
            JOIN USERS reported ON r.reported_user_id = reported.id
            ORDER BY r.created_at DESC
        `);

        return res.status(200).json(reports);
    } catch (error) {
        next(error);
    }
};

/**
 * Administrator: Review and take action on a reported message (Feature F)
 * POST /api/admin/claims/reports/:id/review
 */
export const reviewMessageReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        const adminId = req.user.id;

        const validStatuses = ['REVIEWED', 'DISMISSED', 'ACTION_TAKEN'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Status must be one of: ${validStatuses.join(', ')}.`
            });
        }

        const [existing] = await pool.query('SELECT id FROM MESSAGE_REPORTS WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        await pool.query(`
            UPDATE MESSAGE_REPORTS
            SET status = ?,
                admin_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE id = ?
        `, [status, adminNotes ? adminNotes.trim() : null, adminId, id]);

        return res.status(200).json({
            message: `Report marked as ${status}.`,
            status
        });
    } catch (error) {
        next(error);
    }
};
