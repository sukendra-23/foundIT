import express from 'express';
import { getLostItems, getLostItem, createLostItem, updateLostItem, deleteLostItem } from '../controllers/lostItemController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// Public routes (anyone can see listings and details)
router.get('/', getLostItems);
router.get('/:id', getLostItem);

// Protected routes (must be logged in)
router.post('/', protect, upload.array('images', 5), createLostItem);
router.put('/:id', protect, upload.array('images', 5), updateLostItem);
router.delete('/:id', protect, deleteLostItem);

export default router;
