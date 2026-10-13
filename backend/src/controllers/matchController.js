import pool from '../config/db.js';

export const getMyMatches = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [matches] = await pool.query(`
            SELECT m.*,
                   l.title as lost_title, l.category as lost_category, l.user_id as lost_user_id,
                   f.title as found_title, f.category as found_category, f.user_id as found_user_id,
                   (SELECT image_url FROM ITEM_IMAGES WHERE lost_item_id = l.id LIMIT 1) as lost_image,
                   (SELECT image_url FROM ITEM_IMAGES WHERE found_item_id = f.id LIMIT 1) as found_image
            FROM MATCHES m
            JOIN LOST_ITEMS l ON m.lost_item_id = l.id
            JOIN FOUND_ITEMS f ON m.found_item_id = f.id
            WHERE (l.user_id = ? OR f.user_id = ?)
              AND m.status = 'SUGGESTED'
            ORDER BY m.score DESC, m.created_at DESC
        `, [userId, userId]);

        res.status(200).json(matches);
    } catch (error) {
        next(error);
    }
};

export const updateMatchStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        if (!['CONFIRMED', 'DISMISSED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Verify ownership
        const [matches] = await pool.query(`
            SELECT m.id, l.user_id as lost_user_id, f.user_id as found_user_id
            FROM MATCHES m
            JOIN LOST_ITEMS l ON m.lost_item_id = l.id
            JOIN FOUND_ITEMS f ON m.found_item_id = f.id
            WHERE m.id = ?
        `, [id]);

        if (matches.length === 0) {
            return res.status(404).json({ message: 'Match not found' });
        }

        if (matches[0].lost_user_id !== userId && matches[0].found_user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await pool.query('UPDATE MATCHES SET status = ?, reviewed_by = ? WHERE id = ?', [status, userId, id]);

        res.status(200).json({ message: 'Match status updated successfully' });
    } catch (error) {
        next(error);
    }
};
