// backend/src/middleware/authMiddleware.js
//
// Verifies the JWT session cookie on every protected /api/admin/* and
// /api/media/* (write) route. Per TRD 5.2, the token lives in an
// HttpOnly, secure, sameSite: 'strict' cookie — never read from an
// Authorization header, since this app has no client-side token
// storage to begin with.

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'token';

if (!JWT_SECRET) {
  throw new Error('Missing process.env.JWT_SECRET');
}

/**
 * Express middleware: requires a valid JWT session cookie.
 * On success, attaches the authenticated user to req.user (without the
 * passwordHash field) and calls next(). On failure, responds 401
 * directly rather than calling next(err), since an expired/invalid
 * session is an expected, routine condition for the frontend's
 * <ProtectedRoute> to react to — not an exceptional server error.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Covers both expired (TokenExpiredError) and tampered/invalid
      // (JsonWebTokenError) tokens with the same generic response, so
      // the failure mode doesn't leak which case occurred.
      return res.status(401).json({ message: 'Session expired or invalid' });
    }

    const user = await User.findById(payload.sub).select('-passwordHash').lean();

    if (!user) {
      // Token is structurally valid but the user no longer exists
      // (e.g. deleted after the token was issued).
      return res.status(401).json({ message: 'Session expired or invalid' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default requireAuth;
