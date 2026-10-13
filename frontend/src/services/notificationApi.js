/**
 * Notification API Service
 * All calls use the shared axios instance (with JWT interceptor) from api.js.
 */

import api from './api.js';

export const notificationApi = {
    /**
     * GET /api/notifications/unread-count
     * Returns { unreadCount: N }
     */
    getUnreadCount: () => api.get('/notifications/unread-count'),

    /**
     * GET /api/notifications
     * Returns { notifications: [...], unreadCount: N }
     */
    getNotifications: () => api.get('/notifications'),

    /**
     * POST /api/notifications/:id/read
     */
    markRead: (id) => api.post(`/notifications/${id}/read`),

    /**
     * POST /api/notifications/read-all
     */
    markAllRead: () => api.post('/notifications/read-all'),
};
