import express from 'express';
import {
    getUserConversations,
    getOrCreateConversationByClaim,
    getConversationById,
    sendMessage,
    markConversationAsRead,
    getUnreadMessageCount,
    reportMessage,
    getOrCreateConversationByRecovery,
    getRecoveryConversationById,
    sendRecoveryMessage,
    markRecoveryConversationAsRead,
    reportRecoveryMessage
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { messageRateLimiter, reportRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// 1. Unread count (for navbar badge)
router.get('/unread-count', getUnreadMessageCount);

// 2. User's conversation list (claims + recoveries)
router.get('/conversations', getUserConversations);

// 3. Claim conversations
router.get('/conversations/claim/:claimId', getOrCreateConversationByClaim);
router.get('/conversations/:id', getConversationById);
router.post('/conversations/:id', messageRateLimiter, sendMessage);
router.post('/conversations/:id/read', markConversationAsRead);
router.post('/messages/:messageId/report', reportRateLimiter, reportMessage);

// 4. Recovery conversations
router.get('/conversations/recovery/:recoveryId', getOrCreateConversationByRecovery);
router.get('/recovery-conversations/:id', getRecoveryConversationById);
router.post('/recovery-conversations/:id', messageRateLimiter, sendRecoveryMessage);
router.post('/recovery-conversations/:id/read', markRecoveryConversationAsRead);
router.post('/recovery-messages/:messageId/report', reportRateLimiter, reportRecoveryMessage);

export default router;
