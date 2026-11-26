import pool from '../config/db.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { runMatchingForLostItem } from '../utils/matchEngine.js';

// Helper to safely get images JSON array
const imagesSelectQuery = `
    COALESCE(
        (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'image_url', i.image_url, 'public_id', i.public_id))
            FROM ITEM_IMAGES i
            WHERE i.lost_item_id = l.id
        ),
        JSON_ARRAY()
    ) as images
`;

// Get all lost items (with search/filter support)
export const getLostItems = async (req, res, next) => {
    try {
        const { q, category, status } = req.query;
        let query = `
            SELECT l.*, u.name as reporter_name, ${imagesSelectQuery}
            FROM LOST_ITEMS l
            JOIN USERS u ON l.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND l.status = ?`;
            params.push(status);
        }
        if (category) {
            query += ` AND l.category = ?`;
            params.push(category);
        }
        if (q) {
            query += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ?)`;
            const searchPattern = `%${q}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY l.created_at DESC`;

        const [items] = await pool.query(query, params);

        // Ensure images is always a parsed array
        const parsed = items.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || [])
        }));
        res.status(200).json(parsed);
    } catch (error) {
        next(error);
    }
};

// Get single lost item
export const getLostItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [items] = await pool.query(`
            SELECT l.*, u.name as reporter_name, ${imagesSelectQuery}
            FROM LOST_ITEMS l
            JOIN USERS u ON l.user_id = u.id
            WHERE l.id = ?
        `, [id]);

        if (items.length === 0) {
            return res.status(404).json({ message: 'Lost item not found' });
        }
        const item = items[0];
        item.images = typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []);
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

// Create lost item
export const createLostItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { title, category, description, brand, model, color, identifying_details, location, lost_date, lost_time } = req.body;
        const files = req.files || [];

        // 1. Insert Item
        const [result] = await connection.query(`
            INSERT INTO LOST_ITEMS
            (user_id, title, category, description, brand, model, color, identifying_details, location, lost_date, lost_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
        `, [userId, title, category, description, brand, model, color, identifying_details, location, lost_date, lost_time || null]);

        const itemId = result.insertId;

        // 2. Upload Images to Cloudinary and insert into DB
        if (files.length > 0) {
            if (!isCloudinaryConfigured()) {
                await connection.rollback();
                return res.status(503).json({
                    message: 'Image storage is unconfigured. Please configure CLOUDINARY_URL in Railway variables.',
                });
            }

            const folder = `lost-and-found/lost-items/${itemId}`;
            const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));

            let uploadedAssets = [];
            try {
                uploadedAssets = await Promise.all(uploadPromises);
            } catch (cloudinaryError) {
                console.error('[LOST ITEM IMAGE UPLOAD]', cloudinaryError);
                // If Cloudinary upload fails, rollback database transaction
                await connection.rollback();
                return res.status(500).json({ message: 'Image upload failed. Please try again.' });
            }

            // 3. Save to ITEM_IMAGES
            const imageValues = uploadedAssets.map(asset => [itemId, null, asset.secure_url, asset.public_id]);
            await connection.query(`
                INSERT INTO ITEM_IMAGES (lost_item_id, found_item_id, image_url, public_id)
                VALUES ?
            `, [imageValues]);
        }

        await connection.commit();

        // Trigger matching asynchronously
        runMatchingForLostItem(itemId).catch(err => console.error("Match engine failed:", err));

        res.status(201).json({ message: 'Lost item reported successfully', id: itemId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Update lost item
export const updateLostItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;
        const { title, category, description, brand, model, color, identifying_details, location, lost_date, lost_time, status, removedImages } = req.body;
        const files = req.files || [];

        // Check ownership
        const [items] = await connection.query('SELECT user_id FROM LOST_ITEMS WHERE id = ? FOR UPDATE', [id]);
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Lost item not found' });
        }
        if (items[0].user_id !== userId && req.user.role !== 'ADMIN') {
            await connection.rollback();
            return res.status(403).json({ message: 'Not authorized to edit this report' });
        }

        // Update item details
        await connection.query(`
            UPDATE LOST_ITEMS
            SET title=?, category=?, description=?, brand=?, model=?, color=?, identifying_details=?, location=?, lost_date=?, lost_time=?, status=?
            WHERE id = ?
        `, [title, category, description, brand, model, color, identifying_details, location, lost_date, lost_time || null, status || 'OPEN', id]);

        // Process removed images
        if (removedImages) {
            const removedIds = JSON.parse(removedImages); // Assuming array of public_ids sent as JSON string
            if (Array.isArray(removedIds) && removedIds.length > 0) {
                // Fetch public_ids to verify they belong to this item
                const [imagesToDelete] = await connection.query(
                    'SELECT public_id FROM ITEM_IMAGES WHERE lost_item_id = ? AND public_id IN (?)',
                    [id, removedIds]
                );

                if (imagesToDelete.length > 0) {
                    const validPublicIds = imagesToDelete.map(img => img.public_id);
                    // Delete from Cloudinary
                    await Promise.all(validPublicIds.map(pid => deleteFromCloudinary(pid)));
                    // Delete from DB
                    await connection.query('DELETE FROM ITEM_IMAGES WHERE lost_item_id = ? AND public_id IN (?)', [id, validPublicIds]);
                }
            }
        }

        // Upload new images
        if (files.length > 0) {
            if (!isCloudinaryConfigured()) {
                await connection.rollback();
                return res.status(503).json({
                    message: 'Image storage is unconfigured. Please configure CLOUDINARY_URL in Railway variables.',
                });
            }

            // Enforce max 5 images total
            const [currentImages] = await connection.query('SELECT COUNT(*) as count FROM ITEM_IMAGES WHERE lost_item_id = ?', [id]);
            if (currentImages[0].count + files.length > 5) {
                await connection.rollback();
                return res.status(400).json({ message: 'Maximum 5 images allowed per report' });
            }

            const folder = `lost-and-found/lost-items/${id}`;
            const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));

            let uploadedAssets = [];
            try {
                uploadedAssets = await Promise.all(uploadPromises);
            } catch (cloudinaryError) {
                await connection.rollback();
                return res.status(500).json({ message: 'Image upload failed. Please try again.' });
            }

            const imageValues = uploadedAssets.map(asset => [id, null, asset.secure_url, asset.public_id]);
            await connection.query(`
                INSERT INTO ITEM_IMAGES (lost_item_id, found_item_id, image_url, public_id)
                VALUES ?
            `, [imageValues]);
        }

        await connection.commit();
        res.status(200).json({ message: 'Lost item updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Delete lost item
export const deleteLostItem = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user.id;

        // Check ownership
        const [items] = await connection.query('SELECT user_id FROM LOST_ITEMS WHERE id = ?', [id]);
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Lost item not found' });
        }
        if (items[0].user_id !== userId && req.user.role !== 'ADMIN') {
            await connection.rollback();
            return res.status(403).json({ message: 'Not authorized to delete this report' });
        }

        // Fetch images to delete from Cloudinary
        const [images] = await connection.query('SELECT public_id FROM ITEM_IMAGES WHERE lost_item_id = ?', [id]);

        // Delete item from DB (Cascade will delete ITEM_IMAGES records)
        await connection.query('DELETE FROM LOST_ITEMS WHERE id = ?', [id]);
        await connection.commit(); // Commit first so UI feels fast, cleanup Cloudinary in background

        // Cleanup Cloudinary
        if (images.length > 0) {
            images.map(img => deleteFromCloudinary(img.public_id));
        }

        res.status(200).json({ message: 'Lost item deleted successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
