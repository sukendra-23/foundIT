import pool from '../config/db.js';
import { createNotification } from '../utils/notificationHelper.js';

/**
 * List all conversations where current user is claimant, finder, reporter, or admin.
 * Returns combined list of Claim Conversations and Recovery Conversations.
 * GET /api/messages/conversations
 */
export const getUserConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Fetch Claim Conversations
        const [claimRows] = await pool.query(`
            SELECT
                conv.id, conv.claim_id, conv.claimant_id, conv.finder_id, conv.last_message_at, conv.created_at,
                c.status as claim_status,
                f.id as found_item_id, f.title as found_title, f.category as found_category,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image,
                claimant.name as claimant_name,
                finder.name as finder_name,
                (
                    SELECT message_text
                    FROM CLAIM_MESSAGES
                    WHERE conversation_id = conv.id
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message_text,
                (
                    SELECT COUNT(*)
                    FROM CLAIM_MESSAGES
                    WHERE conversation_id = conv.id
                      AND sender_id != ?
                      AND is_read = FALSE
                ) as unread_count
            FROM CLAIM_CONVERSATIONS conv
            JOIN CLAIMS c ON conv.claim_id = c.id
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS claimant ON conv.claimant_id = claimant.id
            JOIN USERS finder ON conv.finder_id = finder.id
            WHERE conv.claimant_id = ? OR conv.finder_id = ? OR ? = TRUE
            ORDER BY COALESCE(conv.last_message_at, conv.created_at) DESC
        `, [userId, userId, userId, isAdmin]);

        const claimConversations = claimRows.map(conv => {
            const isUserClaimant = conv.claimant_id === userId;
            const otherParticipantName = isUserClaimant ? conv.finder_name : conv.claimant_name;
            const otherParticipantRole = isUserClaimant ? 'Finder' : 'Claimant';

            return {
                id: conv.id,
                compositeId: `claim:${conv.id}`,
                contextType: 'CLAIM',
                claimId: conv.claim_id,
                claimStatus: conv.claim_status,
                foundItemId: conv.found_item_id,
                itemTitle: conv.found_title,
                itemCategory: conv.found_category,
                itemImage: conv.found_image,
                otherParticipantName,
                otherParticipantRole,
                lastMessageText: conv.last_message_text,
                lastMessageAt: conv.last_message_at,
                unreadCount: Number(conv.unread_count) || 0,
                createdAt: conv.created_at,
                isReadOnly: ['REJECTED', 'WITHDRAWN'].includes(conv.claim_status)
            };
        });

        // 2. Fetch Recovery Conversations
        const [recRows] = await pool.query(`
            SELECT
                rconv.id, rconv.recovery_id, rconv.reporter_id, rconv.finder_id, rconv.last_message_at, rconv.created_at,
                r.status as recovery_status,
                l.id as lost_item_id, l.title as lost_title, l.category as lost_category,
                (SELECT image_url FROM ITEM_IMAGES WHERE lost_item_id = l.id LIMIT 1) as lost_image,
                reporter.name as reporter_name,
                finder.name as finder_name,
                (
                    SELECT message_text
                    FROM RECOVERY_MESSAGES
                    WHERE conversation_id = rconv.id
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message_text,
                (
                    SELECT COUNT(*)
                    FROM RECOVERY_MESSAGES
                    WHERE conversation_id = rconv.id
                      AND sender_id != ?
                      AND is_read = FALSE
                ) as unread_count
            FROM RECOVERY_CONVERSATIONS rconv
            JOIN RECOVERY_SUBMISSIONS r ON rconv.recovery_id = r.id
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS reporter ON rconv.reporter_id = reporter.id
            JOIN USERS finder ON rconv.finder_id = finder.id
            WHERE rconv.reporter_id = ? OR rconv.finder_id = ? OR ? = TRUE
            ORDER BY COALESCE(rconv.last_message_at, rconv.created_at) DESC
        `, [userId, userId, userId, isAdmin]);

        const recoveryConversations = recRows.map(conv => {
            const isUserReporter = conv.reporter_id === userId;
            const otherParticipantName = isUserReporter ? conv.finder_name : conv.reporter_name;
            const otherParticipantRole = isUserReporter ? 'Finder' : 'Owner';

            return {
                id: conv.id,
                compositeId: `recovery:${conv.id}`,
                contextType: 'RECOVERY',
                recoveryId: conv.recovery_id,
                recoveryStatus: conv.recovery_status,
                lostItemId: conv.lost_item_id,
                itemTitle: conv.lost_title,
                itemCategory: conv.lost_category,
                itemImage: conv.lost_image,
                otherParticipantName,
                otherParticipantRole,
                lastMessageText: conv.last_message_text,
                lastMessageAt: conv.last_message_at,
                unreadCount: Number(conv.unread_count) || 0,
                createdAt: conv.created_at,
                isReadOnly: ['REJECTED', 'CANCELLED'].includes(conv.recovery_status)
            };
        });

        // 3. Combined and sorted by most recent activity
        const allConversations = [...claimConversations, ...recoveryConversations].sort((a, b) => {
            const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
            const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
            return timeB - timeA;
        });

        return res.status(200).json(allConversations);
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieve or initialize a conversation tied to an authorized claim.
 * GET /api/messages/conversations/claim/:claimId
 */
