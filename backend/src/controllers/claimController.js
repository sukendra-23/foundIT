import pool from '../config/db.js';
import { uploadEvidenceToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendClaimSubmittedEmail, sendClaimConfirmationEmail } from '../services/emailService.js';

/**
 * Check if the current authenticated user is eligible to claim a found item
 * GET /api/claims/check-eligibility/:foundItemId
 */
export const checkEligibility = async (req, res, next) => {
    try {
        const { foundItemId } = req.params;
        const userId = req.user.id;

        // 1. Check if found item exists
        const [items] = await pool.query(
            'SELECT id, user_id, title, status FROM FOUND_ITEMS WHERE id = ?',
            [foundItemId]
        );

        if (items.length === 0) {
            return res.status(404).json({ eligible: false, reason: 'Found item does not exist.' });
        }

        const item = items[0];

        // 2. Cannot claim an item you reported as found
        if (item.user_id === userId) {
            return res.status(200).json({
                eligible: false,
                reason: 'You reported this item as found. You cannot claim your own found report.'
            });
        }

        // 3. Item must be available (not returned or closed)
        if (item.status === 'RETURNED' || item.status === 'CLOSED') {
            return res.status(200).json({
                eligible: false,
                reason: `This item is no longer available for claims (Status: ${item.status}).`
            });
        }

        // 4. Check for existing active claims by this user on this item
        const [existingClaims] = await pool.query(`
            SELECT id, status, created_at
            FROM CLAIMS
            WHERE found_item_id = ? AND claimant_id = ?
              AND status IN ('PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW', 'APPROVED')
        `, [foundItemId, userId]);

        if (existingClaims.length > 0) {
            return res.status(200).json({
                eligible: false,
                reason: 'You already have an active claim for this item.',
                existingClaim: existingClaims[0]
            });
        }

        return res.status(200).json({ eligible: true });
    } catch (error) {
        next(error);
    }
};

/**
 * Submit an ownership claim for a found item
 * POST /api/claims
 */
