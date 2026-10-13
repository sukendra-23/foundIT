/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Dependency-free, lightweight, self-cleaning rate limiter.
 */

// Memory stores for tracking request timestamps: Map<key, number[]>
const messageRateMap = new Map();
const reportRateMap = new Map();

// Periodic garbage collection every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();

    // Clean message rate map (retention 2 minutes)
    for (const [key, timestamps] of messageRateMap.entries()) {
        const active = timestamps.filter(t => now - t < 120000);
        if (active.length === 0) {
            messageRateMap.delete(key);
        } else {
            messageRateMap.set(key, active);
        }
    }

    // Clean report rate map (retention 30 minutes)
    for (const [key, timestamps] of reportRateMap.entries()) {
        const active = timestamps.filter(t => now - t < 1800000);
        if (active.length === 0) {
            reportRateMap.delete(key);
        } else {
            reportRateMap.set(key, active);
        }
    }
}, 5 * 60 * 1000);

/**
 * Factory for creating sliding-window rate limiters
 * @param {Map} store - Storage map
 * @param {number} maxRequests - Maximum allowed requests in the window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} message - Error message on limit exceed
 */
const createRateLimiter = (store, maxRequests, windowMs, message) => {
    return (req, res, next) => {
        // Track by authenticated user ID if available, otherwise by client IP
        const key = req.user?.id ? `user_${req.user.id}` : `ip_${req.ip || req.connection.remoteAddress}`;
        const now = Date.now();

        const timestamps = store.get(key) || [];
        // Filter out timestamps outside the active window
        const windowStart = now - windowMs;
        const validTimestamps = timestamps.filter(t => t > windowStart);

        if (validTimestamps.length >= maxRequests) {
            const oldestValid = validTimestamps[0];
            const retryAfterSec = Math.ceil((oldestValid + windowMs - now) / 1000);

            res.set('Retry-After', String(retryAfterSec));
            return res.status(429).json({
                message,
                retryAfter: retryAfterSec
            });
        }

        validTimestamps.push(now);
        store.set(key, validTimestamps);
        next();
    };
};

/**
 * Message sending rate limiter: max 25 messages per 60 seconds per user
 */
export const messageRateLimiter = createRateLimiter(
    messageRateMap,
    25,
    60 * 1000,
    'You are sending messages too quickly. Please wait a moment before sending another message.'
);

/**
 * Report submission rate limiter: max 5 reports per 15 minutes per user
 */
export const reportRateLimiter = createRateLimiter(
    reportRateMap,
    5,
    15 * 60 * 1000,
    'Too many reports submitted. Please wait a few minutes before submitting another report.'
);
