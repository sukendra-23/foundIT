/**
 * Migration 09: Phase 8 — Smart Handover, Live Location & Return Confirmation System
 *
 * Creates the following tables:
 * 1. RECOVERY_HANDOVERS (main lifecycle record linked to approved recovery submission)
 * 2. HANDOVER_LOCATION_SESSIONS (active GPS session with 30m expiry)
 * 3. HANDOVER_AUDIT_LOGS (append-only timeline history)
 * 4. HANDOVER_ISSUES (dispute and problem reporting for admin review)
 *
 * Safe and idempotent.
 */

import pool from '../src/config/db.js';

export const runHandoverMigration = async () => {
    let connection;
    try {
        console.log('▶ Starting Migration 09: Smart Handover System...');
        connection = await pool.getConnection();

        // Check prerequisites
        const [prereqs] = await connection.query(`
            SELECT TABLE_NAME FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ('USERS', 'RECOVERY_SUBMISSIONS')
        `);
        const found = prereqs.map(r => r.TABLE_NAME);
        if (!found.includes('USERS') || !found.includes('RECOVERY_SUBMISSIONS')) {
            throw new Error(`Prerequisites missing! Found: ${found.join(', ')}`);
        }
        console.log('✅ Prerequisites verified: USERS and RECOVERY_SUBMISSIONS present.');

        // 1. RECOVERY_HANDOVERS
        console.log('📦 [1/4] Ensuring RECOVERY_HANDOVERS table...');
        await connection.query(`
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

        // 2. HANDOVER_LOCATION_SESSIONS
        console.log('📦 [2/4] Ensuring HANDOVER_LOCATION_SESSIONS table...');
        await connection.query(`
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

        // 3. HANDOVER_AUDIT_LOGS
        console.log('📦 [3/4] Ensuring HANDOVER_AUDIT_LOGS table...');
        await connection.query(`
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

        // 4. HANDOVER_ISSUES
        console.log('📦 [4/4] Ensuring HANDOVER_ISSUES table...');
        await connection.query(`
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

        console.log('✅ Migration 09: Smart Handover System completed successfully!');
    } catch (error) {
        console.error('❌ Migration 09 failed:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('09_handover_system.js')) {
    runHandoverMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}
