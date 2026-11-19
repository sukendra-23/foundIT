import express from 'express';
import {
    getAdminHandovers,
    getAdminHandoverDetail,
    resolveHandoverIssue
} from '../controllers/handoverController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, isAdmin);

// List all handovers with filters & stats
router.get('/', getAdminHandovers);

// Single handover complete inspection details for admin
router.get('/:id', getAdminHandoverDetail);

// Resolve dispute / issue
router.post('/issues/:issueId/resolve', resolveHandoverIssue);

export default router;
