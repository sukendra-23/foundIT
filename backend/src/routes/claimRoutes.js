import express from 'express';
import {
    checkEligibility,
    createClaim,
    getMyClaims,
    getReceivedClaims,
    getClaimById,
    withdrawClaim,
    submitFinderResponse,
    provideAdditionalInfo
} from '../controllers/claimController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Eligibility check
router.get('/check-eligibility/:foundItemId', protect, checkEligibility);

// Submit claim (supports up to 3 optional evidence documents/images)
router.post('/', protect, upload.array('evidence', 3), createClaim);

// Claimant's claims
router.get('/my', protect, getMyClaims);

// Claims received on items found by current user
router.get('/received', protect, getReceivedClaims);

// Single claim detail
router.get('/:id', protect, getClaimById);

// Claimant withdraws claim
router.post('/:id/withdraw', protect, withdrawClaim);

// Finder submits feedback / requests more info / forwards to admin
router.post('/:id/finder-response', protect, submitFinderResponse);

// Claimant responds with additional information requested by finder
router.post('/:id/additional-info', protect, provideAdditionalInfo);

export default router;
