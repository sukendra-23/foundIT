import pool from '../config/db.js';
import { createNotification } from '../utils/notificationHelper.js';

/**
 * List all conversations where current user is claimant, finder, or admin.
 * GET /api/messages/conversations
 */
export const getUserConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const [rows] = await pool.query(`
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

        // Transform into secure, user-centric conversation summaries
        const conversations = rows.map(conv => {
            const isUserClaimant = conv.claimant_id === userId;
            const otherParticipantName = isUserClaimant ? conv.finder_name : conv.claimant_name;
            const otherParticipantRole = isUserClaimant ? 'Finder' : 'Claimant';

            return {
                id: conv.id,
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

        return res.status(200).json(conversations);
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
 * Get conversation details and message history.
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
 * Send a message within an authorized conversation.
 * POST /api/messages/conversations/:id
 */
export const sendMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { messageText } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Validate and sanitize content (Feature E: Input validation & sanitization)
        if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
            return res.status(400).json({ message: 'Message content cannot be empty.' });
        }

        // Strip null bytes and unprintable control characters (preserving newlines, tabs)
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

            // ── Fire-and-forget: in-app notification to recipient (email disabled to preserve Brevo API quota) ──
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
            // ─────────────────────────────────────────────────────────────

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
 * Mark messages in a conversation as read.
 * POST /api/messages/conversations/:id/read
 */
export const markConversationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        // 1. Authorization check
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

        // 2. Mark incoming messages as read
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
 * Retrieve total unread messages count for current user.
 * GET /api/messages/unread-count
 */
export const getUnreadMessageCount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM CLAIM_MESSAGES m
            JOIN CLAIM_CONVERSATIONS conv ON m.conversation_id = conv.id
            WHERE (conv.claimant_id = ? OR conv.finder_id = ?)
              AND m.sender_id != ?
              AND m.is_read = FALSE
        `, [userId, userId, userId]);

        return res.status(200).json({
            unreadCount: Number(rows[0]?.unread_count) || 0
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Report an inappropriate or abusive message.
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

        // 1. Find the target message and its conversation
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

        // 2. Authorization: reporter must be an active participant in that conversation
        const isParticipant = msg.claimant_id === userId || msg.finder_id === userId || isAdmin;
        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not authorized to report messages from this conversation.' });
        }

        // 3. User cannot report their own message
        if (msg.sender_id === userId) {
            return res.status(400).json({ message: 'You cannot report your own message.' });
        }

        // 4. Duplicate prevention
        const [existing] = await pool.query(
            'SELECT id FROM MESSAGE_REPORTS WHERE message_id = ? AND reporter_id = ? LIMIT 1',
            [messageId, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already reported this message. Our moderation team is reviewing it.' });
        }

        // 5. Insert report
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