export const getOrCreateConversationByClaim = async (req, res, next) => {
    try {
        const { claimId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Validate claim exists and resolve participants
        const [claimRows] = await pool.query(`
            SELECT c.id, c.claimant_id, c.status as claim_status, f.user_id as finder_id
            FROM CLAIMS c
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            WHERE c.id = ?
        `, [claimId]);

        if (claimRows.length === 0) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        const claim = claimRows[0];

        // 2. Authorization check
        const isParticipant = claim.claimant_id === userId || claim.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to access conversations for this claim.' });
        }

        // 3. Find or create conversation
        let [convRows] = await pool.query(
            'SELECT id FROM CLAIM_CONVERSATIONS WHERE claim_id = ? LIMIT 1',
            [claimId]
        );

        let conversationId;
        if (convRows.length > 0) {
            conversationId = convRows[0].id;
        } else {
            const [insertResult] = await pool.query(`
                INSERT INTO CLAIM_CONVERSATIONS (claim_id, claimant_id, finder_id)
                VALUES (?, ?, ?)
            `, [claim.id, claim.claimant_id, claim.finder_id]);
            conversationId = insertResult.insertId;
        }

        return res.status(200).json({ conversationId });
    } catch (error) {
        next(error);
    }
};

/**
 * Get conversation details and message history for a Claim conversation.
 * GET /api/messages/conversations/:id
 */
