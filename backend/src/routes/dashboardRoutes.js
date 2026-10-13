import express from 'express';
import { getDashboardStats, getRecentReports } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected: user must be logged in
router.get('/stats', protect, getDashboardStats);
router.get('/recent', protect, getRecentReports);

export default router;
