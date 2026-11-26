import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import lostItemRoutes from './routes/lostItemRoutes.js';
import foundItemRoutes from './routes/foundItemRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import adminClaimRoutes from './routes/adminClaimRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import recoveryRoutes from './routes/recoveryRoutes.js';
import adminRecoveryRoutes from './routes/adminRecoveryRoutes.js';
import handoverRoutes from './routes/handoverRoutes.js';
import adminHandoverRoutes from './routes/adminHandoverRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { getPublicStats } from './controllers/dashboardController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './config/initDb.js';
import { validateEmailConfig } from './services/emailService.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS Configuration ────────────────────────────────────────────────
const defaultAllowedOrigins = [
    'https://foundit-production-2e271b5d.up.railway.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

const allowedOrigins = [...defaultAllowedOrigins];

if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach((item) => {
        const clean = item.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
        if (clean && !allowedOrigins.includes(clean)) {
            allowedOrigins.push(clean);
        }
    });
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health checks)
        if (!origin) {
            return callback(null, true);
        }

        const normalized = origin.trim().replace(/\/+$/, '');
        if (allowedOrigins.includes(normalized)) {
            return callback(null, true);
        }

        console.warn(`⚠️ [CORS] Blocked request from unauthorized origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Retry-After'],
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lost-items', lostItemRoutes);
app.use('/api/found-items', foundItemRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin/claims', adminClaimRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recoveries', recoveryRoutes);
app.use('/api/admin/recoveries', adminRecoveryRoutes);
app.use('/api', handoverRoutes);
app.use('/api/admin/handovers', adminHandoverRoutes);
app.use('/api/users', userRoutes);

// Public platform stats (for Home page hero)
app.get('/api/stats', getPublicStats);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', message: 'Backend and Database are running perfectly!' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed.' });
    }
});

// ─── 404 ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

// ─── Multer Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    // Multer file size / type errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum size is 5MB per image.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum is 5 images per report.' });
    }
    if (err.message && err.message.includes('Unsupported file format')) {
        return res.status(422).json({ message: err.message });
    }
    next(err);
});

// ─── Error Handler (must be last) ────────────────────────────────────
app.use(errorHandler);

// ─── Startup Sequence ────────────────────────────────────────────────
const startServer = async () => {
    try {
        console.log('⏳ Connecting to database...');
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully.');

        console.log('⏳ Checking and initializing base database schema and tables...');
        await initializeDatabase();
        console.log('✅ Database schema and tables verified successfully.');

        console.log('⏳ Validating email service configuration...');
        validateEmailConfig();

        app.listen(PORT, () => {
            console.log(`✅ Server running at http://localhost:${PORT}`);
            console.log(`   Auth  → /api/auth`);
            console.log(`   Dashboard → /api/dashboard`);
            console.log(`   Health → /api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server due to database or table initialization error:');
        console.error(`   Message: ${error.message || '(no message)'}`);
        if (error.code)    console.error(`   Code   : ${error.code}`);
        if (error.errno)   console.error(`   Errno  : ${error.errno}`);
        if (error.address) console.error(`   Address: ${error.address}`);
        if (error.port)    console.error(`   Port   : ${error.port}`);
        process.exit(1);
    }
};

startServer();
