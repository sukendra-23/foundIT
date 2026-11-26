import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configure Cloudinary supporting both:
 * 1. CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 * 2. Individual CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const rawUrl = process.env.CLOUDINARY_URL?.trim().replace(/^["']|["']$/g, '');
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^["']|["']$/g, '');
const apiKey = process.env.CLOUDINARY_API_KEY?.trim().replace(/^["']|["']$/g, '');
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim().replace(/^["']|["']$/g, '');

if (rawUrl) {
    process.env.CLOUDINARY_URL = rawUrl;
    cloudinary.config(true); // Parses CLOUDINARY_URL directly
} else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}

/**
 * Checks whether Cloudinary credentials are fully configured.
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
    const config = cloudinary.config();
    return Boolean(config.cloud_name && config.api_key && config.api_secret);
};

/**
 * Validates Cloudinary configuration at server startup.
 * Logs status and alerts the operator if missing in production.
 */
export const validateCloudinaryConfig = () => {
    if (isCloudinaryConfigured()) {
        const config = cloudinary.config();
        console.log(`✅ [CLOUDINARY CONFIG] Cloudinary initialized for cloud: "${config.cloud_name}"`);
        return { valid: true, cloudName: config.cloud_name };
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        console.error(
            '⚠️ [CLOUDINARY CONFIG] CRITICAL WARNING: Cloudinary credentials are not configured in Railway!\n' +
            '   Image uploads for Lost/Found items, Claims, and Profile Avatars will fail.\n' +
            '   ACTION REQUIRED: In Railway Dashboard -> FoundIT Backend -> Variables, add:\n' +
            '   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>\n' +
            '   (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET)\n'
        );
        return { valid: false, error: 'Missing Cloudinary credentials' };
    } else {
        console.warn('⚠️ [CLOUDINARY CONFIG] Cloudinary credentials not configured locally. Image uploads will require configuration.');
        return { valid: false, warning: 'Missing local Cloudinary credentials' };
    }
};

export default cloudinary;
