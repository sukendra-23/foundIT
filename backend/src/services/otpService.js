import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { generateOtp } from '../utils/otpUtils.js';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Creates a new OTP for a user.
 * Invalidates any existing PENDING OTPs first.
 * Returns the plain OTP (for sending via email/SMS). Never stored plain.
 */
export const createOtp = async (userId) => {
    // Expire all existing pending OTPs for this user
    await pool.query(
        `UPDATE OTP_VERIFICATIONS SET status = 'EXPIRED' WHERE user_id = ? AND status = 'PENDING'`,
        [userId]
    );

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
        `INSERT INTO OTP_VERIFICATIONS (user_id, otp_hash, expires_at) VALUES (?, ?, ?)`,
        [userId, otpHash, expiresAt]
    );

    return otp;
};

/**
 * Verifies a submitted OTP against the stored hash.
 * Enforces expiry and attempt limits.
 */
export const verifyOtp = async (userId, otp) => {
    const [rows] = await pool.query(
        `SELECT * FROM OTP_VERIFICATIONS
         WHERE user_id = ? AND status = 'PENDING'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    if (rows.length === 0) {
        return { success: false, error: 'No pending OTP found. Please request a new one.' };
    }

    const record = rows[0];

    if (new Date() > new Date(record.expires_at)) {
        await pool.query(
            `UPDATE OTP_VERIFICATIONS SET status = 'EXPIRED' WHERE id = ?`,
            [record.id]
        );
        return { success: false, error: 'OTP has expired. Please request a new one.', expired: true };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
        return { success: false, error: 'Too many failed attempts. Please request a new OTP.', maxAttempts: true };
    }

    // Increment attempt counter before checking (prevents timing attacks)
    await pool.query(
        `UPDATE OTP_VERIFICATIONS SET attempts = attempts + 1 WHERE id = ?`,
        [record.id]
    );

    const isValid = await bcrypt.compare(String(otp), record.otp_hash);

    if (!isValid) {
        const attemptsLeft = MAX_ATTEMPTS - record.attempts - 1;
        return {
            success: false,
            error: attemptsLeft > 0
                ? `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
                : 'Too many failed attempts. Please request a new OTP.',
        };
    }

    await pool.query(
        `UPDATE OTP_VERIFICATIONS SET status = 'VERIFIED' WHERE id = ?`,
        [record.id]
    );

    return { success: true };
};

/**
 * Checks if enough time has passed since the last OTP was sent.
 * Returns { canResend: true } or { canResend: false, waitSeconds: N }
 */
export const canResendOtp = async (userId) => {
    const [rows] = await pool.query(
        `SELECT created_at FROM OTP_VERIFICATIONS
         WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    if (rows.length === 0) return { canResend: true };

    const secondsSince = (Date.now() - new Date(rows[0].created_at).getTime()) / 1000;

    if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        return {
            canResend: false,
            waitSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince),
        };
    }

    return { canResend: true };
};