export const createClaim = async (req, res, next) => {
    const connection = await pool.getConnection();
    const uploadedAssets = [];

    try {
        await connection.beginTransaction();

        const claimantId = req.user.id;
        const {
            found_item_id,
            claim_reason,
            ownership_details,
            identifying_marks,
            lost_date_claimed,
            lost_location_claimed,
            lost_item_id,
            match_id
        } = req.body;
        const files = req.files || [];

        if (!found_item_id) {
            await connection.rollback();
            return res.status(400).json({ message: 'Found item ID is required.' });
        }

        if (!ownership_details || ownership_details.trim().length < 15) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Please provide detailed ownership proof (at least 15 characters describing what proves ownership).'
            });
        }

        // 1. Lock and verify found item
        const [foundItems] = await connection.query(
            'SELECT id, user_id, status FROM FOUND_ITEMS WHERE id = ? FOR UPDATE',
            [found_item_id]
        );

        if (foundItems.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Found item not found.' });
        }

        const foundItem = foundItems[0];

        if (foundItem.user_id === claimantId) {
            await connection.rollback();
            return res.status(403).json({ message: 'You cannot submit a claim for an item you reported as found.' });
        }

        if (foundItem.status === 'RETURNED' || foundItem.status === 'CLOSED') {
            await connection.rollback();
            return res.status(400).json({ message: 'This item has already been returned or closed.' });
        }

        // 2. Prevent duplicate active claim
        const [existing] = await connection.query(`
            SELECT id FROM CLAIMS
            WHERE found_item_id = ? AND claimant_id = ?
              AND status IN ('PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW', 'APPROVED')
            FOR UPDATE
        `, [found_item_id, claimantId]);

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'You already have an active claim for this item.' });
        }

        // 3. Insert claim (Initial workflow state: PENDING, moving to FINDER_REVIEW)
        const [insertResult] = await connection.query(`
            INSERT INTO CLAIMS (
                found_item_id,
                claimant_id,
                lost_item_id,
                match_id,
                claim_reason,
                ownership_details,
                identifying_marks,
                lost_date_claimed,
                lost_location_claimed,
                proof_description,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [
            found_item_id,
            claimantId,
            lost_item_id || null,
            match_id || null,
            claim_reason ? claim_reason.trim() : null,
            ownership_details.trim(),
            identifying_marks ? identifying_marks.trim() : null,
            lost_date_claimed || null,
            lost_location_claimed ? lost_location_claimed.trim() : null,
            ownership_details.trim()
        ]);

        const claimId = insertResult.insertId;

        // 4. Record audit log
        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, NULL, 'PENDING', 'CLAIM_SUBMITTED', 'Claimant submitted claim with ownership details')
        `, [claimId, claimantId]);

        // 5. Upload evidence images if any
        if (files.length > 0) {
            try {
                for (const file of files) {
                    const result = await uploadEvidenceToCloudinary(
                        file.buffer,
                        `lost-and-found/claim-evidence/${claimId}`
                    );
                    uploadedAssets.push(result);
                }

                const evidenceRows = uploadedAssets.map(asset => [
                    claimId,
                    asset.secure_url,
                    asset.public_id,
                    asset.resource_type || 'image',
                    file_description_or_name(asset)
                ]);

                await connection.query(`
                    INSERT INTO CLAIM_EVIDENCE (claim_id, image_url, public_id, file_type, description)
                    VALUES ?
                `, [evidenceRows]);
            } catch (uploadError) {
                // Rollback uploaded Cloudinary files
                for (const asset of uploadedAssets) {
                    await deleteFromCloudinary(asset.public_id);
                }
                await connection.rollback();
                return res.status(500).json({ message: 'Failed to upload evidence files. Please try again.' });
            }
        }

        // 6. Transition to FINDER_REVIEW so finder is immediately notified
        await connection.query(`
            UPDATE CLAIMS SET status = 'FINDER_REVIEW' WHERE id = ?
        `, [claimId]);

        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, 'PENDING', 'FINDER_REVIEW', 'AWAITING_FINDER', 'Claim routed to finder for initial review')
        `, [claimId, claimantId]);

        await connection.commit();

        // ── Fire-and-forget: notify claimant + finder + send emails ──────
        pool.query(
            `SELECT
                finder.id as finder_id, finder.email as finder_email, finder.name as finder_name,
                claimant.email as claimant_email, claimant.name as claimant_name,
                f.title as found_title
             FROM FOUND_ITEMS f
             JOIN USERS finder ON f.user_id = finder.id
             JOIN USERS claimant ON claimant.id = ?
             WHERE f.id = ?`,
            [claimantId, found_item_id]
        ).then(([rows]) => {
            if (rows.length === 0) return;
            const { finder_id, finder_email, finder_name, claimant_email, claimant_name, found_title } = rows[0];

            // 1. Notification to claimant (confirmation)
            createNotification(
                claimantId,
                'CLAIM_SUBMITTED',
                'Claim Submitted Successfully',
                `Your claim for "${found_title}" has been submitted and is awaiting finder review.`,
                `/claims/${claimId}`
            );

            // 2. Notification to finder (review requested)
            createNotification(
                finder_id,
                'FINDER_REVIEW_REQUESTED',
                'New Ownership Claim',
                `Someone has submitted a claim for your found item "${found_title}". Please review it.`,
                `/claims/${claimId}`
            );

            // 3. Email to finder (action required)
            sendClaimSubmittedEmail(finder_email, finder_name, found_title, claimId).catch(() => {});

            // 4. Email to claimant (submission confirmation)
            sendClaimConfirmationEmail(claimant_email, claimant_name, found_title, claimId).catch(() => {});
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────

        return res.status(201).json({
            message: 'Claim submitted successfully and routed to finder for review.',
            claimId
        });
    } catch (error) {
        await connection.rollback();
        // Cleanup Cloudinary uploads on error
        for (const asset of uploadedAssets) {
            await deleteFromCloudinary(asset.public_id);
        }
        next(error);
    } finally {
        connection.release();
    }
};

const file_description_or_name = (asset) => {
    return 'Ownership Evidence Document';
};

/**
 * Get all claims submitted by the current authenticated user
 * GET /api/claims/my
 */
export const getMyClaims = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [claims] = await pool.query(`
            SELECT
                c.id, c.found_item_id, c.lost_item_id, c.match_id,
                c.claim_reason, c.status, c.finder_response, c.finder_notes,
                c.additional_info_requested, c.decision_reason,
                c.created_at, c.updated_at,
                f.title as found_title, f.category as found_category,
                f.location as found_location, f.found_date,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            WHERE c.claimant_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        return res.status(200).json(claims);
    } catch (error) {
        next(error);
    }
};

/**
 * Get claims received on items found by current user
 * GET /api/claims/received
 */
