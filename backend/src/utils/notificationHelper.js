/**
 * Notification Helper
 * Utility to silently insert records into USER_NOTIFICATIONS.
 * Errors are caught internally — notifications must NEVER break the main request flow.
 */

import pool from '../config/db.js';

const ensureNotificationsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS USER_NOTIFICATIONS (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            type        VARCHAR(50) NOT NULL,
            title       VARCHAR(255) NOT NULL,
            body        TEXT,
            link        VARCHAR(500),
            is_read     BOOLEAN DEFAULT FALSE,
            read_at     DATETIME NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user    (user_id),
            INDEX idx_read    (is_read),
            INDEX idx_created (created_at),
            FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
};

/**
 * Create a single in-app notification for a user.
 * @param {number} userId
 * @param {string} type   - e.g. 'CLAIM_SUBMITTED', 'CLAIM_DECISION', ...
 * @param {string} title
 * @param {string|null} body
 * @param {string|null} link  - Frontend route e.g. '/claims/5'
 */
export const createNotification = async (userId, type, title, body = null, link = null) => {
    try {
        await pool.query(
            `INSERT INTO USER_NOTIFICATIONS (user_id, type, title, body, link)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, title, body, link]
        );
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            try {
                await ensureNotificationsTable();
                await pool.query(
                    `INSERT INTO USER_NOTIFICATIONS (user_id, type, title, body, link)
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, type, title, body, link]
                );
                return;
            } catch (retryErr) {
                console.error('[NotificationHelper] Failed after table creation retry:', retryErr.message);
            }
        }
        console.error('[NotificationHelper] Failed to create notification:', err.message);
        // Intentionally silent — never re-throw
    }
};

/**
 * Create the same notification for multiple users in bulk.
 * Skips duplicate / null user IDs automatically.
 * @param {number[]} userIds
 * @param {string} type
 * @param {string} title
 * @param {string|null} body
 * @param {string|null} link
 */
export const createNotificationsForMany = async (userIds, type, title, body = null, link = null) => {
    try {
        const uniqueIds = [...new Set(userIds.filter(id => id != null && !isNaN(id)))];
        if (uniqueIds.length === 0) return;

        const rows = uniqueIds.map(uid => [uid, type, title, body, link]);
        await pool.query(
            `INSERT INTO USER_NOTIFICATIONS (user_id, type, title, body, link) VALUES ?`,
            [rows]
        );
    } catch (err) {
        console.error('[NotificationHelper] Failed to create bulk notifications:', err.message);
        // Intentionally silent — never re-throw
    }
};
