import pool from '../config/db.js';
import { uploadEvidenceToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendRecoverySubmittedEmail } from '../services/emailService.js';

/**
 * Check if the current user can submit a recovery report for a specific lost item.
 * GET /api/recoveries/check-eligibility/:lostItemId
 */
export const checkEligibility = async (req, res, next) => {
    try {
        const { lostItemId } = req.params;
        const userId = req.user.id;

        // 1. Verify lost item exists
        const [items] = await pool.query(
            'SELECT id, user_id, title, status FROM LOST_ITEMS WHERE id = ?',
            [lostItemId]
        );

        if (items.length === 0) {
            return res.status(404).json({ eligible: false, reason: 'Lost item not found.' });
        }

        const item = items[0];

        // 2. Cannot report recovery on your own lost item
        if (item.user_id === userId) {
            return res.status(200).json({
                eligible: false,
                reason: 'You reported this item as lost. You cannot submit a recovery report for your own item.'
            });
        }

        // 3. Item must be available (not returned or closed)
        if (item.status === 'RETURNED' || item.status === 'CLOSED') {
            return res.status(200).json({
                eligible: false,
                reason: `This lost item report is no longer active (Status: ${item.status}).`
            });
        }

        // 4. Cross-finder check: verify whether any active recovery exists for this lost item
        const [activeRecoveries] = await pool.query(`
            SELECT id, finder_id, status, created_at
            FROM RECOVERY_SUBMISSIONS
            WHERE lost_item_id = ? AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
            LIMIT 1
        `, [lostItemId]);

        if (activeRecoveries.length > 0) {
            const active = activeRecoveries[0];
            const isOwn = active.finder_id === userId;
            return res.status(200).json({
                eligible: false,
                reason: isOwn
                    ? 'You already have an active recovery submission for this lost item.'
                    : 'A recovery submission is already under active review for this lost item.',
                existingRecovery: active
            });
        }

        return res.status(200).json({ eligible: true });
    } catch (error) {
        next(error);
    }
};

/**
 * Submit a recovery report for a lost item.
 * POST /api/recoveries
 */
