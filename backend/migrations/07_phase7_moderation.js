/**
 * Migration 07: Phase 7 — Message Abuse Reporting & Moderation
 * Creates MESSAGE_REPORTS table.
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS.
 */

import pool from '../src/config/db.js';

const run = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('▶ Running migration: 07_phase7_moderation');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS MESSAGE_REPORTS (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                message_id       INT NOT NULL,
                conversation_id  INT NOT NULL,
                reporter_id      INT NOT NULL,
                reported_user_id INT NOT NULL,
                reason           VARCHAR(50) NOT NULL COMMENT 'HARASSMENT | SPAM | SCAM_FRAUD | INAPPROPRIATE | OTHER',
                details          TEXT NULL,
                status           VARCHAR(30) DEFAULT 'PENDING' COMMENT 'PENDING | REVIEWED | DISMISSED | ACTION_TAKEN',
                reviewed_by      INT NULL,
                reviewed_at      DATETIME NULL,
                admin_notes      TEXT NULL,
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_msg           (message_id),
                INDEX idx_conv          (conversation_id),
                INDEX idx_reporter      (reporter_id),
                INDEX idx_reported_user (reported_user_id),
                INDEX idx_status        (status),
                FOREIGN KEY (message_id) REFERENCES CLAIM_MESSAGES(id) ON DELETE CASCADE,
                FOREIGN KEY (conversation_id) REFERENCES CLAIM_CONVERSATIONS(id) ON DELETE CASCADE,
                FOREIGN KEY (reporter_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (reported_user_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ MESSAGE_REPORTS table created (or already exists).');
    } catch (err) {
        console.error('❌ Migration 07 failed:', err);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
};

run();