export const getReceivedClaims = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [claims] = await pool.query(`
            SELECT
                c.id, c.found_item_id, c.claimant_id,
                c.claim_reason, c.ownership_details, c.status,
                c.finder_response, c.finder_notes, c.finder_responded_at,
                c.additional_info_requested, c.additional_info_provided,
                c.decision_reason, c.created_at, c.updated_at,
                f.title as found_title, f.category as found_category,
                f.location as found_location,
                u.name as claimant_name,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS u ON c.claimant_id = u.id
            WHERE f.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        return res.status(200).json(claims);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single claim details with evidence and audit history
 * GET /api/claims/:id
 */
export const getClaimById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [claims] = await pool.query(`
            SELECT
                c.*,
                f.title as found_title, f.category as found_category,
                f.brand as found_brand, f.model as found_model, f.color as found_color,
                f.description as found_description, f.identifying_details as found_identifying_details,
                f.location as found_location, f.found_date, f.found_time,
                f.created_at as found_created_at, f.user_id as finder_id,
                claimant.name as claimant_name, claimant.email as claimant_email, claimant.phone as claimant_phone,
                finder.name as finder_name, finder.email as finder_email,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS claimant ON c.claimant_id = claimant.id
            JOIN USERS finder ON f.user_id = finder.id
            WHERE c.id = ?
        `, [id]);

        if (claims.length === 0) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        // Access control: Only claimant, finder of the item, or admin
        const isClaimant = claim.claimant_id === userId;
        const isFinder = claim.finder_id === userId;

        if (!isClaimant && !isFinder && !isAdmin) {
            return res.status(403).json({ message: 'You are not authorized to view this claim.' });
        }

        // Fetch original photos uploaded by finder for this found item
        const [foundItemImages] = await pool.query(`
            SELECT id, image_url, public_id, created_at
            FROM ITEM_IMAGES
            WHERE found_item_id = ?
            ORDER BY created_at ASC
        `, [claim.found_item_id]);

        // Fetch evidence attachments
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

        // Security: Remove private admin notes if viewer is not an admin
        if (!isAdmin) {
            delete claim.admin_notes;
        }

        // Privacy: Mask claimant direct contact details from finder before approval
        if (isFinder && claim.status !== 'APPROVED') {
            delete claim.claimant_email;
            delete claim.claimant_phone;
        }

        return res.status(200).json({
            claim: {
                ...claim,
                foundItemImages: foundItemImages || []
            },
            foundItemImages: foundItemImages || [],
            evidence,
            auditLogs,
            userRole: isAdmin ? 'ADMIN' : (isClaimant ? 'CLAIMANT' : 'FINDER')
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Claimant withdraws an active claim
 * POST /api/claims/:id/withdraw
 */
export const withdrawClaim = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;
        const { reason } = req.body;

        const [claims] = await connection.query(
            'SELECT id, claimant_id, status FROM CLAIMS WHERE id = ? FOR UPDATE',
            [id]
        );

        if (claims.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        if (claim.claimant_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Only the claimant can withdraw this claim.' });
        }

        // Can only withdraw if in PENDING or FINDER_REVIEW
        if (claim.status !== 'PENDING' && claim.status !== 'FINDER_REVIEW') {
            await connection.rollback();
            return res.status(400).json({
                message: `Cannot withdraw a claim that is in '${claim.status}' state.`
            });
        }

        await connection.query(`
            UPDATE CLAIMS
            SET status = 'WITHDRAWN', updated_at = NOW()
            WHERE id = ?
        `, [id]);

        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, ?, 'WITHDRAWN', 'CLAIM_WITHDRAWN', ?)
        `, [id, userId, claim.status, reason ? `Withdrawn by claimant: ${reason}` : 'Withdrawn by claimant']);

        await connection.commit();

        // ── Fire-and-forget: notify finder that claim was withdrawn ───────
        pool.query(
            `SELECT f.user_id as finder_id
             FROM CLAIMS c JOIN FOUND_ITEMS f ON c.found_item_id = f.id
             WHERE c.id = ?`,
            [id]
        ).then(([rows]) => {
            if (rows.length === 0) return;
            createNotification(
                rows[0].finder_id,
                'CLAIM_WITHDRAWN',
                'A Claim Has Been Withdrawn',
                'The claimant has withdrawn their claim for your found item.',
                `/claims/${id}`
            );
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────

        return res.status(200).json({ message: 'Claim successfully withdrawn.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Finder submits structured feedback on a claim
 * POST /api/claims/:id/finder-response
 */
export const submitFinderResponse = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;
        const { response, notes } = req.body;

        const validResponses = ['RECOGNIZED', 'NEEDS_INFO', 'NOT_RECOGNIZED'];
        if (!validResponses.includes(response)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Invalid finder response value.' });
        }

        const [claims] = await connection.query(`
            SELECT c.id, c.status, f.user_id as finder_id
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            WHERE c.id = ? FOR UPDATE
        `, [id]);

        if (claims.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        if (claim.finder_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Only the finder who reported this item can submit feedback.' });
        }

        if (claim.status !== 'PENDING' && claim.status !== 'FINDER_REVIEW') {
            await connection.rollback();
            return res.status(400).json({
                message: `Cannot review claim currently in '${claim.status}' state.`
            });
        }

        // Determine next status:
        // If NEEDS_INFO -> stays in FINDER_REVIEW with flag additional_info_requested = true
        // If RECOGNIZED or NOT_RECOGNIZED -> moves to ADMIN_REVIEW
        let nextStatus = 'ADMIN_REVIEW';
        let additionalInfoRequested = false;

        if (response === 'NEEDS_INFO') {
            nextStatus = 'FINDER_REVIEW';
            additionalInfoRequested = true;
        }

        await connection.query(`
            UPDATE CLAIMS
            SET finder_response = ?,
                finder_notes = ?,
                finder_responded_at = NOW(),
                status = ?,
                additional_info_requested = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [response, notes ? notes.trim() : null, nextStatus, additionalInfoRequested, id]);

        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, ?, ?, 'FINDER_RESPONSE_RECORDED', ?)
        `, [
            id,
            userId,
            claim.status,
            nextStatus,
            `Finder responded: ${response}. Notes: ${notes || 'None'}`
        ]);

        await connection.commit();

        // ── Fire-and-forget: notify claimant on finder response ─────────
        pool.query(
            `SELECT c.claimant_id, f.title as found_title
             FROM CLAIMS c JOIN FOUND_ITEMS f ON c.found_item_id = f.id
             WHERE c.id = ?`,
            [id]
        ).then(([rows]) => {
            if (rows.length === 0) return;
            const claimantId = rows[0].claimant_id;
            const itemTitle = rows[0].found_title || 'Item';

            if (nextStatus === 'ADMIN_REVIEW') {
                createNotification(
                    claimantId,
                    'FINDER_REVIEW_REQUESTED',
                    'Finder Has Reviewed Your Claim',
                    `The finder reviewed your claim for "${itemTitle}". It is now under admin review.`,
                    `/claims/${id}`
                );
            } else if (response === 'NEEDS_INFO') {
                createNotification(
                    claimantId,
                    'ADDITIONAL_INFO_REQUESTED',
                    'Clarification Needed on Your Claim',
                    `The finder requested additional proof or details for "${itemTitle}".`,
                    `/claims/${id}`
                );
            }
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────

        return res.status(200).json({
            message: response === 'NEEDS_INFO'
                ? 'Requested additional information from claimant.'
                : 'Feedback recorded and claim forwarded to Administrator review.',
            nextStatus
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Claimant provides additional clarification requested by finder
 * POST /api/claims/:id/additional-info
 */
export const provideAdditionalInfo = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;
        const { additionalInfo } = req.body;

        if (!additionalInfo || additionalInfo.trim().length < 10) {
            await connection.rollback();
            return res.status(400).json({ message: 'Please provide meaningful additional details (at least 10 characters).' });
        }

        const [claims] = await connection.query(
            'SELECT id, claimant_id, status, additional_info_requested FROM CLAIMS WHERE id = ? FOR UPDATE',
            [id]
        );

        if (claims.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claims[0];

        if (claim.claimant_id !== userId) {
            await connection.rollback();
            return res.status(403).json({ message: 'Only the claimant can provide additional information.' });
        }

        await connection.query(`
            UPDATE CLAIMS
            SET additional_info_provided = ?,
                additional_info_requested = FALSE,
                status = 'ADMIN_REVIEW',
                updated_at = NOW()
            WHERE id = ?
        `, [additionalInfo.trim(), id]);

        await connection.query(`
            INSERT INTO CLAIM_AUDIT_LOGS (claim_id, performed_by, from_status, to_status, action, notes)
            VALUES (?, ?, 'FINDER_REVIEW', 'ADMIN_REVIEW', 'ADDITIONAL_INFO_SUBMITTED', 'Claimant provided clarification. Routed to Admin Review.')
        `, [id, userId]);

        await connection.commit();

        // ── Fire-and-forget: notify finder that additional info was provided ──
        pool.query(
            `SELECT f.user_id as finder_id, f.title as found_title
             FROM CLAIMS c JOIN FOUND_ITEMS f ON c.found_item_id = f.id
             WHERE c.id = ?`,
            [id]
        ).then(([rows]) => {
            if (rows.length === 0) return;
            const finderId = rows[0].finder_id;
            const itemTitle = rows[0].found_title || 'Item';
            createNotification(
                finderId,
                'ADDITIONAL_INFO_REQUESTED',
                'Clarification Provided by Claimant',
                `The claimant provided additional information for "${itemTitle}". It has moved to Admin review.`,
                `/claims/${id}`
            );
        }).catch(() => {});
        // ─────────────────────────────────────────────────────────────────

        return res.status(200).json({
            message: 'Additional information submitted. Claim has been forwarded for Administrator review.'
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
