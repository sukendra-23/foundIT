/**
 * Notification Controller
 * Handles fetching, marking read, and counting in-app notifications.
 */

import pool from '../config/db.js';
import { ensureTables } from '../config/ensureTables.js';

/**
 * GET /api/notifications
 * Returns the last 30 notifications for the current user.
 * Response: { notifications: [...], unreadCount: N }
 */
export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [notifications] = await pool.query(
            `SELECT id, type, title, body, link, is_read, read_at, created_at
             FROM USER_NOTIFICATIONS
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 30`,
            [userId]
        );

        const [countRows] = await pool.query(
            `SELECT COUNT(*) as cnt FROM USER_NOTIFICATIONS WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        return res.status(200).json({
            notifications,
            unreadCount: Number(countRows[0]?.cnt) || 0
        });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            await ensureTables();
            return res.status(200).json({ notifications: [], unreadCount: 0 });
        }
        next(error);
    }
};

/**
 * GET /api/notifications/unread-count
 * Returns just the unread notification count for the current user.
 * Response: { unreadCount: N }
 */
export const getUnreadNotificationCount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT COUNT(*) as cnt FROM USER_NOTIFICATIONS WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        return res.status(200).json({
            unreadCount: Number(rows[0]?.cnt) || 0
        });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            await ensureTables();
            return res.status(200).json({ unreadCount: 0 });
        }
        next(error);
    }
};

/**
 * POST /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markNotificationRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await pool.query(
            `UPDATE USER_NOTIFICATIONS
             SET is_read = TRUE, read_at = NOW()
             WHERE id = ? AND user_id = ? AND is_read = FALSE`,
            [id, userId]
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            await ensureTables();
            return res.status(200).json({ success: true });
        }
        next(error);
    }
};

/**
 * POST /api/notifications/read-all
 * Marks all of the current user's unread notifications as read.
 */
export const markAllNotificationsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;

        await pool.query(
            `UPDATE USER_NOTIFICATIONS
             SET is_read = TRUE, read_at = NOW()
             WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            await ensureTables();
            return res.status(200).json({ success: true });
        }
        next(error);
    }
};
