import pool from '../config/db.js';

const imagesSelectQuery = (idCol) => `
    COALESCE(
        (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'image_url', i.image_url, 'public_id', i.public_id))
            FROM ITEM_IMAGES i
            WHERE i.${idCol} = t.id
        ),
        JSON_ARRAY()
    ) as images
`;

export const globalSearch = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(200).json({ lost: [], found: [] });
        }

        const searchPattern = `%${q}%`;

        // Search LOST
        const [lostItems] = await pool.query(`
            SELECT t.*, u.name as reporter_name, ${imagesSelectQuery('lost_item_id')}
            FROM LOST_ITEMS t
            JOIN USERS u ON t.user_id = u.id
            WHERE (t.title LIKE ? OR t.description LIKE ? OR t.location LIKE ?)
            ORDER BY t.created_at DESC
            LIMIT 20
        `, [searchPattern, searchPattern, searchPattern]);

        // Search FOUND
        const [foundItems] = await pool.query(`
            SELECT t.*, u.name as reporter_name, ${imagesSelectQuery('found_item_id')}
            FROM FOUND_ITEMS t
            JOIN USERS u ON t.user_id = u.id
            WHERE (t.title LIKE ? OR t.description LIKE ? OR t.location LIKE ?)
            ORDER BY t.created_at DESC
            LIMIT 20
        `, [searchPattern, searchPattern, searchPattern]);

        const parseImages = (items) => items.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || [])
        }));

        res.status(200).json({
            lost: parseImages(lostItems),
            found: parseImages(foundItems)
        });
    } catch (error) {
        next(error);
    }
};
