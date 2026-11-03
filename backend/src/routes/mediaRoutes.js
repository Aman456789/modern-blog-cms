// backend/src/routes/mediaRoutes.js
//
// Media pipeline routes — mounted at /api/media in server.js.
//
// POST /api/media/upload        — direct S3 streaming upload (images & documents)
// POST /api/media/upload-video  — direct S3 streaming upload (videos)
//
// Both endpoints are protected by requireAuth: only authenticated admins
// can write to the Media Library.

import express from 'express';

import { requireAuth }          from '../middleware/authMiddleware.js';
import {
  uploadImageMiddleware,   // Multer-S3 instance — streams multipart/form-data to S3
  uploadVideoMiddleware,   // Multer-S3 instance — streams video to S3
  uploadImage,             // Controller — S3 URL mapping + DB insert
  uploadVideo,             // Controller — S3 URL mapping + DB insert
} from '../controllers/mediaController.js';

const router = express.Router();

// Wrap multer middleware to catch S3 streaming or filter errors gracefully
const handleUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (err) {
      console.error('[mediaRoutes] Multer/S3 streaming upload error:', err);
      const status = err.status || (err.name === 'MulterError' ? 400 : 500);
      return res.status(status).json({
        message: err.message || 'File upload failed',
        error: err.message,
      });
    }
    next();
  });
};

// ── POST /api/media/upload ────────────────────────────────────────────────────
// Chain: requireAuth → Multer-S3 → Media.create
router.post('/upload', requireAuth, handleUpload(uploadImageMiddleware), uploadImage);

// ── POST /api/media/upload-video ──────────────────────────────────────────────
// Chain: requireAuth → Multer-S3 → Media.create
router.post('/upload-video', requireAuth, handleUpload(uploadVideoMiddleware), uploadVideo);

export default router;