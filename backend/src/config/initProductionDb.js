import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { ensureTables } from './ensureTables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If called with --help, print usage and exit immediately without touching MySQL
if (process.argv.includes('--help')) {
    console.log(`
FoundiT Production Database Initialization Script
=================================================
Usage:
  npm run setup-production-db
  node src/config/initProductionDb.js

Description:
  Executes schema.sql and runs ensureTables() using the configured application
  pool from src/config/db.js.
  Safe for one-time initialization of a fresh Railway MySQL database.
`);
    process.exit(0);
}

async function initProductionDb() {
    console.log('🚀 Starting FoundiT production database setup...');
    let initError = null;

    try {
        // Step 1: Verify database connectivity
        console.log('⏳ Verifying database connection (SELECT 1)...');
        await pool.query('SELECT 1');
        console.log('✅ Connected to database successfully.');

        // Step 2: Read and execute schema.sql statement-by-statement
        const schemaPath = path.join(__dirname, 'schema.sql');
        console.log(`📄 Reading schema from ${schemaPath}...`);
        const schemaRaw = fs.readFileSync(schemaPath, 'utf8');

        const statements = schemaRaw
            .replace(/--.*$/gm, '')
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`⏳ Executing ${statements.length} SQL statement(s) from schema.sql...`);
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await pool.query(stmt);
            } catch (stmtErr) {
                console.error(`\n❌ Failed executing statement #${i + 1}:`);
                console.error(stmt);
                console.error(`\nError: ${stmtErr.message}\n`);
                throw stmtErr;
            }
        }
        console.log('✅ All tables from schema.sql created/verified successfully.');

        // Step 3: Run ensureTables() to verify & bootstrap Phase 7 & 8 tables
        console.log('⏳ Running ensureTables() bootstrap & verification...');
        await ensureTables();
        console.log('✅ ensureTables() completed successfully.');

        console.log('\n🎉 Production database setup finished successfully!');
    } catch (error) {
        initError = error;
        console.error('\n❌ Production database setup failed:', error.message);
        if (error.sql) {
            console.error('SQL snippet:', error.sql.substring(0, 200));
        }
    } finally {
        try {
            await pool.end();
            console.log('🔒 Database connection pool closed.');
        } catch (poolCloseErr) {
            console.error('⚠️ Warning: Error closing database pool:', poolCloseErr.message);
        }

        if (initError) {
            process.exit(1);
        }
    }
}

initProductionDb();
