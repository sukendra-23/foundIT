/**
 * Migration 08: Phase 7 Extension — Lost Item Recovery Workflow
 * Authoritative migration for creating recovery workflow tables:
 * 1. RECOVERY_SUBMISSIONS (with ON DELETE RESTRICT on lost_item_id and finder_id, status NOT NULL, cross-finder unique active key)
 * 2. RECOVERY_IMAGES (with ON DELETE CASCADE on recovery_id)
 * 3. RECOVERY_AUDIT_LOGS (append-only audit history, ON DELETE RESTRICT)
 * 4. RECOVERY_CONVERSATIONS (dedicated recovery conversation table, ON DELETE RESTRICT)
 * 5. RECOVERY_MESSAGES (messages exchanged between finder and lost-item reporter)
 * 6. RECOVERY_MESSAGE_REPORTS (moderation reporting with unique reporter constraint)
 *
 * Safe and idempotent: checks existing schema and handles reruns cleanly.
 * Never drops or truncates existing tables or data.
 */

import pool from '../src/config/db.js';

const run = async () => {
    let connection;
    try {
        console.log('▶ Starting Migration 08: Phase 7 Lost Item Recovery Workflow...');

        connection = await pool.getConnection();

        // 1. Pre-flight check: ensure parent prerequisite tables exist
        console.log('🔍 Performing pre-flight check on database schema...');
        const [prereqCheck] = await connection.query(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ('USERS', 'LOST_ITEMS')
        `);

        const foundPrereqs = prereqCheck.map(r => r.TABLE_NAME);
        if (!foundPrereqs.includes('USERS') || !foundPrereqs.includes('LOST_ITEMS')) {
            throw new Error(`Prerequisite tables missing! Expected USERS and LOST_ITEMS, found: ${foundPrereqs.join(', ')}`);
        }
        console.log('✅ Prerequisites verified: USERS and LOST_ITEMS are present.');

        // 2. Table: RECOVERY_SUBMISSIONS
        console.log('📦 [1/6] Ensuring RECOVERY_SUBMISSIONS table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_SUBMISSIONS (
                id                      INT AUTO_INCREMENT PRIMARY KEY,
                lost_item_id            INT NOT NULL,
                finder_id               INT NOT NULL,
                item_name               VARCHAR(255) NOT NULL,
                brand                   VARCHAR(100) NULL,
                model                   VARCHAR(100) NULL,
                color                   VARCHAR(50) NULL,
                identifying_marks       TEXT NULL,
                found_date              DATE NOT NULL,
                found_time              TIME NULL,
                found_location          VARCHAR(255) NOT NULL,
                city                    VARCHAR(100) NULL,
                location_description   TEXT NULL,
                item_condition          VARCHAR(100) NULL,
                additional_information  TEXT NULL,
                status                  ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                decision_reason         TEXT NULL COMMENT 'Public decision reason visible only to finder, owner, and admin',
                admin_notes             TEXT NULL COMMENT 'Strictly confidential internal notes for administrators',
                reviewed_by             INT NULL,
                reviewed_at             DATETIME NULL,
                created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                -- Cross-finder uniqueness: only ONE active submission allowed per lost item
                active_recovery_key     INT GENERATED ALWAYS AS (
                    IF(status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED'), lost_item_id, NULL)
                ) STORED,

                FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE RESTRICT,
                FOREIGN KEY (finder_id)    REFERENCES USERS(id) ON DELETE RESTRICT,
                FOREIGN KEY (reviewed_by)  REFERENCES USERS(id) ON DELETE SET NULL,

                INDEX idx_rec_lost_item (lost_item_id),
                INDEX idx_rec_finder    (finder_id),
                INDEX idx_rec_status    (status),
                INDEX idx_rec_created   (created_at),
                UNIQUE KEY uq_active_recovery_lost_item (active_recovery_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [1/6] RECOVERY_SUBMISSIONS ready.');

        // 3. Table: RECOVERY_IMAGES
        console.log('📦 [2/6] Ensuring RECOVERY_IMAGES table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_IMAGES (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                recovery_id   INT NOT NULL,
                image_url     TEXT NOT NULL,
                public_id     VARCHAR(255) NOT NULL,
                file_type     VARCHAR(50) DEFAULT 'image',
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recovery_id) REFERENCES RECOVERY_SUBMISSIONS(id) ON DELETE CASCADE,
                INDEX idx_rec_img_recovery (recovery_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [2/6] RECOVERY_IMAGES ready.');

        // 4. Table: RECOVERY_AUDIT_LOGS (Append-only)
        console.log('📦 [3/6] Ensuring RECOVERY_AUDIT_LOGS table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_AUDIT_LOGS (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                recovery_id   INT NOT NULL,
                performed_by  INT NOT NULL,
                from_status   VARCHAR(50) NULL,
                to_status     VARCHAR(50) NOT NULL,
                action        VARCHAR(100) NOT NULL,
                notes         TEXT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recovery_id)  REFERENCES RECOVERY_SUBMISSIONS(id) ON DELETE RESTRICT,
                FOREIGN KEY (performed_by) REFERENCES USERS(id) ON DELETE RESTRICT,
                INDEX idx_rec_audit_recovery (recovery_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [3/6] RECOVERY_AUDIT_LOGS ready.');

        // 5. Table: RECOVERY_CONVERSATIONS
        console.log('📦 [4/6] Ensuring RECOVERY_CONVERSATIONS table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_CONVERSATIONS (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                recovery_id     INT NOT NULL UNIQUE,
                reporter_id     INT NOT NULL COMMENT 'Owner of the lost item',
                finder_id       INT NOT NULL COMMENT 'Person who found the item',
                last_message_at TIMESTAMP NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (recovery_id) REFERENCES RECOVERY_SUBMISSIONS(id) ON DELETE RESTRICT,
                FOREIGN KEY (reporter_id) REFERENCES USERS(id) ON DELETE RESTRICT,
                FOREIGN KEY (finder_id)   REFERENCES USERS(id) ON DELETE RESTRICT,
                INDEX idx_rec_conv_recovery (recovery_id),
                INDEX idx_rec_conv_reporter (reporter_id),
                INDEX idx_rec_conv_finder   (finder_id),
                INDEX idx_rec_conv_last_msg (last_message_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [4/6] RECOVERY_CONVERSATIONS ready.');

        // 6. Table: RECOVERY_MESSAGES
        console.log('📦 [5/6] Ensuring RECOVERY_MESSAGES table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_MESSAGES (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id       INT NOT NULL,
                message_text    TEXT NOT NULL,
                is_read         BOOLEAN DEFAULT FALSE,
                read_at         DATETIME NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES RECOVERY_CONVERSATIONS(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id)       REFERENCES USERS(id) ON DELETE RESTRICT,
                INDEX idx_rec_msg_conv    (conversation_id),
                INDEX idx_rec_msg_sender  (sender_id),
                INDEX idx_rec_msg_read    (is_read),
                INDEX idx_rec_msg_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [5/6] RECOVERY_MESSAGES ready.');

        // 7. Table: RECOVERY_MESSAGE_REPORTS
        console.log('📦 [6/6] Ensuring RECOVERY_MESSAGE_REPORTS table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RECOVERY_MESSAGE_REPORTS (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                message_id       INT NOT NULL,
                conversation_id  INT NOT NULL,
                reporter_id      INT NOT NULL,
                reported_user_id INT NOT NULL,
                reason           VARCHAR(50) NOT NULL COMMENT 'HARASSMENT | SPAM | SCAM_FRAUD | INAPPROPRIATE | OTHER',
                details          TEXT NULL,
                status           VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | REVIEWED | DISMISSED | ACTION_TAKEN',
                reviewed_by      INT NULL,
                reviewed_at      DATETIME NULL,
                admin_notes      TEXT NULL,
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_rec_msg_rep_msg    (message_id),
                INDEX idx_rec_msg_rep_conv   (conversation_id),
                INDEX idx_rec_msg_rep_status (status),
                UNIQUE KEY uq_recovery_message_reporter (message_id, reporter_id),
                FOREIGN KEY (message_id)       REFERENCES RECOVERY_MESSAGES(id) ON DELETE CASCADE,
                FOREIGN KEY (conversation_id)  REFERENCES RECOVERY_CONVERSATIONS(id) ON DELETE CASCADE,
                FOREIGN KEY (reporter_id)      REFERENCES USERS(id) ON DELETE RESTRICT,
                FOREIGN KEY (reported_user_id) REFERENCES USERS(id) ON DELETE RESTRICT,
                FOREIGN KEY (reviewed_by)      REFERENCES USERS(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ [6/6] RECOVERY_MESSAGE_REPORTS ready.');

        console.log('\n🎉 Migration 08 completed successfully! All 6 Phase 7 Recovery Workflow tables are verified and active.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration 08 failed with error:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        if (connection) connection.release();
        await pool.end();
    }
};

run();
