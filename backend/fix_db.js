import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (one level up from this file)
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixDb() {
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
        console.log('Connected! Running schema...');

        const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query(schema);
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // Verify tables exist
        const [tables] = await connection.query("SHOW TABLES LIKE 'LOST_ITEMS'");
        if (tables.length > 0) {
            console.log('✅ LOST_ITEMS table exists!');
        }
        const [tables2] = await connection.query("SHOW TABLES LIKE 'FOUND_ITEMS'");
        if (tables2.length > 0) {
            console.log('✅ FOUND_ITEMS table exists!');
        }

        console.log('✅ All tables successfully created/verified!');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await connection.end();
    }
}
fixDb();
