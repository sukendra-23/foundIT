/**
 * Global error handling middleware.
 * Always the last middleware registered in server.js.
 */
export const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error.';

    res.status(statusCode).json({
        message,
        // Only include stack traces in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
