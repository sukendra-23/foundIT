import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Relative to backend/migrations

async function runMigration() {
    console.log('Connecting to DB:', process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_NAME);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'lost_found_user',
        password: process.env.DB_PASSWORD || 'secure_password_123',
        database: process.env.DB_NAME || 'lost_and_found',
        port: parseInt(process.env.DB_PORT) || 3307,
        multipleStatements: true
    });

    try {
        console.log('Checking existing ITEM_IMAGES data...');
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM ITEM_IMAGES');
        if (rows[0].count > 0) {
            console.warn(`WARNING: ITEM_IMAGES has ${rows[0].count} records. We are truncating it since Phase 3 didn't officially support images.`);
        }

        console.log('Applying Phase 4 schema migration for ITEM_IMAGES...');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS ITEM_IMAGES');

        const createTableQuery = `
            CREATE TABLE ITEM_IMAGES (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lost_item_id INT NULL,
                found_item_id INT NULL,
                image_url TEXT NOT NULL,
                public_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_item_type CHECK (
                    (lost_item_id IS NOT NULL AND found_item_id IS NULL) OR
                    (found_item_id IS NOT NULL AND lost_item_id IS NULL)
                ),
                FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE CASCADE,
                FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE
            )
        `;
        await connection.query(createTableQuery);
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Phase 4 migration successful. ITEM_IMAGES table recreated with proper foreign keys.');
    } catch (e) {
        console.error('❌ Migration Error:', e.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

runMigration();
