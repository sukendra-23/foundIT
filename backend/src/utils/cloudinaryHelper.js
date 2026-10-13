import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                // Apply a limit to resolution to be web-friendly while retaining quality
                transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
                format: 'webp' // Convert everything to webp for better compression
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
 * Uploads an evidence document/image to Cloudinary under private claim path
 * @param {Buffer} buffer - File buffer
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadEvidenceToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
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
 * Deletes a file from Cloudinary by its public ID
 * @param {String} publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Failed to delete Cloudinary image: ${publicId}`, error);
    }
};
