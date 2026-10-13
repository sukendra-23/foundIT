import pool from '../src/config/db.js';

/**
 * Migration 03: Phase 6 Claims & Ownership Verification
 * Backward-compatible migration:
 * - Extends CLAIMS table with workflow fields if they don't exist
 * - Creates CLAIM_EVIDENCE table for private claim attachments
 * - Creates CLAIM_AUDIT_LOGS table for immutable status history
 */
const migrate = async () => {
    try {
        console.log('Running Phase 6 Claims migration...');

        // 1. Ensure CLAIMS table exists with standard base schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLAIMS (
                id INT AUTO_INCREMENT PRIMARY KEY,
                found_item_id INT NOT NULL,
                claimant_id INT NOT NULL,
                proof_description TEXT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                reviewed_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE,
                FOREIGN KEY (claimant_id) REFERENCES USERS(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL
            )
        `);

        // Helper to check if a column exists
        const columnExists = async (tableName, columnName) => {
            const [rows] = await pool.query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
            `, [tableName, columnName]);
            return rows.length > 0;
        };

        // 2. Add Phase 6 columns to CLAIMS if missing
        const columnsToAdd = [
            { name: 'lost_item_id', type: 'INT NULL' },
            { name: 'match_id', type: 'INT NULL' },
            { name: 'claim_reason', type: 'VARCHAR(255) NULL' },
            { name: 'ownership_details', type: 'TEXT NULL' },
            { name: 'identifying_marks', type: 'TEXT NULL' },
            { name: 'lost_date_claimed', type: 'DATE NULL' },
            { name: 'lost_location_claimed', type: 'VARCHAR(255) NULL' },
            { name: 'finder_response', type: "VARCHAR(50) NULL" },
            { name: 'finder_notes', type: 'TEXT NULL' },
            { name: 'finder_responded_at', type: 'DATETIME NULL' },
            { name: 'additional_info_requested', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'additional_info_provided', type: 'TEXT NULL' },
            { name: 'admin_notes', type: 'TEXT NULL' },
            { name: 'decision_reason', type: 'TEXT NULL' },
            { name: 'reviewed_at', type: 'DATETIME NULL' },
        ];

        for (const col of columnsToAdd) {
            const exists = await columnExists('CLAIMS', col.name);
            if (!exists) {
                await pool.query(`ALTER TABLE CLAIMS ADD COLUMN ${col.name} ${col.type}`);
                console.log(`  Added column CLAIMS.${col.name}`);
            }
        }

        // Add foreign keys for lost_item_id and match_id if not already present
        try {
            await pool.query(`
                ALTER TABLE CLAIMS
                ADD CONSTRAINT fk_claims_lost_item
                FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE SET NULL
            `);
            console.log('  Added foreign key fk_claims_lost_item');
        } catch (_) { /* ignore if constraint already exists */ }

        try {
            await pool.query(`
                ALTER TABLE CLAIMS
                ADD CONSTRAINT fk_claims_match
                FOREIGN KEY (match_id) REFERENCES MATCHES(id) ON DELETE SET NULL
            `);
            console.log('  Added foreign key fk_claims_match');
        } catch (_) { /* ignore if constraint already exists */ }

        // Update status column enum or ensure standard status values
        try {
            await pool.query(`
                ALTER TABLE CLAIMS
                MODIFY COLUMN status ENUM('PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN') DEFAULT 'PENDING'
            `);
            console.log('  Updated CLAIMS.status enum');
        } catch (_) {
            await pool.query(`ALTER TABLE CLAIMS MODIFY COLUMN status VARCHAR(50) DEFAULT 'PENDING'`);
            console.log('  Set CLAIMS.status as VARCHAR(50)');
        }

        // 3. Create CLAIM_EVIDENCE table for private attachments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLAIM_EVIDENCE (
                id INT AUTO_INCREMENT PRIMARY KEY,
                claim_id INT NOT NULL,
                image_url TEXT NOT NULL,
                public_id VARCHAR(255) NOT NULL,
                file_type VARCHAR(50) DEFAULT 'image',
                description VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE
            )
        `);
        console.log('  Verified CLAIM_EVIDENCE table');

        // 4. Create CLAIM_AUDIT_LOGS table for immutable status history
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLAIM_AUDIT_LOGS (
                id INT AUTO_INCREMENT PRIMARY KEY,
                claim_id INT NOT NULL,
                performed_by INT NOT NULL,
                from_status VARCHAR(50) NULL,
                to_status VARCHAR(50) NOT NULL,
                action VARCHAR(100) NOT NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES USERS(id) ON DELETE CASCADE
            )
        `);
        console.log('  Verified CLAIM_AUDIT_LOGS table');

        console.log('✅ Phase 6 Claims migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
