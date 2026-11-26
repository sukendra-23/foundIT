import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { signToken, signResetToken, verifyResetToken } from '../utils/jwtUtils.js';
import { createOtp, verifyOtp, canResendOtp } from '../services/otpService.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { sendOtpSms } from '../services/smsService.js';
import { generateOtp } from '../utils/otpUtils.js';

// ─────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        if (!name || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanPhone = phone.trim();
        const cleanName = name.trim();

        // Check for existing active user with same email or phone
        const [existing] = await pool.query(
            `SELECT id, name, email, phone, status FROM USERS WHERE email = ? OR phone = ?`,
            [cleanEmail, cleanPhone]
        );

        if (existing.length > 0) {
            const found = existing[0];

            // If unverified/inactive — update password/credentials and re-send OTP
            if (found.status === 'INACTIVE') {
                const passwordHash = await bcrypt.hash(String(password), 10);
                await pool.query(
                    `UPDATE USERS SET name = ?, email = ?, phone = ?, password_hash = ?, updated_at = NOW() WHERE id = ?`,
                    [cleanName, cleanEmail, cleanPhone, passwordHash, found.id]
                );

                const otp = await createOtp(found.id);

                try {
                    await sendOtpEmail(cleanEmail, cleanName, otp);
                } catch (emailErr) {
                    console.error('[REGISTER] Email delivery failed:', emailErr.message);
                    return res.status(502).json({
                        message: 'Failed to deliver verification email. Please check your email address or contact support.',
                        userId: found.id,
                        email: cleanEmail,
                    });
                }

                sendOtpSms(cleanPhone, otp).catch(() => {});

                return res.status(200).json({
                    message: 'Account pending verification. A new OTP has been sent to your email.',
                    userId: found.id,
                    email: cleanEmail,
                });
            }

            if (found.email === cleanEmail) {
                return res.status(409).json({ message: 'This email is already registered.' });
            }
            return res.status(409).json({ message: 'This phone number is already registered.' });
        }

        // Hash password and create INACTIVE user
        const passwordHash = await bcrypt.hash(String(password), 10);
        const [result] = await pool.query(
            `INSERT INTO USERS (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'USER', 'INACTIVE')`,
            [cleanName, cleanEmail, cleanPhone, passwordHash]
        );

        const userId = result.insertId;

        // Generate ONE OTP — send to email
        const otp = await createOtp(userId);

        try {
            await sendOtpEmail(cleanEmail, cleanName, otp);
        } catch (emailErr) {
            console.error('[REGISTER] Email delivery failed:', emailErr.message);
            return res.status(502).json({
                message: 'Account created, but failed to deliver verification email. Please check your email address or try resending OTP.',
                userId,
                email: cleanEmail,
            });
        }

        sendOtpSms(cleanPhone, otp).catch(() => {});

        return res.status(201).json({
            message: 'Registration successful. OTP sent to your email.',
            userId,
            email: cleanEmail,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────────────────────────────
export const verifyOtpHandler = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ message: 'User ID and OTP are required.' });
        }

        const result = await verifyOtp(Number(userId), String(otp).trim());

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Activate account
        await pool.query(
            `UPDATE USERS SET status = 'ACTIVE', email_verified = TRUE, phone_verified = TRUE, updated_at = NOW() WHERE id = ?`,
            [userId]
        );

        return res.status(200).json({ message: 'Account verified successfully. You can now log in.' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────────────────────────────
export const resendOtpHandler = async (req, res, next) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const [users] = await pool.query(
            'SELECT id, name, email, phone, status FROM USERS WHERE id = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];
        if (user.status === 'ACTIVE') {
            return res.status(400).json({ message: 'Account is already verified.' });
        }

        // Enforce resend cooldown
        const cooldown = await canResendOtp(userId);
        if (!cooldown.canResend) {
            return res.status(429).json({
                message: `Please wait ${cooldown.waitSeconds} seconds before requesting a new OTP.`,
                waitSeconds: cooldown.waitSeconds,
            });
        }

        const otp = await createOtp(userId);

        try {
            await sendOtpEmail(user.email, user.name, otp);
        } catch (emailErr) {
            console.error('[RESEND OTP] Email delivery failed:', emailErr.message);
            return res.status(502).json({
                message: 'Failed to deliver verification email. Please try again.',
            });
        }

        sendOtpSms(user.phone, otp).catch(() => {});

        return res.status(200).json({ message: 'New OTP sent to your email.' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// LOGIN (supports email OR phone number)
// ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const identifier = String(email).trim();
        const isEmail = identifier.includes('@');

        // Look up by email or phone
        const [users] = await pool.query(
            isEmail
                ? 'SELECT * FROM USERS WHERE email = ?'
                : 'SELECT * FROM USERS WHERE phone = ? OR email = ?',
            isEmail ? [identifier.toLowerCase()] : [identifier, identifier.toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Account does not exist. Please register first.' });
        }

        const user = users[0];

        // 1. Verify password against stored bcrypt hash
        const passwordMatch = await bcrypt.compare(String(password), user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        // 2. Check if account is verified
        if (user.status === 'INACTIVE') {
            return res.status(403).json({
                message: 'Account not verified. Please check your email for the OTP.',
                needsVerification: true,
                userId: user.id,
                email: user.email,
            });
        }

        if (user.status === 'BANNED') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }

        const token = signToken({ id: user.id, role: user.role });

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// GET ME (protected)
// ─────────────────────────────────────────────────────────────────────
export const getMe = (req, res) => {
    res.status(200).json({ user: req.user });
};

// ─────────────────────────────────────────────────────────────────────
// LOGOUT (stateless — client deletes token)
// ─────────────────────────────────────────────────────────────────────
export const logout = (req, res) => {
    res.status(200).json({ message: 'Logged out successfully.' });
};

// ─────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — Step 1: request OTP (no user enumeration)
// ─────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
    const GENERIC_OK = { message: 'If an account with that email exists, a reset code has been sent.' };
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'A valid email address is required.' });
        }

        // Look up user — silently succeed if not found (no enumeration)
        const [rows] = await pool.query(
            'SELECT id, name, status FROM USERS WHERE email = ? LIMIT 1',
            [email.toLowerCase().trim()]
        );
        if (!rows.length || rows[0].status !== 'ACTIVE') {
            // Return same generic response regardless
            return res.status(200).json(GENERIC_OK);
        }
        const user = rows[0];

        // Revoke any existing unconsumed tokens for this user
        await pool.query(
            'UPDATE PASSWORD_RESET_TOKENS SET revoked = TRUE WHERE user_id = ? AND consumed = FALSE AND revoked = FALSE',
            [user.id]
        );

        // Generate OTP, hash it
        const otp = generateOtp();
        const saltRounds = 10;
        const otpHash = await bcrypt.hash(otp, saltRounds);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
            'INSERT INTO PASSWORD_RESET_TOKENS (user_id, otp_hash, expires_at) VALUES (?, ?, ?)',
            [user.id, otpHash, expiresAt]
        );

        // Fire email (non-blocking failure = still return generic OK to avoid oracle)
        try {
            await sendPasswordResetEmail(email.toLowerCase().trim(), user.name, otp);
        } catch (emailErr) {
            console.error('[FORGOT PASSWORD] Email delivery failed:', emailErr.message);
        }

        return res.status(200).json(GENERIC_OK);
    } catch (err) {
        console.error('[FORGOT PASSWORD]', err);
        return res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
};

// ─────────────────────────────────────────────────────────────────────
// VERIFY RESET OTP — Step 2: returns short-lived reset token on success
// ─────────────────────────────────────────────────────────────────────
export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        // Find user
        const [userRows] = await pool.query(
            'SELECT id, name FROM USERS WHERE email = ? AND status = ? LIMIT 1',
            [email.toLowerCase().trim(), 'ACTIVE']
        );
        if (!userRows.length) {
            return res.status(400).json({ message: 'Invalid or expired reset code.' });
        }
        const user = userRows[0];

        // Find the latest unconsumed, unrevoked token for this user
        const [tokenRows] = await pool.query(
            `SELECT id, otp_hash, attempts, expires_at
             FROM PASSWORD_RESET_TOKENS
             WHERE user_id = ? AND consumed = FALSE AND revoked = FALSE
             ORDER BY created_at DESC LIMIT 1`,
            [user.id]
        );
        if (!tokenRows.length) {
            return res.status(400).json({ message: 'Invalid or expired reset code.' });
        }
        const tokenRow = tokenRows[0];

        // Check expiry
        if (new Date() > new Date(tokenRow.expires_at)) {
            await pool.query('UPDATE PASSWORD_RESET_TOKENS SET revoked = TRUE WHERE id = ?', [tokenRow.id]);
            return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
        }

        const MAX_ATTEMPTS = 5;
        if (tokenRow.attempts >= MAX_ATTEMPTS) {
            await pool.query('UPDATE PASSWORD_RESET_TOKENS SET revoked = TRUE WHERE id = ?', [tokenRow.id]);
            return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new reset code.' });
        }

        // Verify OTP
        const isValid = await bcrypt.compare(String(otp), tokenRow.otp_hash);
        if (!isValid) {
            await pool.query('UPDATE PASSWORD_RESET_TOKENS SET attempts = attempts + 1 WHERE id = ?', [tokenRow.id]);
            const remaining = MAX_ATTEMPTS - (tokenRow.attempts + 1);
            return res.status(400).json({
                message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
            });
        }

        // Issue short-lived reset token (10m, purpose-scoped, not a login JWT)
        const resetToken = signResetToken({
            id: user.id,
            tokenRowId: tokenRow.id,
        });

        // Store token in the row (so resetPassword can verify it was issued by us)
        await pool.query(
            'UPDATE PASSWORD_RESET_TOKENS SET reset_token = ?, attempts = attempts + 1 WHERE id = ?',
            [resetToken, tokenRow.id]
        );

        return res.status(200).json({
            message: 'Code verified. You may now set a new password.',
            resetToken,
        });
    } catch (err) {
        console.error('[VERIFY RESET OTP]', err);
        if (err.message && err.message.includes('JWT_SECRET')) {
            return res.status(500).json({
                message: 'Server authentication configuration error. Please contact administrator.',
            });
        }
        return res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
};

