// backend/src/routes/adminRoutes.js
//
// Protected write-mutation routes, all mounted behind requireAuth.
// Mounted at /api/admin in server.js.
//
// FIX Bug 5: router.post('/posts/:id/restore') changed to router.patch()
// to match the frontend call: api.patch(`/api/admin/posts/${id}/restore`)

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  trashPost,
  restorePost,
  togglePin,
} from '../controllers/adminPostController.js';

import { getSuggestions }        from '../controllers/suggestionController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { listMedia, deleteMedia } from '../controllers/mediaController.js';
import { checkSlugExists } from '../controllers/postController.js';

const router = Router();

// Every route on this router requires a valid admin session.
router.use(requireAuth);

// ── Posts ─────────────────────────────────────────────────────────────────────
router.get('/posts',           listPosts);
// Add this ABOVE router.get('/:id', ...) or router.put('/:id', ...)
router.get('/check-slug', checkSlugExists);
router.get('/posts/:id',       getPost);
router.post('/posts',          createPost);
router.patch('/posts/:id',     updatePost);
router.delete('/posts/:id',    deletePost);
router.post('/posts/:id/trash',   trashPost);
router.patch('/posts/:id/restore', restorePost); // FIX: was router.post — must be PATCH
router.patch('/posts/:id/pin',    togglePin);

// Categories routes removed (feature deprecated)

// ── Smart Suggestions ─────────────────────────────────────────────────────────
router.get('/suggestions', getSuggestions);

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings',    getSettings);
router.patch('/settings',  updateSettings);

// ── Media library (admin view) ────────────────────────────────────────────────
router.get('/media',        listMedia);
router.delete('/media/:id', deleteMedia);

export default router;