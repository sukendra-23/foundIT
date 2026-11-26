import multer from 'multer';

// Use memory storage so we can upload directly to Cloudinary from memory
const storage = multer.memoryStorage();

// Allowed image MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
]);

// File filter for images (JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
    const mime = file.mimetype?.toLowerCase();
    if (ALLOWED_MIME_TYPES.has(mime)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format. Please upload JPG, PNG, or WEBP images.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 5 // Maximum 5 files per request
    },
    fileFilter
});

export default upload;