export const createRecovery = async (req, res, next) => {
    const connection = await pool.getConnection();
    const uploadedAssets = [];

    try {
        await connection.beginTransaction();

        const finderId = req.user.id;
        const lost_item_id = req.body.lost_item_id || req.body.lostItemId;
        const item_name = req.body.item_name || req.body.finderItemName || req.body.finder_item_name || req.body.itemName;
        const brand = req.body.brand;
        const model = req.body.model;
        const color = req.body.color;
        const identifying_marks = req.body.identifying_marks || req.body.distinguishingMarks;
        const found_date = req.body.found_date || req.body.foundDate;
        const found_time = req.body.found_time || req.body.foundTime;
        const found_location = req.body.found_location || req.body.foundLocation;
        const city = req.body.city || req.body.foundCity;
        const location_description = req.body.location_description || req.body.locationDescription;
        const item_condition = req.body.item_condition || req.body.itemCondition || 'GOOD';
        const additional_information = req.body.additional_information || req.body.additionalInformation || req.body.additionalContext || req.body.safeCustodyDetails;
        const files = Array.isArray(req.files) ? req.files : [...(req.files?.photos || []), ...(req.files?.evidence || [])];

        // Validation
        if (!lost_item_id) {
            await connection.rollback();
            return res.status(400).json({ message: 'Lost item ID is required.' });
        }

        if (!item_name || item_name.trim().length < 2) {
            await connection.rollback();
            return res.status(400).json({ message: 'Please provide a valid item name (at least 2 characters).' });
        }

        if (!found_date) {
            await connection.rollback();
            return res.status(400).json({ message: 'Found date is required.' });
        }

        if (!found_location || found_location.trim().length < 3) {
            await connection.rollback();
            return res.status(400).json({ message: 'Found location is required (at least 3 characters).' });
        }

        // 1. Consistent Lock Ordering: Lock parent LOST_ITEMS row first
        const [lostRows] = await connection.query(
            'SELECT id, user_id, title, status FROM LOST_ITEMS WHERE id = ? FOR UPDATE',
            [lost_item_id]
        );

        if (lostRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Lost item not found.' });
        }

        const lostItem = lostRows[0];

        if (lostItem.user_id === finderId) {
            await connection.rollback();
            return res.status(403).json({ message: 'You cannot submit a recovery report for your own lost item.' });
        }

        if (lostItem.status === 'RETURNED' || lostItem.status === 'CLOSED') {
            await connection.rollback();
            return res.status(400).json({ message: `This lost item is no longer open for recovery submissions (Status: ${lostItem.status}).` });
        }

        // 2. Cross-finder active recovery check (with lock)
        const [activeRows] = await connection.query(`
            SELECT id, finder_id, status FROM RECOVERY_SUBMISSIONS
            WHERE lost_item_id = ? AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
            FOR UPDATE
        `, [lost_item_id]);

        if (activeRows.length > 0) {
            await connection.rollback();
            const isOwn = activeRows[0].finder_id === finderId;
            return res.status(409).json({
                message: isOwn
                    ? 'You already have an active recovery submission for this lost item.'
                    : 'A recovery submission is already under active review for this lost item.'
            });
        }

        // 3. Insert RECOVERY_SUBMISSIONS row
        const [insertResult] = await connection.query(`
            INSERT INTO RECOVERY_SUBMISSIONS (
                lost_item_id,
                finder_id,
                item_name,
                brand,
                model,
                color,
                identifying_marks,
                found_date,
                found_time,
                found_location,
                city,
                location_description,
                item_condition,
                additional_information,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [
            lost_item_id,
            finderId,
            item_name.trim(),
            brand ? brand.trim() : null,
            model ? model.trim() : null,
            color ? color.trim() : null,
            identifying_marks ? identifying_marks.trim() : null,
            found_date,
            found_time || null,
            found_location.trim(),
            city ? city.trim() : null,
            location_description ? location_description.trim() : null,
            item_condition ? item_condition.trim() : null,
            additional_information ? additional_information.trim() : null
        ]);

        const recoveryId = insertResult.insertId;

        // 4. Insert initial audit log entry (Append-only)
        await connection.query(`
            INSERT INTO RECOVERY_AUDIT_LOGS (recovery_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, NULL, 'PENDING', 'RECOVERY_SUBMITTED', 'Finder submitted item recovery report with photographs')
        `, [recoveryId, finderId]);

        // 5. Upload evidence images to Cloudinary (with orphan tracking)
        if (files.length > 0) {
            try {
                for (const file of files) {
                    const result = await uploadEvidenceToCloudinary(
                        file.buffer,
                        `lost-and-found/recovery-evidence/${recoveryId}`
                    );
                    uploadedAssets.push(result);
                }

                const imageRows = uploadedAssets.map(asset => [
                    recoveryId,
                    asset.secure_url,
                    asset.public_id,
                    'image'
                ]);

                await connection.query(`
                    INSERT INTO RECOVERY_IMAGES (recovery_id, image_url, public_id, file_type)
                    VALUES ?
                `, [imageRows]);
            } catch (uploadError) {
                // Rollback uploaded Cloudinary files immediately
                for (const asset of uploadedAssets) {
                    await deleteFromCloudinary(asset.public_id);
                }
                await connection.rollback();
                return res.status(500).json({ message: 'Failed to upload recovery photographs. Please try again.' });
            }
        }

        await connection.commit();

        // ── Post-commit notifications & emails (Fire-and-forget) ───────────
        pool.query(`
            SELECT
                owner.id as owner_id, owner.email as owner_email, owner.name as owner_name,
                finder.name as finder_name,
                l.title as lost_title
            FROM LOST_ITEMS l
            JOIN USERS owner ON l.user_id = owner.id
            JOIN USERS finder ON finder.id = ?
            WHERE l.id = ?
        `, [finderId, lost_item_id]).then(([rows]) => {
            if (rows.length === 0) return;
            const { owner_id, owner_email, owner_name, finder_name, lost_title } = rows[0];

            // In-app notification to lost-item owner
            createNotification(
                owner_id,
                'RECOVERY_SUBMITTED',
                'Possible Match Found!',
                `${finder_name} reported finding an item matching your lost report "${lost_title}".`,
                `/recoveries/${recoveryId}`
            );

            // In-app notification to finder (confirmation)
            createNotification(
                finderId,
                'RECOVERY_SUBMITTED',
                'Recovery Report Submitted',
                `Your recovery report for "${lost_title}" was submitted and is awaiting administrator review.`,
                `/recoveries/${recoveryId}`
            );

            // Brevo email to owner
            sendRecoverySubmittedEmail(owner_email, owner_name, finder_name, lost_title, recoveryId).catch(() => {});
        }).catch(err => {
            console.error('[Recovery] Notification dispatch error:', err.message);
        });
        // ───────────────────────────────────────────────────────────────────

        return res.status(201).json({
            message: 'Recovery report submitted successfully. Awaiting administrator review.',
            recoveryId
        });
    } catch (error) {
        await connection.rollback();
        // Clean up orphaned Cloudinary assets
        for (const asset of uploadedAssets) {
            try {
                await deleteFromCloudinary(asset.public_id);
            } catch (delErr) {
                console.error(`[Recovery] Failed to clean up Cloudinary asset ${asset.public_id}:`, delErr.message);
            }
        }
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Get recovery reports submitted by the current authenticated finder.
 * GET /api/recoveries/my-submissions
 */
export const getMySubmissions = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(`
            SELECT
                r.id, r.lost_item_id, r.finder_id, r.item_name, r.brand, r.model, r.color,
                r.found_date, r.found_location, r.city, r.status, r.decision_reason, r.created_at, r.updated_at,
                l.title as lost_title, l.category as lost_category,
                owner.name as owner_name,
                (SELECT image_url FROM RECOVERY_IMAGES WHERE recovery_id = r.id ORDER BY id ASC LIMIT 1) as primary_image,
                (SELECT image_url FROM ITEM_IMAGES WHERE lost_item_id = l.id ORDER BY id ASC LIMIT 1) as lost_item_image
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS owner ON l.user_id = owner.id
            WHERE r.finder_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);

        const normalized = rows.map(r => ({
            ...r,
            lostItemTitle: r.lost_title,
            lost_item_title: r.lost_title,
            lostItemCategory: r.lost_category,
            lost_item_category: r.lost_category,
            finderItemName: r.item_name,
            finder_item_name: r.item_name,
            foundLocation: r.found_location,
            foundCity: r.city,
            foundDate: r.found_date,
            createdAt: r.created_at,
            updatedAt: r.updated_at || r.created_at,
            primaryImage: r.primary_image || null,
            primary_image: r.primary_image || null,
            recoveryImage: r.primary_image || null,
            lostItemImage: r.lost_item_image || null,
            lost_item_image: r.lost_item_image || null,
            ownerName: r.owner_name,
        }));

        return res.status(200).json(normalized);
    } catch (error) {
        next(error);
    }
};

