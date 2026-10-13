import express from 'express';
import { getFoundItems, getFoundItem, createFoundItem, updateFoundItem, deleteFoundItem } from '../controllers/foundItemController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Public routes
router.get('/', getFoundItems);
router.get('/:id', getFoundItem);

// Protected routes
router.post('/', protect, upload.array('images', 5), createFoundItem);
router.put('/:id', protect, upload.array('images', 5), updateFoundItem);
router.delete('/:id', protect, deleteFoundItem);

export default router;
