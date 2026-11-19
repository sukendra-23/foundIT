import express from 'express';
import {
    getAdminRecoveries,
    getAdminRecoveryById,
    decideRecovery,
    revokeRecoveryApproval
} from '../controllers/adminRecoveryController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin recovery routes require authentication AND Administrator role
router.use(protect, isAdmin);

// 1. List all recovery submissions with status filters and search
router.get('/', getAdminRecoveries);

// 2. Full recovery comparison details with audit history
router.get('/:id', getAdminRecoveryById);

// 3. Final approve or reject decision
router.post('/:id/decide', decideRecovery);

// 4. Revoke existing approval
router.post('/:id/revoke', revokeRecoveryApproval);

export default router;