// ─────────────────────────────────────────────────────────────────────
// RESET PASSWORD — Step 3: consume token and update password
// ─────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;
        if (!resetToken || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Verify the JWT (throws if expired/invalid)
        let decoded;
        try {
            decoded = verifyResetToken(resetToken);
        } catch (jwtErr) {
            if (jwtErr.name === 'TokenExpiredError') {
                return res.status(400).json({ message: 'Reset session has expired. Please start over.' });
            }
            return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new code.' });
        }

        // Find the matching unconsumed token row by id and user id
        const [rows] = await pool.query(
            `SELECT id FROM PASSWORD_RESET_TOKENS
             WHERE id = ? AND user_id = ? AND consumed = FALSE AND revoked = FALSE
             LIMIT 1`,
            [decoded.tokenRowId, decoded.id]
        );
        if (!rows.length) {
            return res.status(400).json({ message: 'Reset link has already been used or expired. Please request a new one.' });
        }

        // Hash new password and update atomically with consuming the token
        const passwordHash = await bcrypt.hash(newPassword, 12);

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query('UPDATE USERS SET password_hash = ? WHERE id = ?', [passwordHash, decoded.id]);
            await conn.query('UPDATE PASSWORD_RESET_TOKENS SET consumed = TRUE WHERE id = ?', [rows[0].id]);
            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        return res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (err) {
        console.error('[RESET PASSWORD]', err);
        return res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
};
