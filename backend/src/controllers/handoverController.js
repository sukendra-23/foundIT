import pool from '../config/db.js';
import { createNotification } from '../utils/notificationHelper.js';
import {
    sendHandoverEmail,
    sendConsolidatedHandoverPublishedEmail,
    sendReturnCompletionEmails
} from '../services/emailService.js';
import { uploadEvidenceToCloudinary } from '../utils/cloudinaryHelper.js';

// Helper to check ownership & roles for a handover
const getHandoverAndVerifyAccess = async (handoverId, userId, userRole) => {
    const [rows] = await pool.query(
        `SELECT h.*, 
                r.item_name AS recovery_item_name, r.status AS recovery_status, r.found_location,
                li.id AS lost_item_id, li.title AS lost_item_title, li.user_id AS lost_item_owner_id,
                f.name AS finder_name, f.email AS finder_email, f.phone AS finder_phone, f.avatar_url AS finder_avatar,
                o.name AS owner_name, o.email AS owner_email, o.phone AS owner_phone, o.avatar_url AS owner_avatar
         FROM RECOVERY_HANDOVERS h
         JOIN RECOVERY_SUBMISSIONS r ON h.recovery_id = r.id
         JOIN LOST_ITEMS li ON r.lost_item_id = li.id
         JOIN USERS f ON h.finder_id = f.id
         JOIN USERS o ON h.owner_id = o.id
         WHERE h.id = ?`,
        [handoverId]
    );

    if (rows.length === 0) return null;
    const handover = rows[0];

    const isFinder = handover.finder_id === userId;
    const isOwner = handover.owner_id === userId || handover.lost_item_owner_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isFinder && !isOwner && !isAdmin) {
        const err = new Error('Access denied. You are not a party to this handover.');
        err.status = 403;
        throw err;
    }

    return { handover, isFinder, isOwner, isAdmin };
};

// Helper for writing audit logs
const logHandoverAction = async (connectionOrPool, handoverId, userId, action, description = null) => {
    try {
        await connectionOrPool.query(
            `INSERT INTO HANDOVER_AUDIT_LOGS (handover_id, performed_by, action, description)
             VALUES (?, ?, ?, ?)`,
            [handoverId, userId, action, description]
        );
    } catch (e) {
        console.error('Failed to write handover audit log:', e.message);
    }
};

/**
 * 1. Initiate Handover (Finder Only)
 * POST /api/recoveries/:recoveryId/handover
 */
export const initiateHandover = async (req, res) => {
    try {
        const { recoveryId } = req.params;
        const { handover_method = 'IN_PERSON', meeting_instructions, contact_sharing_consent = false } = req.body;
        const userId = req.user.id;

        // 1. Verify recovery exists and is APPROVED
        const [recRows] = await pool.query(
            `SELECT r.*, li.user_id AS owner_id, li.title AS lost_item_title,
                    u.name AS owner_name, u.email AS owner_email
             FROM RECOVERY_SUBMISSIONS r
             JOIN LOST_ITEMS li ON r.lost_item_id = li.id
             JOIN USERS u ON li.user_id = u.id
             WHERE r.id = ?`,
            [recoveryId]
        );

        if (recRows.length === 0) {
            return res.status(404).json({ message: 'Recovery submission not found.' });
        }

        const recovery = recRows[0];

        if (recovery.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Handover can only be initiated for APPROVED recoveries.' });
        }

        if (recovery.finder_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the approved finder can initiate handover coordination.' });
        }

        // 2. Check if handover already exists
        const [existing] = await pool.query(
            `SELECT id, handover_status FROM RECOVERY_HANDOVERS WHERE recovery_id = ?`,
            [recoveryId]
        );

        if (existing.length > 0) {
            return res.status(200).json({
                message: 'Handover already initiated.',
                handoverId: existing[0].id,
                status: existing[0].handover_status
            });
        }

        // 3. Insert handover
        const [result] = await pool.query(
            `INSERT INTO RECOVERY_HANDOVERS 
             (recovery_id, finder_id, owner_id, handover_method, handover_status, meeting_instructions, contact_sharing_consent, initiated_at)
             VALUES (?, ?, ?, ?, 'INITIATED', ?, ?, NOW())`,
            [recoveryId, recovery.finder_id, recovery.owner_id, handover_method, meeting_instructions || null, contact_sharing_consent ? 1 : 0]
        );

        const handoverId = result.insertId;

        // 4. Audit log
        await logHandoverAction(pool, handoverId, userId, 'HANDOVER_INITIATED', `Finder initiated handover process via ${handover_method}`);

        // 5. Notify owner
        await createNotification(
            recovery.owner_id,
            'HANDOVER_INITIATED',
            '🤝 Handover Coordination Initiated',
            `The finder has initiated handover for "${recovery.lost_item_title || recovery.item_name}". Check location details.`,
            `/handovers/${handoverId}`
        );

        sendHandoverEmail({
            toEmail: recovery.owner_email,
            toName: recovery.owner_name,
            subject: `🤝 Handover Initiated: ${recovery.lost_item_title || recovery.item_name}`,
            title: 'Finder Has Started Handover Coordination',
            message: `Great news! The finder of your recovered item has initiated the handover process. They will share meeting details or live location shortly.`,
            itemTitle: recovery.lost_item_title || recovery.item_name,
            handoverId,
        }).catch(err => console.error('Email error:', err.message));

        return res.status(201).json({
            message: 'Handover initiated successfully.',
            handoverId,
            status: 'INITIATED'
        });
    } catch (error) {
        console.error('Error initiating handover:', error);
        return res.status(500).json({ message: 'Failed to initiate handover.' });
    }
};

