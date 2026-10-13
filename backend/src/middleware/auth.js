import { verifyToken } from '../utils/jwtUtils.js';
import pool from '../config/db.js';

/**
 * Protects routes — requires valid JWT Bearer token.
 * Attaches decoded user to req.user.
 */
export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized. Please log in.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const [rows] = await pool.query(
            'SELECT id, name, email, phone, role, status FROM USERS WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'User no longer exists.' });
        }

        if (rows[0].status !== 'ACTIVE') {
            return res.status(401).json({ message: 'Account is inactive or banned.' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
};

/**
 * Restricts access to ADMIN role only.
 * Must be used AFTER protect middleware.
 */
export const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};
