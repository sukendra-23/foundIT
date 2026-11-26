import pool from '../config/db.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { runMatchingForFoundItem } from '../utils/matchEngine.js';

const imagesSelectQuery = `
    COALESCE(
        (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'image_url', i.image_url, 'public_id', i.public_id))
            FROM ITEM_IMAGES i
            WHERE i.found_item_id = f.id
        ),
        JSON_ARRAY()
    ) as images
`;

// Get all found items
export const getFoundItems = async (req, res, next) => {
    try {
        const { q, category, status } = req.query;
        let query = `
            SELECT f.*, u.name as reporter_name, ${imagesSelectQuery}
            FROM FOUND_ITEMS f
            JOIN USERS u ON f.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND f.status = ?`;
            params.push(status);
        }
        if (category) {
            query += ` AND f.category = ?`;
            params.push(category);
        }
        if (q) {
            query += ` AND (f.title LIKE ? OR f.description LIKE ? OR f.location LIKE ?)`;
            const searchPattern = `%${q}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY f.created_at DESC`;

        const [items] = await pool.query(query, params);
        const parsed = items.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || [])
        }));
        res.status(200).json(parsed);
    } catch (error) {
        next(error);
    }
};

// Get single found item
export const getFoundItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [items] = await pool.query(`
            SELECT f.*, u.name as reporter_name, ${imagesSelectQuery}
            FROM FOUND_ITEMS f
            JOIN USERS u ON f.user_id = u.id
            WHERE f.id = ?
        `, [id]);

        if (items.length === 0) {
            return res.status(404).json({ message: 'Found item not found' });
        }
        const item = items[0];
        item.images = typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []);
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

// Create found item
export const createFoundItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { title, category, description, brand, model, color, identifying_details, location, found_date, found_time } = req.body;
        const files = req.files || [];

        const [result] = await connection.query(`
            INSERT INTO FOUND_ITEMS
            (user_id, title, category, description, brand, model, color, identifying_details, location, found_date, found_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
        `, [userId, title, category, description, brand, model, color, identifying_details, location, found_date, found_time || null]);

        const itemId = result.insertId;

        if (files.length > 0) {
            if (!isCloudinaryConfigured()) {
                await connection.rollback();
                return res.status(503).json({
                    message: 'Image storage is unconfigured. Please configure CLOUDINARY_URL in Railway variables.',
                });
            }

            const folder = `lost-and-found/found-items/${itemId}`;
            const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));

            let uploadedAssets = [];
            try {
                uploadedAssets = await Promise.all(uploadPromises);
            } catch (cloudinaryError) {
                console.error('[FOUND ITEM IMAGE UPLOAD]', cloudinaryError);
                await connection.rollback();
                return res.status(500).json({ message: 'Image upload failed. Please try again.' });
            }

            const imageValues = uploadedAssets.map(asset => [null, itemId, asset.secure_url, asset.public_id]);
            await connection.query(`
                INSERT INTO ITEM_IMAGES (lost_item_id, found_item_id, image_url, public_id)
                VALUES ?
            `, [imageValues]);
        }

        await connection.commit();

        // Trigger matching asynchronously
        runMatchingForFoundItem(itemId).catch(err => console.error("Match engine failed:", err));

        res.status(201).json({ message: 'Found item reported successfully', id: itemId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Update found item
export const updateFoundItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;
        const { title, category, description, brand, model, color, identifying_details, location, found_date, found_time, status, removedImages } = req.body;
        const files = req.files || [];

        const [items] = await connection.query('SELECT user_id FROM FOUND_ITEMS WHERE id = ? FOR UPDATE', [id]);
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Found item not found' });
        }
        if (items[0].user_id !== userId && req.user.role !== 'ADMIN') {
            await connection.rollback();
            return res.status(403).json({ message: 'Not authorized to edit this report' });
        }

        await connection.query(`
            UPDATE FOUND_ITEMS
            SET title=?, category=?, description=?, brand=?, model=?, color=?, identifying_details=?, location=?, found_date=?, found_time=?, status=?
            WHERE id = ?
        `, [title, category, description, brand, model, color, identifying_details, location, found_date, found_time || null, status || 'OPEN', id]);

        if (removedImages) {
            const removedIds = JSON.parse(removedImages);
            if (Array.isArray(removedIds) && removedIds.length > 0) {
                const [imagesToDelete] = await connection.query(
                    'SELECT public_id FROM ITEM_IMAGES WHERE found_item_id = ? AND public_id IN (?)',
                    [id, removedIds]
                );

                if (imagesToDelete.length > 0) {
                    const validPublicIds = imagesToDelete.map(img => img.public_id);
                    await Promise.all(validPublicIds.map(pid => deleteFromCloudinary(pid)));
                    await connection.query('DELETE FROM ITEM_IMAGES WHERE found_item_id = ? AND public_id IN (?)', [id, validPublicIds]);
                }
            }
        }

        if (files.length > 0) {
            if (!isCloudinaryConfigured()) {
                await connection.rollback();
                return res.status(503).json({
                    message: 'Image storage is unconfigured. Please configure CLOUDINARY_URL in Railway variables.',
                });
            }

            const [currentImages] = await connection.query('SELECT COUNT(*) as count FROM ITEM_IMAGES WHERE found_item_id = ?', [id]);
            if (currentImages[0].count + files.length > 5) {
                await connection.rollback();
                return res.status(400).json({ message: 'Maximum 5 images allowed per report' });
            }

            const folder = `lost-and-found/found-items/${id}`;
            const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));

            let uploadedAssets = [];
            try {
                uploadedAssets = await Promise.all(uploadPromises);
            } catch (cloudinaryError) {
                await connection.rollback();
                return res.status(500).json({ message: 'Image upload failed. Please try again.' });
            }

            const imageValues = uploadedAssets.map(asset => [null, id, asset.secure_url, asset.public_id]);
            await connection.query(`
                INSERT INTO ITEM_IMAGES (lost_item_id, found_item_id, image_url, public_id)
                VALUES ?
            `, [imageValues]);
        }

        await connection.commit();
        res.status(200).json({ message: 'Found item updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Delete found item
export const deleteFoundItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;

        const [items] = await connection.query('SELECT user_id FROM FOUND_ITEMS WHERE id = ?', [id]);
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Found item not found' });
        }
        if (items[0].user_id !== userId && req.user.role !== 'ADMIN') {
            await connection.rollback();
            return res.status(403).json({ message: 'Not authorized to delete this report' });
        }

        const [images] = await connection.query('SELECT public_id FROM ITEM_IMAGES WHERE found_item_id = ?', [id]);

        await connection.query('DELETE FROM FOUND_ITEMS WHERE id = ?', [id]);
        await connection.commit();

        if (images.length > 0) {
            images.map(img => deleteFromCloudinary(img.public_id));
        }

        res.status(200).json({ message: 'Found item deleted successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
