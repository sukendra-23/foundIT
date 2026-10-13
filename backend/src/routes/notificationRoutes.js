/**
 * Notification Routes
 * All routes are protected by the `protect` middleware.
 *
 * GET    /api/notifications/unread-count  → getUnreadNotificationCount
 * GET    /api/notifications               → getNotifications
 * POST   /api/notifications/read-all      → markAllNotificationsRead
 * POST   /api/notifications/:id/read      → markNotificationRead
 *
 * NOTE: /unread-count and /read-all must be registered BEFORE /:id/read
 * so Express doesn't try to parse 'unread-count' or 'read-all' as an :id param.
 */

import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Specific string routes first (before param routes)
router.get('/unread-count', getUnreadNotificationCount);
router.get('/', getNotifications);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);

export default router;
