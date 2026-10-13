import express from 'express';
import {
    getAdminClaims,
    getAdminClaimDetail,
    decideClaim,
    getAdminMessageReports,
    reviewMessageReport
} from '../controllers/adminClaimController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication AND ADMIN role
router.use(protect, isAdmin);

// 1. List all claims with filters
router.get('/', getAdminClaims);

// 2. View message moderation reports (Feature F)
router.get('/reports', getAdminMessageReports);

// 3. Review and take action on a message report (Feature F)
router.post('/reports/:id/review', reviewMessageReport);

// 4. View full claim detail with internal notes & audit trail
router.get('/:id', getAdminClaimDetail);

// 5. Final approve or reject decision
router.post('/:id/decide', decideClaim);

export default router;
