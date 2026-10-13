import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'lost_and_found',
        port: process.env.DB_PORT || 3306,
    });

    try {
        console.log('Altering tables...');

        // Disable foreign keys temporarily
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Drop tables to recreate them with new schema
        await connection.query('DROP TABLE IF EXISTS MATCHES, CLAIMS, ITEM_IMAGES, MESSAGES');
        await connection.query('DROP TABLE IF EXISTS LOST_ITEMS, FOUND_ITEMS');

        console.log('Tables dropped. Run initDb.js to recreate them.');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}
run();
