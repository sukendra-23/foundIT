import pool from './db.js';

/**
 * Ensures all Phase 7 tables exist on application startup.
 * Automatically runs CREATE TABLE IF NOT EXISTS for:
 * 1. CLAIM_CONVERSATIONS
 * 2. CLAIM_MESSAGES
 * 3. USER_NOTIFICATIONS
 * Safe and idempotent.
 */
export const ensureTables = async () => {
    try {
        console.log('🔄 Checking and verifying Phase 7 database tables...');

        // 1. CLAIM_CONVERSATIONS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLAIM_CONVERSATIONS (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                claim_id        INT NOT NULL UNIQUE,
                claimant_id     INT NOT NULL,
                finder_id       INT NOT NULL,
                last_message_at TIMESTAMP NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE,
                FOREIGN KEY (claimant_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (finder_id) REFERENCES USERS(id) ON DELETE CASCADE,
                INDEX idx_claim (claim_id),
                INDEX idx_claimant (claimant_id),
                INDEX idx_finder (finder_id),
                INDEX idx_last_message (last_message_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. CLAIM_MESSAGES
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLAIM_MESSAGES (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id       INT NOT NULL,
                message_text    TEXT NOT NULL,
                is_read         BOOLEAN DEFAULT FALSE,
                read_at         DATETIME NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES CLAIM_CONVERSATIONS(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES USERS(id) ON DELETE CASCADE,
                INDEX idx_conversation (conversation_id),
                INDEX idx_sender (sender_id),
                INDEX idx_created (created_at),
                INDEX idx_read (is_read)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. USER_NOTIFICATIONS
        await pool.query(`
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

        // 4. MESSAGE_REPORTS (Phase 7 Feature F: Abuse & Moderation)
        await pool.query(`
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

        console.log('✅ Phase 7 tables ready (USER_NOTIFICATIONS, CLAIM_CONVERSATIONS, CLAIM_MESSAGES, MESSAGE_REPORTS).');

        // 5. Verify Phase 7 Recovery Workflow tables exist (does NOT create them; requires migration 08)
        console.log('🔍 Verifying Phase 7 Recovery Workflow schema...');
        const recoveryTables = [
            'RECOVERY_SUBMISSIONS',
            'RECOVERY_IMAGES',
            'RECOVERY_AUDIT_LOGS',
            'RECOVERY_CONVERSATIONS',
            'RECOVERY_MESSAGES',
            'RECOVERY_MESSAGE_REPORTS'
        ];
        const [existingRecTables] = await pool.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
            [recoveryTables]
        );
        const existingNames = new Set(existingRecTables.map(r => r.TABLE_NAME));
        const missing = recoveryTables.filter(t => !existingNames.has(t));

        if (missing.length > 0) {
            console.error(`\n❌ [ensureTables] Phase 7 Recovery Workflow tables missing: ${missing.join(', ')}`);
            console.error('👉 Please run the authoritative migration: node migrations/08_phase7_recovery_workflow.js\n');
            process.exit(1);
        }
        console.log('✅ Phase 7 Recovery Workflow tables verified and active.');
    } catch (error) {
        console.error('⚠️ [ensureTables] Error during table bootstrap / verification:', error.message);
    }
};
