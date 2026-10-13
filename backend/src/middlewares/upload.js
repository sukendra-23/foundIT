import multer from 'multer';

// Use memory storage so we can upload directly to Cloudinary from memory
const storage = multer.memoryStorage();

// File filter for images (JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format. Please upload JPG, PNG, or WEBP.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter
});

export default upload;
