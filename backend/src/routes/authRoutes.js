// backend/src/routes/authRoutes.js
//
// Maps POST /api/auth/* (TRD 5.1). Mounted at /api/auth in server.js.

import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Rate-limited per TRD 1.3: 5 attempts per 15 minutes per IP.
router.post('/login', loginRateLimiter, login);

router.post('/logout', logout);

// Behind requireAuth: reaching the handler at all proves the session
// is valid, which is exactly what <ProtectedRoute> on the frontend
// relies on.
router.get('/me', requireAuth, me);

export default router;
