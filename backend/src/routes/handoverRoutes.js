import express from 'express';
import {
    initiateHandover,
    getHandoverByRecoveryId,
    getHandoverById,
    updateHandoverLocation,
    publishHandover,
    publishAllHandoverDetails,
    verifyArrangements,
    startLocationSession,
    updateLocationSession,
    stopLocationSession,
    getCurrentLocation,
    scheduleHandover,
    updateContactConsent,
    confirmReceipt,
    reportIssue,
    submitFeedback,
    getFeedback,
    uploadHandoverEvidence
} from '../controllers/handoverController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.use(protect);

// Recovery-bound handover endpoints
router.post('/recoveries/:recoveryId/handover', initiateHandover);
router.get('/recoveries/:recoveryId/handover', getHandoverByRecoveryId);

// Handover ID endpoints
router.get('/handovers/:id', getHandoverById);
router.patch('/handovers/:id/location', updateHandoverLocation);
router.post('/handovers/:id/publish', publishHandover);
router.post('/handovers/:id/publish-all', publishAllHandoverDetails);
router.post('/handovers/:id/verify-arrangements', verifyArrangements);
router.post('/handovers/:id/location/start', startLocationSession);
router.post('/handovers/:id/location/update', updateLocationSession);
router.post('/handovers/:id/location/stop', stopLocationSession);
router.get('/handovers/:id/location/current', getCurrentLocation);
router.post('/handovers/:id/schedule', scheduleHandover);
router.patch('/handovers/:id/contact-consent', updateContactConsent);
router.post('/handovers/:id/confirm-received', confirmReceipt);
router.post('/handovers/:id/upload-evidence', upload.single('evidence'), uploadHandoverEvidence);
router.post('/handovers/:id/report-issue', reportIssue);
router.post('/handovers/:id/feedback', submitFeedback);
router.get('/handovers/:id/feedback', getFeedback);

export default router;
