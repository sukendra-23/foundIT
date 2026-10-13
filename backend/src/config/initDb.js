import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
    let rootConn;

    try {
        // ----------------------------------------------------------------
        // STEP 1: Connect as root (no specific database yet)
        // ----------------------------------------------------------------
        console.log('Connecting to MySQL as root...');
        rootConn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_ROOT_USER,
            password: process.env.DB_ROOT_PASSWORD,
        });
        console.log('Root connection successful.');

        // ----------------------------------------------------------------
        // STEP 2: Create the database if it does not exist
        // ----------------------------------------------------------------
        const dbName = process.env.DB_NAME;
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' is ready.`);

        // ----------------------------------------------------------------
        // STEP 3: Create the app user and grant privileges (idempotent)
        // ----------------------------------------------------------------
        const appUser = process.env.DB_USER;
        const appPass = process.env.DB_PASSWORD;

        // DROP the user if it already exists so we can re-create cleanly
        const [existingUsers] = await rootConn.query(
            `SELECT User FROM mysql.user WHERE User = ? AND Host = 'localhost'`,
            [appUser]
        );

        if (existingUsers.length === 0) {
            await rootConn.query(
                `CREATE USER '${appUser}'@'localhost' IDENTIFIED BY '${appPass}'`
            );
            console.log(`App user '${appUser}' created.`);
        } else {
            // Update the password in case it changed in .env
            await rootConn.query(
                `ALTER USER '${appUser}'@'localhost' IDENTIFIED BY '${appPass}'`
            );
            console.log(`App user '${appUser}' already exists — password refreshed.`);
        }

        await rootConn.query(
            `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${appUser}'@'localhost'`
        );
        await rootConn.query('FLUSH PRIVILEGES');
        console.log(`Privileges granted to '${appUser}' on '${dbName}'.`);

        await rootConn.end();
        rootConn = null;

        // ----------------------------------------------------------------
        // STEP 4: Connect as the app user and run schema
        // ----------------------------------------------------------------
        console.log(`\nConnecting as app user '${appUser}' to run schema...`);
        const appConn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: appUser,
            password: appPass,
            database: dbName,
            multipleStatements: true,
        });

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await appConn.query(schema);
        console.log('All tables created/verified successfully.');

        // ----------------------------------------------------------------
        // STEP 5: Seed the initial Admin user (idempotent)
        // ----------------------------------------------------------------
        const adminEmail = 'admin@lostandfound.com';
        const [rows] = await appConn.query(
            'SELECT id FROM USERS WHERE email = ?',
            [adminEmail]
        );

        if (rows.length === 0) {
            console.log('\nSeeding initial admin user...');
            const passwordHash = await bcrypt.hash('Admin@1234', 10);
            await appConn.query(
                `INSERT INTO USERS (name, email, phone, password_hash, role, email_verified, phone_verified)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['System Admin', adminEmail, '+0000000000', passwordHash, 'ADMIN', true, true]
            );
            console.log('Admin user seeded successfully.');
            console.log('  Email   : admin@lostandfound.com');
            console.log('  Password: Admin@1234  (change this after first login)');
        } else {
            console.log('Admin user already exists — skipping seed.');
        }

        await appConn.end();
        console.log('\nDatabase initialization complete!');

    } catch (error) {
        console.error('\nError during database initialization:', error.message);
        if (rootConn) await rootConn.end();
    }
}

initializeDatabase();
