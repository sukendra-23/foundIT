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
import { ensureTables } from './config/ensureTables.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
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

app.listen(PORT, async () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`   Auth  → /api/auth`);
    console.log(`   Dashboard → /api/dashboard`);
    console.log(`   Health → /api/health`);
    await ensureTables();
});
