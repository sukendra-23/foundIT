import express from 'express';
import {
    getUserConversations,
    getOrCreateConversationByClaim,
    getConversationById,
    sendMessage,
    markConversationAsRead,
    getUnreadMessageCount,
    reportMessage
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { messageRateLimiter, reportRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// 1. Unread count (for navbar badge)
router.get('/unread-count', getUnreadMessageCount);

// 2. User's conversation list
router.get('/conversations', getUserConversations);

// 3. Get or create conversation by claim ID
router.get('/conversations/claim/:claimId', getOrCreateConversationByClaim);

// 4. Single conversation details and message history
router.get('/conversations/:id', getConversationById);

// 5. Send message (Feature E & F: Protected by messageRateLimiter)
router.post('/conversations/:id', messageRateLimiter, sendMessage);

// 6. Mark conversation messages as read
router.post('/conversations/:id/read', markConversationAsRead);

// 7. Report an inappropriate or abusive message (Feature F: Abuse Reporting & Moderation)
router.post('/messages/:messageId/report', reportRateLimiter, reportMessage);

export default router;
