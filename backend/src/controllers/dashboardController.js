import pool from '../config/db.js';

/**
 * GET /api/dashboard/stats
 * Returns authenticated user's real activity counts from the DB.
 */
export const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [[lostCount], [foundCount], [claimCount], [returnedCount]] = await Promise.all([
            pool.query(`SELECT COUNT(*) AS count FROM LOST_ITEMS WHERE user_id = ?`, [userId]),
            pool.query(`SELECT COUNT(*) AS count FROM FOUND_ITEMS WHERE user_id = ?`, [userId]),
            pool.query(`SELECT COUNT(*) AS count FROM CLAIMS WHERE claimant_id = ? AND status IN ('PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW')`, [userId]),
            pool.query(
                `SELECT COUNT(*) AS count FROM LOST_ITEMS WHERE user_id = ? AND status = 'RETURNED'`,
                [userId]
            ),
        ]);

        return res.status(200).json({
            stats: {
                lostReports: lostCount[0].count,
                foundReports: foundCount[0].count,
                activeClaims: claimCount[0].count,
                returnedItems: returnedCount[0].count,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/dashboard/recent
 * Returns the user's 5 most recent lost + found reports combined, summarised.
 */
export const getRecentReports = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [lostRows] = await pool.query(
            `SELECT id, title, category, location, status, created_at, 'LOST' as type FROM LOST_ITEMS WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );
        const [foundRows] = await pool.query(
            `SELECT id, title, category, location, status, created_at, 'FOUND' as type FROM FOUND_ITEMS WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );

        const combined = [...lostRows, ...foundRows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        return res.status(200).json({ reports: combined });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/stats (public)
 * Returns platform-wide totals for the Home page hero section.
 */
export const getPublicStats = async (req, res, next) => {
    try {
        const [[totalLost], [totalFound], [totalReturned], [totalUsers]] = await Promise.all([
            pool.query(`SELECT COUNT(*) AS count FROM LOST_ITEMS`),
            pool.query(`SELECT COUNT(*) AS count FROM FOUND_ITEMS`),
            pool.query(`SELECT COUNT(*) AS count FROM LOST_ITEMS WHERE status = 'RETURNED'`),
            pool.query(`SELECT COUNT(*) AS count FROM USERS WHERE status = 'ACTIVE' AND role = 'USER'`),
        ]);

        return res.status(200).json({
            totalItems: totalLost[0].count + totalFound[0].count,
            totalReturned: totalReturned[0].count,
            totalUsers: totalUsers[0].count,
        });
    } catch (error) {
        next(error);
    }
};
