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
        console.log('🔄 Checking and verifying database tables...');

        // Verify base prerequisite tables exist before verifying columns or creating dependent child tables
        const [baseCheck] = await pool.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('USERS', 'CLAIMS')`
        );
        const baseNames = new Set(baseCheck.map(r => r.TABLE_NAME));
        const missingBase = ['USERS', 'CLAIMS'].filter(t => !baseNames.has(t));

        if (missingBase.length > 0) {
            throw new Error(`Prerequisite base table(s) missing: ${missingBase.join(', ')}. Please run schema initialization (npm run setup-db) before starting the server.`);
        }

        // 0. Ensure USERS has avatar_url column
        try {
            const [cols] = await pool.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USERS' AND COLUMN_NAME = 'avatar_url'`
            );
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE USERS ADD COLUMN avatar_url VARCHAR(500) NULL AFTER phone`);
                console.log('✅ Added avatar_url column to USERS table.');
            }
        } catch (colErr) {
            console.error('⚠️ Could not verify/add avatar_url column:', colErr.message);
            throw colErr;
        }

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
            throw new Error(`Missing required Phase 7 recovery tables: ${missing.join(', ')}. Please ensure schema.sql is applied before starting the server.`);
        }
        console.log('✅ Phase 7 Recovery Workflow tables verified and active.');

        // 6. Ensure Smart Handover tables exist (Phase 8)
        console.log('📦 Checking Smart Handover tables (Phase 8)...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_HANDOVERS (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recovery_id INT NOT NULL UNIQUE,
                finder_id INT NOT NULL,
                owner_id INT NOT NULL,
                handover_method ENUM('IN_PERSON', 'COURIER') DEFAULT 'IN_PERSON',
                handover_status ENUM('INITIATED', 'LOCATION_PUBLISHED', 'SCHEDULED', 'AWAITING_CONFIRMATION', 'COMPLETED', 'ISSUE_REPORTED', 'CANCELLED', 'EXPIRED') DEFAULT 'INITIATED',
                location_type ENUM('MANUAL', 'GPS') NULL,
                location_title VARCHAR(255) NULL,
                address TEXT NULL,
                locality VARCHAR(150) NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                postal_code VARCHAR(20) NULL,
                landmark VARCHAR(255) NULL,
                additional_directions TEXT NULL,
                meeting_instructions TEXT NULL,
                latitude DECIMAL(10,8) NULL,
                longitude DECIMAL(11,8) NULL,
                contact_sharing_consent BOOLEAN DEFAULT FALSE,
                schedule_date DATE NULL,
                schedule_time TIME NULL,
                courier_name VARCHAR(100) NULL,
                tracking_number VARCHAR(100) NULL,
                courier_notes TEXT NULL,
                initiated_at DATETIME NULL,
                published_at DATETIME NULL,
                scheduled_at DATETIME NULL,
                completed_at DATETIME NULL,
                confirmed_by INT NULL,
                finder_feedback TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (recovery_id) REFERENCES RECOVERY_SUBMISSIONS(id) ON DELETE CASCADE,
                FOREIGN KEY (finder_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (confirmed_by) REFERENCES USERS(id) ON DELETE SET NULL,
                INDEX idx_recovery (recovery_id),
                INDEX idx_finder (finder_id),
                INDEX idx_owner (owner_id),
                INDEX idx_status (handover_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS HANDOVER_LOCATION_SESSIONS (
                id INT AUTO_INCREMENT PRIMARY KEY,
                handover_id INT NOT NULL,
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                accuracy FLOAT NULL,
                session_status ENUM('ACTIVE', 'STOPPED', 'EXPIRED') DEFAULT 'ACTIVE',
                started_at DATETIME NOT NULL,
                expires_at DATETIME NOT NULL,
                stopped_at DATETIME NULL,
                last_updated_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (handover_id) REFERENCES RECOVERY_HANDOVERS(id) ON DELETE CASCADE,
                INDEX idx_handover_session (handover_id),
                INDEX idx_session_status (session_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS HANDOVER_AUDIT_LOGS (
                id INT AUTO_INCREMENT PRIMARY KEY,
                handover_id INT NOT NULL,
                performed_by INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (handover_id) REFERENCES RECOVERY_HANDOVERS(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES USERS(id) ON DELETE CASCADE,
                INDEX idx_handover_audit (handover_id),
                INDEX idx_performed_by (performed_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS HANDOVER_ISSUES (
                id INT AUTO_INCREMENT PRIMARY KEY,
                handover_id INT NOT NULL,
                reported_by INT NOT NULL,
                issue_type ENUM('FINDER_NO_SHOW', 'WRONG_LOCATION', 'ITEM_NOT_RECEIVED', 'ITEM_CONDITION', 'COMMUNICATION', 'OTHER') NOT NULL,
                description TEXT NOT NULL,
                evidence_url TEXT NULL,
                status ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') DEFAULT 'PENDING',
                admin_notes TEXT NULL,
                resolved_by INT NULL,
                resolved_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (handover_id) REFERENCES RECOVERY_HANDOVERS(id) ON DELETE CASCADE,
                FOREIGN KEY (reported_by) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (resolved_by) REFERENCES USERS(id) ON DELETE SET NULL,
                INDEX idx_handover_issue (handover_id),
                INDEX idx_reported_by (reported_by),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        // 7. Ensure Handover Enhancements & Feedback Table (Migration 10)
        try {
            // Verify RECOVERY_HANDOVERS exists before executing enhancements
            const [handoverTableCheck] = await pool.query(`
                SELECT TABLE_NAME FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'RECOVERY_HANDOVERS'
            `);

            if (handoverTableCheck.length === 0) {
                throw new Error("Cannot apply handover enhancements: RECOVERY_HANDOVERS table does not exist.");
            }

            // 7a. Add 'VERIFIED' to the handover_status ENUM if not present
            try {
                const [enumRows] = await pool.query(`
                    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'RECOVERY_HANDOVERS'
                      AND COLUMN_NAME = 'handover_status'
                `);
                if (enumRows.length > 0) {
                    const colType = enumRows[0].COLUMN_TYPE; // e.g. enum('INITIATED','LOCATION_PUBLISHED',...)
                    if (!colType.includes("'VERIFIED'")) {
                        await pool.query(`
                            ALTER TABLE RECOVERY_HANDOVERS
                            MODIFY COLUMN handover_status
                            ENUM('INITIATED','LOCATION_PUBLISHED','VERIFIED','SCHEDULED','AWAITING_CONFIRMATION','COMPLETED','ISSUE_REPORTED','CANCELLED','EXPIRED')
                            NOT NULL DEFAULT 'INITIATED'
                        `);
                        console.log("✅ Added 'VERIFIED' to RECOVERY_HANDOVERS.handover_status ENUM.");
                    }
                }
            } catch (enumErr) {
                console.error('⚠️ Could not verify/add VERIFIED ENUM value:', enumErr.message);
                throw enumErr;
            }

            const [hCols] = await pool.query(`
                SELECT COLUMN_NAME FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'RECOVERY_HANDOVERS'
            `);
            const hColNames = hCols.map(c => c.COLUMN_NAME);
            if (!hColNames.includes('owner_verified_at')) {
                await pool.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_verified_at DATETIME NULL AFTER scheduled_at`);
            }
            if (!hColNames.includes('owner_verification_notes')) {
                await pool.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_verification_notes TEXT NULL AFTER owner_verified_at`);
            }
            if (!hColNames.includes('owner_confirmation_note')) {
                await pool.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_confirmation_note TEXT NULL AFTER confirmed_by`);
            }
            if (!hColNames.includes('owner_evidence_url')) {
                await pool.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_evidence_url VARCHAR(500) NULL AFTER owner_confirmation_note`);
            }

            await pool.query(`
                CREATE TABLE IF NOT EXISTS HANDOVER_FEEDBACK (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    handover_id INT NOT NULL,
                    user_id INT NOT NULL,
                    target_user_id INT NOT NULL,
                    rating INT NOT NULL,
                    feedback_text TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (handover_id) REFERENCES RECOVERY_HANDOVERS(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_user_id) REFERENCES USERS(id) ON DELETE CASCADE,
                    UNIQUE KEY uq_handover_user (handover_id, user_id),
                    INDEX idx_handover_feedback (handover_id),
                    INDEX idx_target_user (target_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } catch (enhErr) {
            console.error('⚠️ Could not verify/add handover enhancement columns/tables:', enhErr.message);
            throw enhErr;
        }

        console.log('✅ Smart Handover tables verified and active.');
    } catch (error) {
        console.error('⚠️ [ensureTables] Error during table bootstrap / verification:', error.message);
        throw error;
    }
};
