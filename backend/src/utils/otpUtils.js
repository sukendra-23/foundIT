import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Uses crypto.randomInt for uniform distribution — NOT Math.random().
 */
export const generateOtp = () => {
    return String(crypto.randomInt(100000, 999999));
};