export const getConversationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Fetch conversation details
        const [convRows] = await pool.query(`
            SELECT
                conv.id, conv.claim_id, conv.claimant_id, conv.finder_id, conv.created_at,
                c.status as claim_status,
                f.id as found_item_id, f.title as found_title, f.category as found_category,
                (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image,
                claimant.name as claimant_name,
                finder.name as finder_name
            FROM CLAIM_CONVERSATIONS conv
            JOIN CLAIMS c ON conv.claim_id = c.id
            JOIN FOUND_ITEMS f ON c.found_item_id = f.id
            JOIN USERS claimant ON conv.claimant_id = claimant.id
            JOIN USERS finder ON conv.finder_id = finder.id
            WHERE conv.id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        const conv = convRows[0];

        // 2. Authorization check
        const isParticipant = conv.claimant_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to view this conversation.' });
        }

        // 3. Fetch message history
        const [messages] = await pool.query(`
            SELECT
                m.id, m.conversation_id, m.sender_id, m.message_text,
                m.is_read, m.read_at, m.created_at,
                u.name as sender_name
            FROM CLAIM_MESSAGES m
            JOIN USERS u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [id]);

        const isUserClaimant = conv.claimant_id === userId;
        const otherParticipantName = isUserClaimant ? conv.finder_name : conv.claimant_name;
        const otherParticipantRole = isUserClaimant ? 'Finder' : 'Claimant';

        return res.status(200).json({
            conversation: {
                id: conv.id,
                compositeId: `claim:${conv.id}`,
                contextType: 'CLAIM',
                claimId: conv.claim_id,
                claimStatus: conv.claim_status,
                foundItemId: conv.found_item_id,
                itemTitle: conv.found_title,
                itemCategory: conv.found_category,
                itemImage: conv.found_image,
                otherParticipantName,
                otherParticipantRole,
                isReadOnly: ['REJECTED', 'WITHDRAWN'].includes(conv.claim_status),
                createdAt: conv.created_at
            },
            messages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send a message within an authorized claim conversation.
 * POST /api/messages/conversations/:id
 */
export const sendMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { messageText } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Validate and sanitize content
        if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
            return res.status(400).json({ message: 'Message content cannot be empty.' });
        }

        const sanitizedText = messageText
            .replace(/\0/g, '')
            .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();

        if (sanitizedText.length === 0) {
            return res.status(400).json({ message: 'Message content cannot be empty.' });
        }

        if (sanitizedText.length > 2000) {
            return res.status(400).json({ message: 'Message exceeds the maximum limit of 2,000 characters.' });
        }

        // 2. Fetch conversation
        const [convRows] = await pool.query(`
            SELECT conv.id, conv.claim_id, conv.claimant_id, conv.finder_id, c.status as claim_status
            FROM CLAIM_CONVERSATIONS conv
            JOIN CLAIMS c ON conv.claim_id = c.id
            WHERE conv.id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        const conv = convRows[0];

        // 3. Authorization check
        const isParticipant = conv.claimant_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to send messages in this conversation.' });
        }

        // 4. Lifecycle check
        if (['REJECTED', 'WITHDRAWN'].includes(conv.claim_status)) {
            return res.status(400).json({
                message: `Messaging is disabled because this claim has been ${conv.claim_status.toLowerCase()}. Existing messages are preserved for your records.`
            });
        }

        // 5. Insert message and update conversation timestamp atomically
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [insertResult] = await connection.query(`
                INSERT INTO CLAIM_MESSAGES (conversation_id, sender_id, message_text)
                VALUES (?, ?, ?)
            `, [id, userId, sanitizedText]);

            await connection.query(`
                UPDATE CLAIM_CONVERSATIONS
                SET last_message_at = NOW()
                WHERE id = ?
            `, [id]);

            await connection.commit();

            const [newMsgRows] = await connection.query(`
                SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.is_read, m.read_at, m.created_at, u.name as sender_name
                FROM CLAIM_MESSAGES m
                JOIN USERS u ON m.sender_id = u.id
                WHERE m.id = ?
            `, [insertResult.insertId]);

            // Fire-and-forget: in-app notification to recipient
            const recipientId = conv.claimant_id === userId ? conv.finder_id : conv.claimant_id;
            pool.query(`
                SELECT (SELECT name FROM USERS WHERE id = ?) as sender_name
            `, [userId]).then(([rows]) => {
                const sender_name = rows?.[0]?.sender_name || 'Someone';
                const cleanPreview = sanitizedText.replace(/\s+/g, ' ');
                const preview = cleanPreview.length > 100 ? `${cleanPreview.substring(0, 100)}...` : cleanPreview;

                createNotification(
                    recipientId,
                    'MESSAGE_RECEIVED',
                    `New message from ${sender_name}`,
                    preview,
                    `/messages?claimId=${conv.claim_id}`
                );
            }).catch(err => {
                console.error('[MessageController] Failed to send in-app notification:', err.message);
            });

            return res.status(201).json({
                message: 'Message sent successfully.',
                data: newMsgRows[0]
            });
        } catch (txError) {
            await connection.rollback();
            throw txError;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Mark messages in a claim conversation as read.
 * POST /api/messages/conversations/:id/read
 */
export const markConversationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [convRows] = await pool.query(`
            SELECT claimant_id, finder_id
            FROM CLAIM_CONVERSATIONS
            WHERE id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        const conv = convRows[0];
        const isParticipant = conv.claimant_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to update this conversation.' });
        }

        await pool.query(`
            UPDATE CLAIM_MESSAGES
            SET is_read = TRUE, read_at = NOW()
            WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
        `, [id, userId]);

        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieve total unread messages count for current user (claims + recoveries).
 * GET /api/messages/unread-count
 */
export const getUnreadMessageCount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [claimRows] = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM CLAIM_MESSAGES m
            JOIN CLAIM_CONVERSATIONS conv ON m.conversation_id = conv.id
            WHERE (conv.claimant_id = ? OR conv.finder_id = ?)
              AND m.sender_id != ?
              AND m.is_read = FALSE
        `, [userId, userId, userId]);

        const [recRows] = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM RECOVERY_MESSAGES m
            JOIN RECOVERY_CONVERSATIONS conv ON m.conversation_id = conv.id
            WHERE (conv.reporter_id = ? OR conv.finder_id = ?)
              AND m.sender_id != ?
              AND m.is_read = FALSE
        `, [userId, userId, userId]);

        const totalUnread = (Number(claimRows[0]?.unread_count) || 0) + (Number(recRows[0]?.unread_count) || 0);

        return res.status(200).json({
            unreadCount: totalUnread
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Report an inappropriate or abusive claim message.
 * POST /api/messages/messages/:messageId/report
 */
export const reportMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { reason, details } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const validReasons = ['HARASSMENT', 'SPAM', 'SCAM_FRAUD', 'INAPPROPRIATE', 'OTHER'];
        if (!reason || !validReasons.includes(reason)) {
            return res.status(400).json({
                message: `Please select a valid report reason: ${validReasons.join(', ')}.`
            });
        }

        const sanitizedDetails = details && typeof details === 'string'
            ? details.replace(/\0/g, '').trim().substring(0, 500)
            : null;

        const [msgRows] = await pool.query(`
            SELECT m.id, m.conversation_id, m.sender_id,
                   conv.claimant_id, conv.finder_id
            FROM CLAIM_MESSAGES m
            JOIN CLAIM_CONVERSATIONS conv ON m.conversation_id = conv.id
            WHERE m.id = ?
        `, [messageId]);

        if (msgRows.length === 0) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        const msg = msgRows[0];

        const isParticipant = msg.claimant_id === userId || msg.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to report messages from this conversation.' });
        }

        if (msg.sender_id === userId) {
            return res.status(400).json({ message: 'You cannot report your own message.' });
        }

        const [existing] = await pool.query(
            'SELECT id FROM MESSAGE_REPORTS WHERE message_id = ? AND reporter_id = ? LIMIT 1',
            [messageId, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already reported this message. Our moderation team is reviewing it.' });
        }

        await pool.query(`
            INSERT INTO MESSAGE_REPORTS (message_id, conversation_id, reporter_id, reported_user_id, reason, details, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
        `, [msg.id, msg.conversation_id, userId, msg.sender_id, reason, sanitizedDetails]);

        return res.status(201).json({
            message: 'Thank you. The message has been flagged for administrative review.'
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// RECOVERY WORKFLOW MESSAGING ENDPOINTS
// ============================================================================

/**
 * Retrieve or initialize a conversation tied to an authorized recovery submission.
 * GET /api/messages/conversations/recovery/:recoveryId
 */
export const getOrCreateConversationByRecovery = async (req, res, next) => {
    try {
        const { recoveryId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [recRows] = await pool.query(`
            SELECT r.id, r.finder_id, r.status, l.user_id as reporter_id
            FROM RECOVERY_SUBMISSIONS r
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            WHERE r.id = ?
        `, [recoveryId]);

        if (recRows.length === 0) {
            return res.status(404).json({ message: 'Recovery report not found.' });
        }

        const recovery = recRows[0];
        const isParticipant = recovery.finder_id === userId || recovery.reporter_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to access conversations for this recovery report.' });
        }

        if (recovery.status !== 'APPROVED' && !isAdmin) {
            return res.status(400).json({
                message: 'Messaging between finder and owner is only available after an administrator reviews and approves the recovery report.'
            });
        }

        let [convRows] = await pool.query(
            'SELECT id FROM RECOVERY_CONVERSATIONS WHERE recovery_id = ? LIMIT 1',
            [recoveryId]
        );

        let conversationId;
        if (convRows.length > 0) {
            conversationId = convRows[0].id;
        } else {
            const [insertResult] = await pool.query(`
                INSERT INTO RECOVERY_CONVERSATIONS (recovery_id, reporter_id, finder_id)
                VALUES (?, ?, ?)
            `, [recovery.id, recovery.reporter_id, recovery.finder_id]);
            conversationId = insertResult.insertId;
        }

        return res.status(200).json({ conversationId });
    } catch (error) {
        next(error);
    }
};

/**
 * Get recovery conversation details and message history.
 * GET /api/messages/recovery-conversations/:id
 */
export const getRecoveryConversationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [convRows] = await pool.query(`
            SELECT
                rconv.id, rconv.recovery_id, rconv.reporter_id, rconv.finder_id, rconv.created_at,
                r.status as recovery_status,
                l.id as lost_item_id, l.title as lost_title, l.category as lost_category,
                (SELECT image_url FROM ITEM_IMAGES WHERE lost_item_id = l.id LIMIT 1) as lost_image,
                reporter.name as reporter_name,
                finder.name as finder_name
            FROM RECOVERY_CONVERSATIONS rconv
            JOIN RECOVERY_SUBMISSIONS r ON rconv.recovery_id = r.id
            JOIN LOST_ITEMS l ON r.lost_item_id = l.id
            JOIN USERS reporter ON rconv.reporter_id = reporter.id
            JOIN USERS finder ON rconv.finder_id = finder.id
            WHERE rconv.id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Recovery conversation not found.' });
        }

        const conv = convRows[0];

        const isParticipant = conv.reporter_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to view this conversation.' });
        }

        const [messages] = await pool.query(`
            SELECT
                m.id, m.conversation_id, m.sender_id, m.message_text,
                m.is_read, m.read_at, m.created_at,
                u.name as sender_name
            FROM RECOVERY_MESSAGES m
            JOIN USERS u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [id]);

        const isUserReporter = conv.reporter_id === userId;
        const otherParticipantName = isUserReporter ? conv.finder_name : conv.reporter_name;
        const otherParticipantRole = isUserReporter ? 'Finder' : 'Owner';

        return res.status(200).json({
            conversation: {
                id: conv.id,
                compositeId: `recovery:${conv.id}`,
                contextType: 'RECOVERY',
                recoveryId: conv.recovery_id,
                recoveryStatus: conv.recovery_status,
                lostItemId: conv.lost_item_id,
                itemTitle: conv.lost_title,
                itemCategory: conv.lost_category,
                itemImage: conv.lost_image,
                otherParticipantName,
                otherParticipantRole,
                isReadOnly: ['REJECTED', 'CANCELLED'].includes(conv.recovery_status),
                createdAt: conv.created_at
            },
            messages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send a message within an authorized recovery conversation.
 * POST /api/messages/recovery-conversations/:id
 */
export const sendRecoveryMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { messageText } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
            return res.status(400).json({ message: 'Message content cannot be empty.' });
        }

        const sanitizedText = messageText
            .replace(/\0/g, '')
            .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();

        if (sanitizedText.length === 0) {
            return res.status(400).json({ message: 'Message content cannot be empty.' });
        }

        if (sanitizedText.length > 2000) {
            return res.status(400).json({ message: 'Message exceeds the maximum limit of 2,000 characters.' });
        }

        const [convRows] = await pool.query(`
            SELECT rconv.id, rconv.recovery_id, rconv.reporter_id, rconv.finder_id, r.status as recovery_status
            FROM RECOVERY_CONVERSATIONS rconv
            JOIN RECOVERY_SUBMISSIONS r ON rconv.recovery_id = r.id
            WHERE rconv.id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Recovery conversation not found.' });
        }

        const conv = convRows[0];

        const isParticipant = conv.reporter_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to send messages in this conversation.' });
        }

        if (conv.recovery_status !== 'APPROVED' && !isAdmin) {
            return res.status(400).json({
                message: 'Messaging between finder and owner is only available after an administrator reviews and approves the recovery report.'
            });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [insertResult] = await connection.query(`
                INSERT INTO RECOVERY_MESSAGES (conversation_id, sender_id, message_text)
                VALUES (?, ?, ?)
            `, [id, userId, sanitizedText]);

            await connection.query(`
                UPDATE RECOVERY_CONVERSATIONS
                SET last_message_at = NOW()
                WHERE id = ?
            `, [id]);

            await connection.commit();

            const [newMsgRows] = await connection.query(`
                SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.is_read, m.read_at, m.created_at, u.name as sender_name
                FROM RECOVERY_MESSAGES m
                JOIN USERS u ON m.sender_id = u.id
                WHERE m.id = ?
            `, [insertResult.insertId]);

            // Fire-and-forget in-app notification to the other participant
            const recipientId = conv.reporter_id === userId ? conv.finder_id : conv.reporter_id;
            pool.query(`
                SELECT (SELECT name FROM USERS WHERE id = ?) as sender_name
            `, [userId]).then(([rows]) => {
                const sender_name = rows?.[0]?.sender_name || 'Someone';
                const cleanPreview = sanitizedText.replace(/\s+/g, ' ');
                const preview = cleanPreview.length > 100 ? `${cleanPreview.substring(0, 100)}...` : cleanPreview;

                createNotification(
                    recipientId,
                    'MESSAGE_RECEIVED',
                    `New message from ${sender_name}`,
                    preview,
                    `/messages?recoveryId=${conv.recovery_id}`
                );
            }).catch(err => {
                console.error('[RecoveryMessage] Notification error:', err.message);
            });

            return res.status(201).json({
                message: 'Message sent successfully.',
                data: newMsgRows[0]
            });
        } catch (txError) {
            await connection.rollback();
            throw txError;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Mark messages in a recovery conversation as read.
 * POST /api/messages/recovery-conversations/:id/read
 */
export const markRecoveryConversationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [convRows] = await pool.query(`
            SELECT reporter_id, finder_id
            FROM RECOVERY_CONVERSATIONS
            WHERE id = ?
        `, [id]);

        if (convRows.length === 0) {
            return res.status(404).json({ message: 'Recovery conversation not found.' });
        }

        const conv = convRows[0];
        const isParticipant = conv.reporter_id === userId || conv.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to update this conversation.' });
        }

        await pool.query(`
            UPDATE RECOVERY_MESSAGES
            SET is_read = TRUE, read_at = NOW()
            WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE
        `, [id, userId]);

        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * Report an inappropriate or abusive recovery message.
 * Strictly derives reported_user_id on the server from the message sender.
 * Enforces uq_recovery_message_reporter unique constraint.
 * POST /api/messages/recovery-messages/:messageId/report
 */
export const reportRecoveryMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { reason, details } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const validReasons = ['HARASSMENT', 'SPAM', 'SCAM_FRAUD', 'INAPPROPRIATE', 'OTHER'];
        if (!reason || !validReasons.includes(reason)) {
            return res.status(400).json({
                message: `Please select a valid report reason: ${validReasons.join(', ')}.`
            });
        }

        const sanitizedDetails = details && typeof details === 'string'
            ? details.replace(/\0/g, '').trim().substring(0, 500)
            : null;

        // 1. Find target recovery message and verify conversation participants
        const [msgRows] = await pool.query(`
            SELECT m.id, m.conversation_id, m.sender_id,
                   rconv.reporter_id, rconv.finder_id
            FROM RECOVERY_MESSAGES m
            JOIN RECOVERY_CONVERSATIONS rconv ON m.conversation_id = rconv.id
            WHERE m.id = ?
        `, [messageId]);

        if (msgRows.length === 0) {
            return res.status(404).json({ message: 'Recovery message not found.' });
        }

        const msg = msgRows[0];

        // 2. Authorization check
        const isParticipant = msg.reporter_id === userId || msg.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to report messages from this conversation.' });
        }

        // 3. Prevent self-report
        if (msg.sender_id === userId) {
            return res.status(400).json({ message: 'You cannot report your own message.' });
        }

        // 4. Derive reported_user_id strictly from msg.sender_id on server
        const reportedUserId = msg.sender_id;

        // 5. Duplicate check (supplemented by DB unique key uq_recovery_message_reporter)
        const [existing] = await pool.query(
            'SELECT id FROM RECOVERY_MESSAGE_REPORTS WHERE message_id = ? AND reporter_id = ? LIMIT 1',
            [messageId, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already reported this message. Our moderation team is reviewing it.' });
        }

        // 6. Insert report
        await pool.query(`
            INSERT INTO RECOVERY_MESSAGE_REPORTS (message_id, conversation_id, reporter_id, reported_user_id, reason, details, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
        `, [msg.id, msg.conversation_id, userId, reportedUserId, reason, sanitizedDetails]);

        return res.status(201).json({
            message: 'Thank you. The message has been flagged for administrative review.'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'You have already reported this message.' });
        }
        next(error);
    }
};
