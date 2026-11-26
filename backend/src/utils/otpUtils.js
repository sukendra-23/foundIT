import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Uses crypto.randomInt for uniform distribution — NOT Math.random().
 * Range: 100000 to 999999 inclusive.
 */
export const generateOtp = () => {
    return String(crypto.randomInt(100000, 1000000));
};
