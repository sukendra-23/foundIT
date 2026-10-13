import pool from '../src/config/db.js';

const migrate = async () => {
    try {
        console.log('Running Phase 5 Match table migration...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS MATCHES (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lost_item_id INT NOT NULL,
                found_item_id INT NOT NULL,
                score DECIMAL(5, 2) DEFAULT 0.00,
                status ENUM('SUGGESTED', 'CONFIRMED', 'DISMISSED') DEFAULT 'SUGGESTED',
                reviewed_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE CASCADE,
                FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL,
                UNIQUE KEY unique_match (lost_item_id, found_item_id)
            );
        `);

        console.log('MATCHES table created or already exists.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
