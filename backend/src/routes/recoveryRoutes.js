import express from 'express';
import {
    checkEligibility,
    createRecovery,
    getMySubmissions,
    getReceivedRecoveries,
    getRecoveryById,
    cancelRecovery
} from '../controllers/recoveryController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// All recovery routes require user authentication
router.use(protect);

// Check if current user is eligible to submit a recovery report for a lost item
router.get('/check-eligibility/:lostItemId', checkEligibility);

// Submit recovery report (supports up to 5 photos, max 5MB each, accepting 'photos' or 'evidence')
router.post('/', (req, res, next) => {
    upload.fields([
        { name: 'photos', maxCount: 5 },
        { name: 'evidence', maxCount: 5 }
    ])(req, res, (err) => {
        if (err) return next(err);
        if (req.files) {
            req.files = [
                ...(req.files.photos || []),
                ...(req.files.evidence || [])
            ];
        } else {
            req.files = [];
        }
        next();
    });
}, createRecovery);

// Finder: Submissions created by current user
router.get('/my-submissions', getMySubmissions);

// Owner: Recovery submissions received on lost items reported by current user
router.get('/received', getReceivedRecoveries);

// Single recovery details
router.get('/:id', getRecoveryById);

// Finder cancels their pending submission
router.post('/:id/cancel', cancelRecovery);

export default router;
