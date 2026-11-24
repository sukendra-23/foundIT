import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { ensureTables } from './ensureTables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the database by executing schema.sql and running ensureTables()
 * Safe and idempotent. Used both at server startup and via `npm run setup-db`.
 */
export async function initializeDatabase() {
    console.log('🚀 [initDb] Starting database initialization...');

    // Step 1: Verify database connection
    console.log('⏳ [initDb] Verifying database connectivity...');
    await pool.query('SELECT 1');
    console.log('✅ [initDb] Database connectivity confirmed.');

    // Step 2: Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`[initDb] schema.sql not found at expected path: ${schemaPath}`);
    }

    console.log(`📄 [initDb] Reading schema from ${schemaPath}...`);
    const schemaRaw = fs.readFileSync(schemaPath, 'utf8');

    // Step 3: Parse and execute schema.sql statements
    const statements = schemaRaw
        .replace(/--.*$/gm, '')
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    console.log(`⏳ [initDb] Executing ${statements.length} SQL statement(s) from schema.sql...`);
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await pool.query(stmt);
        } catch (stmtErr) {
            console.error(`\n❌ [initDb] Failed executing statement #${i + 1}:`);
            console.error(stmt);
            console.error(`\nError: ${stmtErr.message}\n`);
            throw stmtErr;
        }
    }
    console.log('✅ [initDb] All base tables from schema.sql created/verified successfully.');

    // Step 4: Verify prerequisite base tables exist
    const requiredTables = ['USERS', 'LOST_ITEMS', 'FOUND_ITEMS', 'MATCHES', 'CLAIMS'];
    const [tablesCheck] = await pool.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
        [requiredTables]
    );
    const existingSet = new Set(tablesCheck.map(r => r.TABLE_NAME));
    const missingTables = requiredTables.filter(t => !existingSet.has(t));
    if (missingTables.length > 0) {
        throw new Error(`[initDb] Prerequisite tables missing after schema execution: ${missingTables.join(', ')}`);
    }
    console.log('✅ [initDb] Prerequisite base tables verified.');

    // Step 5: Run ensureTables() for Phase 7 & 8 tables and migrations
    console.log('⏳ [initDb] Running ensureTables() bootstrap & verification...');
    await ensureTables();
    console.log('✅ [initDb] ensureTables() completed successfully.');

    console.log('🎉 [initDb] Database initialization finished successfully.');
}

// Standalone execution support (e.g., `npm run setup-db` or `node src/config/initDb.js`)
const isDirectRun = process.argv[1] && (
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('initDb.js')
);

if (isDirectRun) {
    initializeDatabase()
        .then(async () => {
            console.log('🎉 [initDb] Standalone setup complete.');
            await pool.end();
            process.exit(0);
        })
        .catch(async (error) => {
            console.error('❌ [initDb] Standalone setup failed:', error.message);
            try {
                await pool.end();
            } catch (_) {}
            process.exit(1);
        });
}