/**
 * 2. Get Handover by Recovery ID
 * GET /api/recoveries/:recoveryId/handover
 */
export const getHandoverByRecoveryId = async (req, res) => {
    try {
        const { recoveryId } = req.params;
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT id FROM RECOVERY_HANDOVERS WHERE recovery_id = ?`,
            [recoveryId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No handover found for this recovery.' });
        }

        // Delegate to full getter
        req.params.id = rows[0].id;
        return getHandoverById(req, res);
    } catch (error) {
        console.error('Error fetching handover by recovery ID:', error);
        return res.status(500).json({ message: 'Failed to load handover details.' });
    }
};

/**
 * 3. Get Full Handover Details by Handover ID
 * GET /api/handovers/:id
 */
export const getHandoverById = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, userRole);
        if (!access) {
            return res.status(404).json({ message: 'Handover not found.' });
        }

        const { handover, isFinder, isOwner, isAdmin } = access;

        // Privacy filter: if finder has NOT consented to share contact, mask finder's phone/email for the owner
        const sanitizedHandover = { ...handover };
        if (isOwner && !handover.contact_sharing_consent && !isAdmin) {
            sanitizedHandover.finder_phone = null;
        }

        // Fetch active GPS session if any
        const [sessions] = await pool.query(
            `SELECT * FROM HANDOVER_LOCATION_SESSIONS 
             WHERE handover_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [handoverId]
        );

        let activeSession = null;
        if (sessions.length > 0) {
            const sess = sessions[0];
            const isExpired = new Date(sess.expires_at) < new Date();
            if (isExpired && sess.session_status === 'ACTIVE') {
                await pool.query(
                    `UPDATE HANDOVER_LOCATION_SESSIONS SET session_status = 'EXPIRED' WHERE id = ?`,
                    [sess.id]
                );
                sess.session_status = 'EXPIRED';
            }
            activeSession = sess;
        }

        // Fetch audit logs
        const [auditLogs] = await pool.query(
            `SELECT l.*, u.name AS user_name, u.role AS user_role
             FROM HANDOVER_AUDIT_LOGS l
             JOIN USERS u ON l.performed_by = u.id
             WHERE l.handover_id = ?
             ORDER BY l.created_at ASC`,
            [handoverId]
        );

        // Fetch issues
        const [issues] = await pool.query(
            `SELECT i.*, u.name AS reporter_name
             FROM HANDOVER_ISSUES i
             JOIN USERS u ON i.reported_by = u.id
             WHERE i.handover_id = ?
             ORDER BY i.created_at DESC`,
            [handoverId]
        );

        return res.status(200).json({
            handover: sanitizedHandover,
            activeSession,
            auditLogs,
            issues,
            role: { isFinder, isOwner, isAdmin }
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error fetching handover:', error);
        return res.status(500).json({ message: 'Failed to retrieve handover details.' });
    }
};

/**
 * 4. Update Handover Location Details (Finder Only)
 * PATCH /api/handovers/:id/location
 */
export const updateHandoverLocation = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the finder can update location details.' });
        }

        const {
            location_type = 'MANUAL',
            location_title,
            address,
            locality,
            city,
            state,
            postal_code,
            landmark,
            additional_directions,
            meeting_instructions,
            latitude,
            longitude,
            contact_sharing_consent
        } = req.body;

        let consentSql = '';
        const params = [
            location_type,
            location_title || null,
            address || null,
            locality || null,
            city || null,
            state || null,
            postal_code || null,
            landmark || null,
            additional_directions || null,
            meeting_instructions || null,
            latitude || null,
            longitude || null
        ];

        if (contact_sharing_consent !== undefined) {
            consentSql = ', contact_sharing_consent = ?';
            params.push(contact_sharing_consent ? 1 : 0);
        }

        params.push(handoverId);

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS SET
                location_type = ?,
                location_title = ?,
                address = ?,
                locality = ?,
                city = ?,
                state = ?,
                postal_code = ?,
                landmark = ?,
                additional_directions = ?,
                meeting_instructions = ?,
                latitude = ?,
                longitude = ?
                ${consentSql}
             WHERE id = ?`,
            params
        );

        await logHandoverAction(pool, handoverId, userId, 'LOCATION_UPDATED', `Location details updated (${location_type})`);

        return res.status(200).json({ message: 'Location details saved successfully.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error updating handover location:', error);
        return res.status(500).json({ message: 'Failed to update location details.' });
    }
};

/**
 * 5. Publish Handover Location / Details to Owner (Finder Only)
 * POST /api/handovers/:id/publish
 */
export const publishHandover = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the finder can publish handover details.' });
        }

        const { handover } = access;

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS 
             SET handover_status = 'LOCATION_PUBLISHED',
                 published_at = NOW()
             WHERE id = ?`,
            [handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'LOCATION_PUBLISHED', 'Finder published handover details to the owner.');

        // Notify owner
        await createNotification(
            handover.owner_id,
            'HANDOVER_LOCATION_PUBLISHED',
            '📍 Handover Details Published',
            `The finder has published meeting location / instructions for "${handover.lost_item_title || handover.recovery_item_name}".`,
            `/handovers/${handoverId}`
        );

        sendHandoverEmail({
            toEmail: handover.owner_email,
            toName: handover.owner_name,
            subject: `📍 Handover Location Available: ${handover.lost_item_title || handover.recovery_item_name}`,
            title: 'Handover Location Ready',
            message: `The finder has published the collection address or live location for your recovered item. View the details and map to coordinate meeting up.`,
            itemTitle: handover.lost_item_title || handover.recovery_item_name,
            handoverId,
        }).catch(err => console.error('Email error:', err.message));

        return res.status(200).json({ message: 'Handover published successfully to the owner!' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error publishing handover:', error);
        return res.status(500).json({ message: 'Failed to publish handover.' });
    }
};

