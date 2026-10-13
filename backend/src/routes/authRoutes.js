import express from 'express';
import {
    register,
    verifyOtpHandler,
    resendOtpHandler,
    login,
    getMe,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtpHandler);
router.post('/resend-otp', resendOtpHandler);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Password reset (public — secured via OTP + short-lived JWT)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
