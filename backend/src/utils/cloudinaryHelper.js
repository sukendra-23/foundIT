import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

/**
 * Extracts Cloudinary public ID from a standard Cloudinary URL.
 * e.g. "https://res.cloudinary.com/demo/image/upload/v12345/lost-and-found/avatars/abc123xyz.webp"
 *      -> "lost-and-found/avatars/abc123xyz"
 * @param {String} url 
 * @returns {String|null}
 */
export const extractPublicId = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
        return null;
    }
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        let pathAfterUpload = parts[1];
        // Strip version prefix if present e.g. "v1234567890/"
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
        // Strip file extension e.g. ".webp", ".jpg", ".png"
        const lastDot = pathAfterUpload.lastIndexOf('.');
        if (lastDot !== -1) {
            pathAfterUpload = pathAfterUpload.substring(0, lastDot);
        }
        return pathAfterUpload || null;
    } catch {
        return null;
    }
};

/**
 * Uploads a buffer to Cloudinary for Lost and Found item images.
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/KEY/SECRET.'));
        }
        if (!Buffer.isBuffer(buffer)) {
            return reject(new Error('Invalid image file buffer.'));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
                format: 'webp'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Uploads an avatar image with smart face crop and optimization.
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadAvatarToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/KEY/SECRET.'));
        }
        if (!Buffer.isBuffer(buffer)) {
            return reject(new Error('Invalid avatar file buffer.'));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'lost-and-found/avatars',
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' }
                ],
                format: 'webp'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Uploads an evidence document/image to Cloudinary under private claim path.
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadEvidenceToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/KEY/SECRET.'));
        }
        if (!Buffer.isBuffer(buffer)) {
            return reject(new Error('Invalid evidence file buffer.'));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
                format: 'webp'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Deletes a file from Cloudinary by its public ID.
 * @param {String} publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId) => {
    if (!publicId || !isCloudinaryConfigured()) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Failed to delete Cloudinary image: ${publicId}`, error.message);
    }
};