/**
 * 5b. One-Click Consolidated Publish Handover Details (Finder Only)
 * POST /api/handovers/:id/publish-all
 * Atomically saves location, schedule, contact consent, logs audit, and sends ONE notification + ONE email.
 */
export const publishAllHandoverDetails = async (req, res) => {
    let connection;
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the finder can publish handover details.' });
        }

        const { handover } = access;

        const {
            location_type = 'MANUAL',
            location_title,
            address,
            locality,
            city,
            state,
            postal_code,
            landmark,
            additional_directions,
            meeting_instructions,
            latitude,
            longitude,
            schedule_date,
            schedule_time,
            contact_sharing_consent = false
        } = req.body;

        // Validation: Must have either manual address or valid GPS coordinates
        if (location_type === 'MANUAL' && !address?.trim() && !landmark?.trim()) {
            return res.status(400).json({ message: 'Please provide a valid street address or landmark.' });
        }
        if (location_type === 'GPS' && (!latitude || !longitude)) {
            return res.status(400).json({ message: 'Valid GPS coordinates are required for live location sharing.' });
        }

        // Sanitize and normalize date & time formats for MySQL
        let cleanDate = null;
        if (schedule_date && typeof schedule_date === 'string' && schedule_date.trim()) {
            const str = schedule_date.trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
                cleanDate = str.slice(0, 10);
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const parts = str.split('-');
                cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const parts = str.split('/');
                cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        let cleanTime = null;
        if (schedule_time && typeof schedule_time === 'string' && schedule_time.trim()) {
            const str = schedule_time.trim();
            if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
                cleanTime = str;
            } else if (/^\d{2}:\d{2}$/.test(str)) {
                cleanTime = `${str}:00`;
            }
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Atomic Update of all handover details
        await connection.query(
            `UPDATE RECOVERY_HANDOVERS SET
                location_type = ?,
                location_title = ?,
                address = ?,
                locality = ?,
                city = ?,
                state = ?,
                postal_code = ?,
                landmark = ?,
                additional_directions = ?,
                meeting_instructions = ?,
                latitude = ?,
                longitude = ?,
                schedule_date = ?,
                schedule_time = ?,
                contact_sharing_consent = ?,
                handover_status = 'LOCATION_PUBLISHED',
                published_at = NOW(),
                scheduled_at = CASE WHEN ? IS NOT NULL THEN NOW() ELSE scheduled_at END
             WHERE id = ?`,
            [
                location_type,
                location_title || null,
                address || null,
                locality || null,
                city || null,
                state || null,
                postal_code || null,
                landmark || null,
                additional_directions || null,
                meeting_instructions || null,
                latitude || null,
                longitude || null,
                cleanDate,
                cleanTime,
                contact_sharing_consent ? 1 : 0,
                cleanDate,
                handoverId
            ]
        );

        // 2. Audit Trail
        const summaryDesc = location_type === 'GPS'
            ? `Live GPS coordinates (${latitude}, ${longitude}) published. Schedule: ${cleanDate || 'TBD'} ${cleanTime || ''}`
            : `Meeting location (${location_title || address || 'Manual address'}) published. Schedule: ${cleanDate || 'TBD'} ${cleanTime || ''}`;

        await logHandoverAction(connection, handoverId, userId, 'HANDOVER_DETAILS_PUBLISHED', summaryDesc);

        await connection.commit();

        // 3. ONE Consolidated In-App Notification to Owner
        const itemTitle = handover.lost_item_title || handover.recovery_item_name;
        await createNotification(
            handover.owner_id,
            'HANDOVER_LOCATION_PUBLISHED',
            'Item Handover Details Published',
            `The finder has published the handover location, proposed collection schedule and available contact details for your recovered item. Open the handover page to review and confirm the arrangements.`,
            `/handovers/${handoverId}`
        );

        // 4. ONE Consolidated Email to Owner
        const locationSummaryText = location_type === 'GPS'
            ? 'Real-Time Live Device GPS Coordinates'
            : [location_title, address, city].filter(Boolean).join(' - ');

        sendConsolidatedHandoverPublishedEmail({
            toEmail: handover.owner_email,
            toName: handover.owner_name,
            itemTitle,
            recoveryId: handover.recovery_id,
            handoverId,
            finderName: handover.finder_name,
            scheduleDate: cleanDate,
            scheduleTime: cleanTime,
            locationSummary: locationSummaryText,
            hasContactShared: Boolean(contact_sharing_consent),
        }).catch(err => console.error('Consolidated email error:', err.message));

        return res.status(200).json({
            message: 'Handover details published successfully to the owner.',
            handoverId,
            publishedAt: new Date()
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_e) {}
        }
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error in publishAllHandoverDetails:', error);
        return res.status(500).json({ message: error.sqlMessage || error.message || 'Failed to publish handover details.' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * 5c. Owner Verifies Handover Arrangements
 * POST /api/handovers/:id/verify-arrangements
 */
export const verifyArrangements = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { notes } = req.body;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isOwner && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the item owner can verify the handover arrangements.' });
        }

        const { handover } = access;

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS 
             SET owner_verified_at = NOW(),
                 owner_verification_notes = ?,
                 handover_status = CASE WHEN handover_status = 'LOCATION_PUBLISHED' THEN 'VERIFIED' ELSE handover_status END
             WHERE id = ?`,
            [notes || null, handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'OWNER_VERIFIED_ARRANGEMENTS', notes ? `Owner accepted arrangements: ${notes}` : 'Owner reviewed and accepted the published handover arrangements.');

        // Notify Finder
        await createNotification(
            handover.finder_id,
            'OWNER_VERIFIED_ARRANGEMENTS',
            '✅ Handover Arrangements Verified',
            `The owner has verified and accepted your proposed handover arrangements for "${handover.lost_item_title || handover.recovery_item_name}".`,
            `/handovers/${handoverId}`
        );

        return res.status(200).json({
            message: 'Handover arrangements verified successfully.',
            verifiedAt: new Date()
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error in verifyArrangements:', error);
        return res.status(500).json({ message: 'Failed to verify handover arrangements.' });
    }
};

/**
 * 6. Start Live GPS Location Session (Finder Only)
 * POST /api/handovers/:id/location/start
 */
export const startLocationSession = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { latitude, longitude, accuracy } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Valid GPS latitude and longitude are required.' });
        }

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the finder can start live location sharing.' });
        }

        // Stop any currently active sessions for this handover
        await pool.query(
            `UPDATE HANDOVER_LOCATION_SESSIONS 
             SET session_status = 'STOPPED', stopped_at = NOW() 
             WHERE handover_id = ? AND session_status = 'ACTIVE'`,
            [handoverId]
        );

        // Start new session expiring in 30 minutes
        const [result] = await pool.query(
            `INSERT INTO HANDOVER_LOCATION_SESSIONS 
             (handover_id, latitude, longitude, accuracy, session_status, started_at, expires_at, last_updated_at)
             VALUES (?, ?, ?, ?, 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), NOW())`,
            [handoverId, latitude, longitude, accuracy || null]
        );

        // Also update handover's current coords, set location_type = 'GPS', and publish if still INITIATED
        await pool.query(
            `UPDATE RECOVERY_HANDOVERS 
             SET latitude = ?, longitude = ?, location_type = 'GPS',
                 handover_status = CASE WHEN handover_status = 'INITIATED' THEN 'LOCATION_PUBLISHED' ELSE handover_status END,
                 published_at = COALESCE(published_at, NOW())
             WHERE id = ?`,
            [latitude, longitude, handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'GPS_SESSION_STARTED', `Finder started live GPS location sharing (lat: ${latitude}, lng: ${longitude}). Valid for 30 min.`);

        // Notify owner immediately
        await createNotification(
            access.handover.owner_id,
            'HANDOVER_LOCATION_LIVE',
            '📡 Live Location Sharing Started',
            `The finder has activated live GPS location sharing for "${access.handover.lost_item_title || access.handover.recovery_item_name}". Check the map in Handover Details.`,
            `/handovers/${handoverId}`
        );

        sendHandoverEmail({
            toEmail: access.handover.owner_email,
            toName: access.handover.owner_name,
            subject: `📡 Live Location Shared: ${access.handover.lost_item_title || access.handover.recovery_item_name}`,
            title: 'Finder Is Sharing Real-Time Live Location',
            message: `The finder has started real-time GPS location sharing so you can meet and collect your item. View the live map now!`,
            itemTitle: access.handover.lost_item_title || access.handover.recovery_item_name,
            handoverId,
        }).catch(err => console.error('Email error:', err.message));

        return res.status(201).json({
            message: 'Live location session started and sent to owner.',
            sessionId: result.insertId,
            latitude,
            longitude,
            expiresInMinutes: 30
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error starting location session:', error);
        return res.status(500).json({ message: 'Failed to start location session.' });
    }
};

/**
 * 7. Update Live GPS Location Session (Finder Only)
 * POST /api/handovers/:id/location/update
 */
export const updateLocationSession = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { latitude, longitude, accuracy } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Valid GPS latitude and longitude are required.' });
        }

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only the finder can broadcast location updates.' });
        }

        // Find active session
        const [sessions] = await pool.query(
            `SELECT * FROM HANDOVER_LOCATION_SESSIONS 
             WHERE handover_id = ? AND session_status = 'ACTIVE'
             ORDER BY created_at DESC LIMIT 1`,
            [handoverId]
        );

        if (sessions.length === 0) {
            return res.status(400).json({ message: 'No active location session. Please start a session first.' });
        }

        const sess = sessions[0];
        const isExpired = new Date(sess.expires_at) < new Date();

        if (isExpired) {
            await pool.query(
                `UPDATE HANDOVER_LOCATION_SESSIONS SET session_status = 'EXPIRED' WHERE id = ?`,
                [sess.id]
            );
            return res.status(410).json({ message: 'Location session has expired (30 minute limit reached).' });
        }

        // Update session coordinates
        await pool.query(
            `UPDATE HANDOVER_LOCATION_SESSIONS 
             SET latitude = ?, longitude = ?, accuracy = ?, last_updated_at = NOW()
             WHERE id = ?`,
            [latitude, longitude, accuracy || null, sess.id]
        );

        // Sync with handover record
        await pool.query(
            `UPDATE RECOVERY_HANDOVERS SET latitude = ?, longitude = ? WHERE id = ?`,
            [latitude, longitude, handoverId]
        );

        return res.status(200).json({
            message: 'Location updated.',
            lastUpdatedAt: new Date()
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error updating location session:', error);
        return res.status(500).json({ message: 'Failed to update location session.' });
    }
};

/**
 * 8. Stop Live GPS Location Session (Finder Only)
 * POST /api/handovers/:id/location/stop
 */
export const stopLocationSession = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only finder can stop location session.' });
        }

        await pool.query(
            `UPDATE HANDOVER_LOCATION_SESSIONS 
             SET session_status = 'STOPPED', stopped_at = NOW()
             WHERE handover_id = ? AND session_status = 'ACTIVE'`,
            [handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'GPS_SESSION_STOPPED', 'Finder ended live GPS location sharing.');

        return res.status(200).json({ message: 'Live location sharing stopped.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error stopping location session:', error);
        return res.status(500).json({ message: 'Failed to stop location session.' });
    }
};

/**
 * 9. Get Current Live Location (Polled by Owner or Finder)
 * GET /api/handovers/:id/location/current
 */
export const getCurrentLocation = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        const [sessions] = await pool.query(
            `SELECT * FROM HANDOVER_LOCATION_SESSIONS 
             WHERE handover_id = ?
             ORDER BY created_at DESC LIMIT 1`,
            [handoverId]
        );

        if (sessions.length === 0) {
            return res.status(200).json({
                hasActiveSession: false,
                latitude: access.handover.latitude,
                longitude: access.handover.longitude,
                sessionStatus: 'NONE'
            });
        }

        const sess = sessions[0];
        const isExpired = new Date(sess.expires_at) < new Date();

        if (isExpired && sess.session_status === 'ACTIVE') {
            await pool.query(
                `UPDATE HANDOVER_LOCATION_SESSIONS SET session_status = 'EXPIRED' WHERE id = ?`,
                [sess.id]
            );
            sess.session_status = 'EXPIRED';
        }

        const remainingMs = Math.max(0, new Date(sess.expires_at).getTime() - Date.now());

        return res.status(200).json({
            hasActiveSession: sess.session_status === 'ACTIVE',
            sessionStatus: sess.session_status,
            latitude: sess.latitude,
            longitude: sess.longitude,
            accuracy: sess.accuracy,
            lastUpdatedAt: sess.last_updated_at,
            remainingMinutes: Math.round(remainingMs / 60000)
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error getting current location:', error);
        return res.status(500).json({ message: 'Failed to get current location.' });
    }
};

/**
 * 10. Schedule Handover (Finder Only)
 * POST /api/handovers/:id/schedule
 */
export const scheduleHandover = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { schedule_date, schedule_time } = req.body;

        if (!schedule_date || !schedule_time) {
            return res.status(400).json({ message: 'Both date and time are required to schedule handover.' });
        }

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only finder can propose schedule.' });
        }

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS 
             SET schedule_date = ?, schedule_time = ?, handover_status = 'SCHEDULED', scheduled_at = NOW()
             WHERE id = ?`,
            [schedule_date, schedule_time, handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'HANDOVER_SCHEDULED', `Meeting scheduled for ${schedule_date} at ${schedule_time}`);

        // Notify owner
        await createNotification(
            access.handover.owner_id,
            'HANDOVER_SCHEDULED',
            '📅 Handover Scheduled',
            `Meeting scheduled for "${access.handover.lost_item_title || access.handover.recovery_item_name}" on ${schedule_date} at ${schedule_time}.`,
            `/handovers/${handoverId}`
        );

        return res.status(200).json({ message: 'Meeting scheduled successfully.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error scheduling handover:', error);
        return res.status(500).json({ message: 'Failed to schedule handover.' });
    }
};

