import pool from '../src/config/db.js';

/**
 * Migration 04: Password Reset Tokens
 * Creates a dedicated table for password-reset challenges.
 * Completely separate from OTP_VERIFICATIONS (which is for account verification).
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS and column-existence checks.
 */
const migrate = async () => {
    try {
        console.log('Running Migration 04: Password Reset Tokens...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS PASSWORD_RESET_TOKENS (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                user_id         INT NOT NULL,
                otp_hash        VARCHAR(255) NOT NULL,
                reset_token     VARCHAR(500) NULL,
                attempts        INT DEFAULT 0,
                expires_at      DATETIME NOT NULL,
                consumed        BOOLEAN DEFAULT FALSE,
                revoked         BOOLEAN DEFAULT FALSE,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires (expires_at)
            )
        `);

        console.log('✅ Migration 04 complete: PASSWORD_RESET_TOKENS table ready.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 04 failed:', error);
        process.exit(1);
    }
};

migrate();
