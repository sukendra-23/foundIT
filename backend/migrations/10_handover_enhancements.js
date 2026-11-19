/**
 * Migration 10: Smart Handover Enhancements
 * 1. Adds owner_verified_at, owner_verification_notes, owner_confirmation_note, owner_evidence_url to RECOVERY_HANDOVERS.
 * 2. Creates HANDOVER_FEEDBACK table for star ratings and reviews (1-5 stars).
 * Safe, versioned, and idempotent.
 */

import pool from '../src/config/db.js';

export const runHandoverEnhancementsMigration = async () => {
    let connection;
    try {
        console.log('▶ Starting Migration 10: Handover Enhancements & Feedback System...');
        connection = await pool.getConnection();

        // 1. Add columns to RECOVERY_HANDOVERS safely
        const [existingCols] = await connection.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'RECOVERY_HANDOVERS'
        `);
        const colNames = existingCols.map(c => c.COLUMN_NAME);

        if (!colNames.includes('owner_verified_at')) {
            await connection.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_verified_at DATETIME NULL AFTER scheduled_at`);
            console.log('✅ Added owner_verified_at to RECOVERY_HANDOVERS.');
        }

        if (!colNames.includes('owner_verification_notes')) {
            await connection.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_verification_notes TEXT NULL AFTER owner_verified_at`);
            console.log('✅ Added owner_verification_notes to RECOVERY_HANDOVERS.');
        }

        if (!colNames.includes('owner_confirmation_note')) {
            await connection.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_confirmation_note TEXT NULL AFTER confirmed_by`);
            console.log('✅ Added owner_confirmation_note to RECOVERY_HANDOVERS.');
        }

        if (!colNames.includes('owner_evidence_url')) {
            await connection.query(`ALTER TABLE RECOVERY_HANDOVERS ADD COLUMN owner_evidence_url VARCHAR(500) NULL AFTER owner_confirmation_note`);
            console.log('✅ Added owner_evidence_url to RECOVERY_HANDOVERS.');
        }

        // 2. Create HANDOVER_FEEDBACK table
        await connection.query(`
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
        console.log('✅ Ensured HANDOVER_FEEDBACK table.');

        console.log('✅ Migration 10: Handover Enhancements completed successfully!');
    } catch (error) {
        console.error('❌ Migration 10 failed:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('10_handover_enhancements.js')) {
    runHandoverEnhancementsMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}