/**
 * 11. Update Contact Consent (Finder Only)
 * PATCH /api/handovers/:id/contact-consent
 */
export const updateContactConsent = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { consent } = req.body;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        if (!access.isFinder && !access.isAdmin) {
            return res.status(403).json({ message: 'Only finder can modify contact consent.' });
        }

        const consentValue = consent === true || consent === 1 || consent === '1' || consent === 'true';

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS SET contact_sharing_consent = ? WHERE id = ?`,
            [consentValue ? 1 : 0, handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'CONTACT_CONSENT_UPDATED', `Contact sharing consent set to ${consentValue}`);

        return res.status(200).json({
            message: `Phone number sharing ${consentValue ? 'enabled' : 'disabled'}.`,
            contact_sharing_consent: consentValue
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error updating contact consent:', error);
        return res.status(500).json({ message: 'Failed to update contact preferences.' });
    }
};

/**
 * 12. Confirm Return / Receipt of Item (CRITICAL: Owner Only)
 * POST /api/handovers/:id/confirm-received
 */
export const confirmReceipt = async (req, res) => {
    let connection;
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { feedback, confirmation_note, evidence_url } = req.body;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        const { handover, isOwner, isAdmin } = access;

        // Strictly verify that the caller is the item owner
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Security restriction: Only the original item owner can confirm receipt.' });
        }

        if (handover.handover_status === 'COMPLETED') {
            return res.status(400).json({ message: 'This handover has already been marked completed.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Mark Handover as COMPLETED and save notes & evidence
        await connection.query(
            `UPDATE RECOVERY_HANDOVERS 
             SET handover_status = 'COMPLETED',
                 completed_at = NOW(),
                 confirmed_by = ?,
                 finder_feedback = ?,
                 owner_confirmation_note = ?,
                 owner_evidence_url = ?
             WHERE id = ?`,
            [userId, feedback || null, confirmation_note || null, evidence_url || null, handoverId]
        );

        // 2. Stop any active GPS sessions
        await connection.query(
            `UPDATE HANDOVER_LOCATION_SESSIONS 
             SET session_status = 'STOPPED', stopped_at = NOW()
             WHERE handover_id = ? AND session_status = 'ACTIVE'`,
            [handoverId]
        );

        // 3. Mark lost item as recovered/returned
        try {
            await connection.query(
                `UPDATE LOST_ITEMS SET status = 'RETURNED' WHERE id = ?`,
                [handover.lost_item_id]
            );
        } catch (itemErr) {
            console.log('Note: LOST_ITEMS status update skipped:', itemErr.message);
        }

        // 4. Audit Log
        const auditDesc = confirmation_note
            ? `Owner confirmed physical receipt of the item. Note: "${confirmation_note}". Handover complete.`
            : 'Owner confirmed physical receipt of the item. Handover complete.';
        await logHandoverAction(connection, handoverId, userId, 'ITEM_RECEIVED_CONFIRMED', auditDesc);

        await connection.commit();

        // 5. Notify Finder
        const itemTitle = handover.lost_item_title || handover.recovery_item_name;
        await createNotification(
            handover.finder_id,
            'HANDOVER_COMPLETED',
            '🎉 Item Handover Completed!',
            `The owner has confirmed receiving "${itemTitle}". Thank you for your honesty! Please share your feedback on the experience.`,
            `/handovers/${handoverId}`
        );

        // 6. Notify Admins
        const [admins] = await pool.query(`SELECT id, email FROM USERS WHERE role = 'admin'`);
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'HANDOVER_COMPLETED_ADMIN',
                '✅ Item Return Confirmed',
                `Recovery #${handover.recovery_id} physical return has been confirmed by the owner.`,
                `/admin/claims`
            );
        }

        // 7. Send TWO confirmation completion emails (one to owner, one to finder)
        sendReturnCompletionEmails({
            ownerEmail: handover.owner_email,
            ownerName: handover.owner_name,
            finderEmail: handover.finder_email,
            finderName: handover.finder_name,
            itemTitle,
            recoveryId: handover.recovery_id,
            handoverId,
            completedAt: new Date(),
        }).catch(err => console.error('Error sending return completion emails:', err.message));

        return res.status(200).json({
            message: 'Item receipt confirmed! The handover is now completed.',
            status: 'COMPLETED',
            completedAt: new Date()
        });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error confirming receipt:', error);
        return res.status(500).json({ message: 'Failed to confirm item receipt.' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * 13. Report Handover Issue
 * POST /api/handovers/:id/report-issue
 */
export const reportIssue = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { issue_type, description, evidence_url } = req.body;

        if (!issue_type || !description) {
            return res.status(400).json({ message: 'Issue type and description are required.' });
        }

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        const [result] = await pool.query(
            `INSERT INTO HANDOVER_ISSUES 
             (handover_id, reported_by, issue_type, description, evidence_url, status)
             VALUES (?, ?, ?, ?, ?, 'PENDING')`,
            [handoverId, userId, issue_type, description, evidence_url || null]
        );

        await pool.query(
            `UPDATE RECOVERY_HANDOVERS SET handover_status = 'ISSUE_REPORTED' WHERE id = ?`,
            [handoverId]
        );

        await logHandoverAction(pool, handoverId, userId, 'ISSUE_REPORTED', `Issue reported: ${issue_type} - ${description}`);

        // Notify admins
        const [admins] = await pool.query(`SELECT id FROM USERS WHERE role = 'admin'`);
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'HANDOVER_ISSUE_ADMIN',
                '⚠️ Handover Issue Reported',
                `A handover issue (${issue_type}) was reported for Recovery #${access.handover.recovery_id}.`,
                `/admin/claims`
            );
        }

        return res.status(201).json({
            message: 'Issue reported to administrators.',
            issueId: result.insertId
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error reporting issue:', error);
        return res.status(500).json({ message: 'Failed to report issue.' });
    }
};

