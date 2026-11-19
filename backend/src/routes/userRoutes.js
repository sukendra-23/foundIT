import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';
import {
    getProfile,
    updateProfile,
    updateAvatar,
    deleteAvatar,
    sendEmailOtp,
    verifyEmailOtp,
    changePassword,
    downloadMyData,
    getUserAnalytics,
} from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
router.get('/profile',            protect, getProfile);
router.put('/profile',            protect, updateProfile);
router.get('/analytics',          protect, getUserAnalytics);
router.post('/avatar',            protect, upload.single('avatar'), updateAvatar);
router.delete('/avatar',          protect, deleteAvatar);
router.post('/send-email-otp',    protect, sendEmailOtp);
router.post('/verify-email-otp',  protect, verifyEmailOtp);
router.post('/change-password',   protect, changePassword);
router.get('/my-data',            protect, downloadMyData);

export default router;
