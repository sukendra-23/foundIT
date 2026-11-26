import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Fallback secret ONLY used in non-production environments for local testing
const DEV_FALLBACK_SECRET = 'foundit_dev_secret_key_change_in_production_9876543210';
let warnedAboutDevFallback = false;

/**
 * Retrieves and validates the JWT secret key.
 * In production: throws a descriptive error if JWT_SECRET is unset or blank.
 * In non-production: falls back to a development secret and logs a clear warning once.
 */
export const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET?.trim();
    if (secret && secret !== 'your_jwt_secret_here') {
        return secret;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Server configuration error: JWT_SECRET environment variable is missing or unconfigured. ' +
            'Please configure JWT_SECRET in your Railway Backend Service Variables.'
        );
    }

    if (!warnedAboutDevFallback) {
        console.warn(
            '⚠️ [JWT] JWT_SECRET is not configured. Using local development fallback secret. ' +
            'Ensure JWT_SECRET is set in Railway / production environment!'
        );
        warnedAboutDevFallback = true;
    }

    return DEV_FALLBACK_SECRET;
};

/**
 * Validates the JWT configuration at startup.
 * Logs status and alerts the operator if missing in production.
 */
export const validateJwtConfig = () => {
    const secret = process.env.JWT_SECRET?.trim();
    const isProduction = process.env.NODE_ENV === 'production';

    if (!secret || secret === 'your_jwt_secret_here') {
        if (isProduction) {
            console.error(
                '❌ [JWT CONFIG] CRITICAL CONFIGURATION ERROR:\n' +
                '   JWT_SECRET environment variable is not defined or is set to default placeholder!\n' +
                '   - User logins and session tokens will fail.\n' +
                '   - Password reset OTP verification will fail (secretOrPrivateKey must have a value).\n' +
                '   - Protected API endpoints will fail to authenticate.\n' +
                '   ACTION REQUIRED: In Railway Dashboard -> FoundIT Backend -> Variables, add:\n' +
                '   JWT_SECRET=<generate-a-strong-random-string-at-least-32-chars>\n'
            );
            return { valid: false, error: 'JWT_SECRET missing in production' };
        } else {
            console.warn(
                '⚠️ [JWT CONFIG] JWT_SECRET is not configured in development mode. Using fallback secret.'
            );
            return { valid: true, warning: 'Using dev fallback' };
        }
    }

    if (secret.length < 16) {
        console.warn(
            '⚠️ [JWT CONFIG] JWT_SECRET is shorter than 16 characters. A longer, high-entropy secret is recommended.'
        );
    } else {
        console.log('✅ [JWT CONFIG] JWT_SECRET is configured properly.');
    }

    return { valid: true };
};

/**
 * Issues a login authentication token (default 7 days).
 */
export const signToken = (payload, options = {}) => {
    const secret = getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn: '7d', ...options });
};

export const signAuthToken = signToken;

/**
 * Verifies a login authentication token.
 */
export const verifyToken = (token) => {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
};

export const verifyAuthToken = verifyToken;

/**
 * Issues a short-lived password reset token (10 minutes, purpose: password_reset).
 */
export const signResetToken = (payload, options = {}) => {
    const secret = getJwtSecret();
    return jwt.sign(
        { ...payload, purpose: 'password_reset' },
        secret,
        { expiresIn: '10m', ...options }
    );
};

/**
 * Verifies a password reset token. Ensures purpose is 'password_reset'.
 */
export const verifyResetToken = (token) => {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid reset token purpose');
    }
    return decoded;
};
