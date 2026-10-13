import pool from '../src/config/db.js';

/**
 * Migration 05: Phase 7 — In-App Messaging
 * Creates CLAIM_CONVERSATIONS and CLAIM_MESSAGES tables.
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS and checks constraints.
 */
const migrate = async () => {
    try {
        console.log('Running Migration 05: Phase 7 Messaging...');

        // 1. CLAIM_CONVERSATIONS table
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
            )
        `);

        // 2. CLAIM_MESSAGES table
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
            )
        `);

        console.log('✅ Migration 05 complete: CLAIM_CONVERSATIONS and CLAIM_MESSAGES tables ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 05 failed:', error);
        process.exit(1);
    }
};

migrate();
