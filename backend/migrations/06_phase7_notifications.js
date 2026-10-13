/**
 * Migration: 06_phase7_notifications
 * Creates the USER_NOTIFICATIONS table for the in-app notification bell feature.
 * Safe to re-run (CREATE TABLE IF NOT EXISTS).
 */

import pool from '../src/config/db.js';

const run = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('▶ Running migration: 06_phase7_notifications');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS USER_NOTIFICATIONS (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                type        VARCHAR(50) NOT NULL COMMENT 'CLAIM_SUBMITTED | CLAIM_DECISION | FINDER_REVIEW_REQUESTED | MESSAGE_RECEIVED | ADDITIONAL_INFO_REQUESTED | CLAIM_WITHDRAWN',
                title       VARCHAR(255) NOT NULL,
                body        TEXT,
                link        VARCHAR(500) COMMENT 'Frontend route e.g. /claims/5',
                is_read     BOOLEAN DEFAULT FALSE,
                read_at     DATETIME NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user    (user_id),
                INDEX idx_read    (is_read),
                INDEX idx_created (created_at),
                FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ USER_NOTIFICATIONS table created (or already exists).');
    } catch (err) {
        console.error('❌ Migration 06 failed:', err);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
};

run();