/**
 * 14. Admin: Get all handovers with filters & statistics
 * GET /api/admin/handovers
 */
export const getAdminHandovers = async (req, res) => {
    try {
        const { status, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT h.*,
                   r.item_name AS recovery_item_name, r.status AS recovery_status,
                   li.title AS lost_item_title,
                   f.name AS finder_name, f.email AS finder_email,
                   o.name AS owner_name, o.email AS owner_email,
                   (SELECT COUNT(*) FROM HANDOVER_ISSUES WHERE handover_id = h.id) AS issue_count
            FROM RECOVERY_HANDOVERS h
            JOIN RECOVERY_SUBMISSIONS r ON h.recovery_id = r.id
            JOIN LOST_ITEMS li ON r.lost_item_id = li.id
            JOIN USERS f ON h.finder_id = f.id
            JOIN USERS o ON h.owner_id = o.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'ALL') {
            query += ` AND h.handover_status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (r.item_name LIKE ? OR li.title LIKE ? OR f.name LIKE ? OR o.name LIKE ? OR h.city LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        query += ` ORDER BY h.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const [handovers] = await pool.query(query, params);

        // Stats summary
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN handover_status IN ('INITIATED', 'LOCATION_PUBLISHED', 'SCHEDULED', 'AWAITING_CONFIRMATION') THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN handover_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN handover_status = 'ISSUE_REPORTED' THEN 1 ELSE 0 END) AS issues
            FROM RECOVERY_HANDOVERS
        `);

        return res.status(200).json({
            handovers,
            stats: stats[0] || { total: 0, in_progress: 0, completed: 0, issues: 0 }
        });
    } catch (error) {
        console.error('Error fetching admin handovers:', error);
        return res.status(500).json({ message: 'Failed to fetch handovers for admin.' });
    }
};

/**
 * 15. Admin: Resolve Handover Issue
 * POST /api/admin/handovers/issues/:issueId/resolve
 */
export const resolveHandoverIssue = async (req, res) => {
    try {
        const { issueId } = req.params;
        const { status = 'RESOLVED', admin_notes } = req.body;
        const adminId = req.user.id;

        const [issues] = await pool.query(`SELECT * FROM HANDOVER_ISSUES WHERE id = ?`, [issueId]);
        if (issues.length === 0) return res.status(404).json({ message: 'Issue not found.' });

        await pool.query(
            `UPDATE HANDOVER_ISSUES 
             SET status = ?, admin_notes = ?, resolved_by = ?, resolved_at = NOW()
             WHERE id = ?`,
            [status, admin_notes || null, adminId, issueId]
        );

        return res.status(200).json({ message: 'Handover issue updated.' });
    } catch (error) {
        console.error('Error resolving handover issue:', error);
        return res.status(500).json({ message: 'Failed to resolve issue.' });
    }
};

/**
 * 16. Admin: Detailed Inspection for a Single Handover
 * GET /api/admin/handovers/:id
 */
export const getAdminHandoverDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Handover details with core joins
        const [handoverRows] = await pool.query(
            `SELECT h.*,
                    r.id AS recovery_id, r.item_name AS recovery_item_name, r.brand AS recovery_brand,
                    r.model AS recovery_model, r.color AS recovery_color, r.identifying_marks AS recovery_identifying_marks,
                    r.found_date, r.found_time, r.found_location, r.city AS recovery_city,
                    r.location_description AS recovery_location_desc, r.item_condition AS recovery_condition,
                    r.additional_information AS recovery_additional_info, r.status AS recovery_status,
                    r.decision_reason AS recovery_decision_reason, r.admin_notes AS recovery_admin_notes,
                    r.created_at AS recovery_created_at,
                    li.id AS lost_item_id, li.title AS lost_title, li.description AS lost_description,
                    li.brand AS lost_brand, li.model AS lost_model, li.color AS lost_color,
                    li.identifying_details AS lost_identifying_details, li.location AS lost_location,
                    li.lost_date, li.lost_time, li.category AS lost_category, li.status AS lost_status,
                    f.id AS finder_id, f.name AS finder_name, f.email AS finder_email, f.phone AS finder_phone, f.avatar_url AS finder_avatar, f.created_at AS finder_joined_at,
                    o.id AS owner_id, o.name AS owner_name, o.email AS owner_email, o.phone AS owner_phone, o.avatar_url AS owner_avatar, o.created_at AS owner_joined_at
             FROM RECOVERY_HANDOVERS h
             JOIN RECOVERY_SUBMISSIONS r ON h.recovery_id = r.id
             JOIN LOST_ITEMS li ON r.lost_item_id = li.id
             JOIN USERS f ON h.finder_id = f.id
             JOIN USERS o ON h.owner_id = o.id
             WHERE h.id = ?`,
            [id]
        );

        if (handoverRows.length === 0) {
            return res.status(404).json({ message: 'Handover record not found.' });
        }

        const handover = handoverRows[0];

        // 2. Original item photos
        const [lostItemImages] = await pool.query(
            `SELECT * FROM ITEM_IMAGES WHERE lost_item_id = ?`,
            [handover.lost_item_id]
        );

        // 3. Recovery submitted photos
        const [recoveryImages] = await pool.query(
            `SELECT * FROM RECOVERY_IMAGES WHERE recovery_id = ?`,
            [handover.recovery_id]
        );

        // 4. Recovery audit history
        const [recoveryAuditLogs] = await pool.query(
            `SELECT a.*, u.name AS user_name, u.role AS user_role
             FROM RECOVERY_AUDIT_LOGS a
             LEFT JOIN USERS u ON a.user_id = u.id
             WHERE a.recovery_id = ?
             ORDER BY a.created_at ASC`,
            [handover.recovery_id]
        );

        // 5. Handover audit history
        const [handoverAuditLogs] = await pool.query(
            `SELECT l.*, u.name AS user_name, u.role AS user_role
             FROM HANDOVER_AUDIT_LOGS l
             JOIN USERS u ON l.performed_by = u.id
             WHERE l.handover_id = ?
             ORDER BY l.created_at ASC`,
            [id]
        );

        // 6. Location sessions
        const [locationSessions] = await pool.query(
            `SELECT * FROM HANDOVER_LOCATION_SESSIONS
             WHERE handover_id = ?
             ORDER BY created_at DESC`,
            [id]
        );

        // 7. Reported issues
        const [issues] = await pool.query(
            `SELECT i.*, u.name AS reporter_name, r.name AS resolver_name
             FROM HANDOVER_ISSUES i
             JOIN USERS u ON i.reported_by = u.id
             LEFT JOIN USERS r ON i.resolved_by = r.id
             WHERE i.handover_id = ?
             ORDER BY i.created_at DESC`,
            [id]
        );

        // 8. Community feedback
        const [feedbackRows] = await pool.query(
            `SELECT fb.*, u.name AS reviewer_name, u.role AS reviewer_role, t.name AS target_name
             FROM HANDOVER_FEEDBACK fb
             JOIN USERS u ON fb.user_id = u.id
             JOIN USERS t ON fb.target_user_id = t.id
             WHERE fb.handover_id = ?
             ORDER BY fb.created_at ASC`,
            [id]
        );

        return res.status(200).json({
            handover,
            lostItemImages,
            recoveryImages,
            recoveryAuditLogs,
            handoverAuditLogs,
            locationSessions,
            issues,
            feedback: feedbackRows
        });
    } catch (error) {
        console.error('Error in getAdminHandoverDetail:', error);
        return res.status(500).json({ message: 'Failed to retrieve admin handover details.' });
    }
};

/**
 * 17. Submit Handover Rating & Feedback
 * POST /api/handovers/:id/feedback
 */
export const submitFeedback = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;
        const { rating, feedback_text } = req.body;

        const numRating = parseInt(rating, 10);
        if (!numRating || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: 'A valid rating between 1 and 5 stars is required.' });
        }

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        const { handover, isFinder, isOwner, isAdmin } = access;

        if (handover.handover_status !== 'COMPLETED' && !isAdmin) {
            return res.status(400).json({ message: 'Feedback can only be submitted after the item has been confirmed returned.' });
        }

        const targetUserId = isFinder ? handover.owner_id : handover.finder_id;

        await pool.query(
            `INSERT INTO HANDOVER_FEEDBACK (handover_id, user_id, target_user_id, rating, feedback_text)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback_text = VALUES(feedback_text), updated_at = NOW()`,
            [handoverId, userId, targetUserId, numRating, feedback_text?.trim() || null]
        );

        await logHandoverAction(
            pool,
            handoverId,
            userId,
            'FEEDBACK_SUBMITTED',
            `${isFinder ? 'Finder' : 'Owner'} submitted a ${numRating}-star rating with feedback.`
        );

        return res.status(200).json({
            message: 'Thank you! Your feedback has been recorded.',
            rating: numRating
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error submitting feedback:', error);
        return res.status(500).json({ message: 'Failed to submit feedback.' });
    }
};

/**
 * 18. Get Handover Feedback
 * GET /api/handovers/:id/feedback
 */
export const getFeedback = async (req, res) => {
    try {
        const handoverId = req.params.id;
        const userId = req.user.id;

        const access = await getHandoverAndVerifyAccess(handoverId, userId, req.user.role);
        if (!access) return res.status(404).json({ message: 'Handover not found.' });

        const [rows] = await pool.query(
            `SELECT fb.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
             FROM HANDOVER_FEEDBACK fb
             JOIN USERS u ON fb.user_id = u.id
             WHERE fb.handover_id = ?`,
            [handoverId]
        );

        return res.status(200).json({ feedback: rows });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error getting feedback:', error);
        return res.status(500).json({ message: 'Failed to fetch feedback.' });
    }
};

/**
 * 19. Upload Handover Evidence Photo (Cloudinary)
 * POST /api/handovers/:id/upload-evidence
 */
export const uploadHandoverEvidence = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }
        const result = await uploadEvidenceToCloudinary(req.file.buffer, 'foundit/handover_evidence');
        return res.status(200).json({
            message: 'Evidence photo uploaded successfully.',
            url: result.secure_url
        });
    } catch (error) {
        console.error('Error uploading handover evidence:', error);
        return res.status(500).json({ message: 'Failed to upload evidence photo.' });
    }
};
