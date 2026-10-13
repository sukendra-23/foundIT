import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkImages() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });
    try {
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM ITEM_IMAGES');
        console.log(`ITEM_IMAGES count: ${rows[0].count}`);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await connection.end();
    }
}
checkImages();