/**
 * Get recovery reports received on lost items reported by current user.
 * GET /api/recoveries/received
 */
export const getReceivedRecoveries = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(`
            SELECT
                r.id, r.lost_item_id, r.finder_id, r.item_name, r.brand, r.model, r.color,
                r.found_date, r.found_location, r.city, r.status, r.decision_reason, r.created_at, r.updated_at,
                l.title as lost_title, l.category as lost_category,
                finder.name as finder_name,
                (SELECT image_url FROM RECOVERY_IMAGES WHERE recovery_id = r.id ORDER BY id ASC LIMIT 1) as primary_image,
                (SELECT image_url FROM ITEM_IMAGES WHERE lost_item_id = l.id ORDER BY id ASC LIMIT 1) as lost_item_image
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS finder ON r.finder_id = finder.id
            WHERE l.user_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);

        const normalized = rows.map(r => ({
            ...r,
            lostItemTitle: r.lost_title,
            lost_item_title: r.lost_title,
            lostItemCategory: r.lost_category,
            lost_item_category: r.lost_category,
            finderItemName: r.item_name,
            finder_item_name: r.item_name,
            foundLocation: r.found_location,
            foundCity: r.city,
            foundDate: r.found_date,
            createdAt: r.created_at,
            updatedAt: r.updated_at || r.created_at,
            primaryImage: r.primary_image || null,
            primary_image: r.primary_image || null,
            recoveryImage: r.primary_image || null,
            lostItemImage: r.lost_item_image || null,
            lost_item_image: r.lost_item_image || null,
            finderName: r.finder_name,
        }));

        return res.status(200).json(normalized);
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed recovery report by ID.
 * Authorized for: Finder, Lost Item Owner, or Administrator.
 * Note: admin_notes is strictly excluded from non-admin responses.
 * GET /api/recoveries/:id
 */
export const getRecoveryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [rows] = await pool.query(`
            SELECT
                r.id, r.lost_item_id, r.finder_id, r.item_name, r.brand, r.model, r.color,
                r.identifying_marks, r.found_date, r.found_time, r.found_location, r.city,
                r.location_description, r.item_condition, r.additional_information,
                r.status, r.decision_reason, r.reviewed_at, r.created_at,
                ${isAdmin ? 'r.admin_notes,' : ''}
                l.title as lost_title, l.category as lost_category, l.description as lost_description,
                l.brand as lost_brand, l.model as lost_model, l.color as lost_color,
                l.identifying_details as lost_identifying_details, l.location as lost_location,
                l.lost_date, l.lost_time, l.status as lost_status, l.user_id as owner_id,
                owner.name as owner_name, owner.email as owner_email,
                finder.name as finder_name,
                ${isAdmin ? 'finder.email as finder_email, finder.phone as finder_phone, owner.phone as owner_phone,' : ''}
                reviewer.name as reviewer_name
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS owner ON l.user_id = owner.id
            JOIN USERS finder ON r.finder_id = finder.id
            LEFT JOIN USERS reviewer ON r.reviewed_by = reviewer.id
            WHERE r.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Recovery report not found.' });
        }

        const recovery = rows[0];

        // Authorization check
        const isFinder = recovery.finder_id === userId;
        const isOwner = recovery.owner_id === userId;

        if (!isFinder && !isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You are not authorized to view this recovery report.' });
        }

        // Fetch recovery photos
        const [images] = await pool.query(`
            SELECT id, image_url, public_id, file_type, created_at
            FROM RECOVERY_IMAGES
            WHERE recovery_id = ?
            ORDER BY created_at ASC
        `, [id]);

        // Fetch original lost item photos
        const [lostImages] = await pool.query(`
            SELECT id, image_url, public_id
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

        // Resolve conversation if exists
        const [convRows] = await pool.query(`
            SELECT id FROM RECOVERY_CONVERSATIONS WHERE recovery_id = ? LIMIT 1
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
            decisionReason: recovery.decision_reason,
            finderId: recovery.finder_id,
            reporterId: recovery.owner_id,
            ownerId: recovery.owner_id,
            finderName: recovery.finder_name,
            ownerName: recovery.owner_name,
            createdAt: recovery.created_at,
            lostItemImage: lostImages[0]?.image_url || null,
            images,
            lostImages,
            auditLogs,
            conversationId: convRows[0]?.id || null,
            userRole: isFinder ? 'FINDER' : (isOwner ? 'OWNER' : 'ADMIN')
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Finder cancels their recovery submission.
 * Allowed strictly while status is 'PENDING'.
 * POST /api/recoveries/:id/cancel
 */
export const cancelRecovery = async (req, res, next) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const userId = req.user.id;

        // 1. Look up parent lost item id first
        const [targetRows] = await connection.query(
            'SELECT lost_item_id FROM RECOVERY_SUBMISSIONS WHERE id = ?',
            [id]
        );

        if (targetRows.length === 0) {
            return res.status(404).json({ message: 'Recovery report not found.' });
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
            return res.status(404).json({ message: 'Parent lost item not found.' });
        }

        // 3. Lock child RECOVERY_SUBMISSIONS row second
        const [recRows] = await connection.query(
            'SELECT id, finder_id, status FROM RECOVERY_SUBMISSIONS WHERE id = ? FOR UPDATE',
            [id]
        );

        const recovery = recRows[0];

        if (recovery.finder_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ message: 'You can only cancel your own recovery submissions.' });
        }

        if (recovery.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({
                message: `Cannot cancel submission. Cancellation is only permitted while status is PENDING (current status: ${recovery.status}).`
            });
        }

        const { reason } = req.body || {};
        const cancelReason = reason && typeof reason === 'string' && reason.trim()
            ? `Cancelled by finder: ${reason.trim()}`
            : 'Cancelled by finder';
        const auditNotes = reason && typeof reason === 'string' && reason.trim()
            ? `Finder voluntarily cancelled submission: ${reason.trim()}`
            : 'Finder voluntarily cancelled submission while pending review';

        // 4. Update status to CANCELLED
        await connection.query(`
            UPDATE RECOVERY_SUBMISSIONS
            SET status = 'CANCELLED', decision_reason = ?, updated_at = NOW()
            WHERE id = ?
        `, [cancelReason, id]);

        // 5. Append-only audit log
        await connection.query(`
            INSERT INTO RECOVERY_AUDIT_LOGS (recovery_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, 'PENDING', 'CANCELLED', 'FINDER_CANCELLED', ?)
        `, [id, userId, auditNotes]);

        await connection.commit();

        // Notify lost item owner
        createNotification(
            lostRows[0].user_id,
            'RECOVERY_CANCELLED',
            'Recovery Report Cancelled',
            `The finder cancelled their recovery report for "${lostRows[0].title}".`,
            `/lost-items/${lostItemId}`
        );

        return res.status(200).json({ message: 'Recovery submission cancelled successfully.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
