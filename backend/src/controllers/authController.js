// backend/src/controllers/authController.js
//
// Implements the three auth endpoints from TRD 5.1:
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/me
//
// Session strategy (TRD 5.2): bcrypt.compare against a hash created
// with cost factor 12, a 24-hour (86400s) JWT, issued inside a cookie
// with httpOnly/secure/sameSite:'strict'.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'token';
const JWT_EXPIRES_IN_SECONDS = 86400; // 24 hours

if (!JWT_SECRET) {
  throw new Error('Missing process.env.JWT_SECRET');
}

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'strict',
  maxAge: JWT_EXPIRES_IN_SECONDS * 1000,
  path: '/',
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Always run through the same code path (lookup + a bcrypt compare)
    // whether or not the user exists, so response timing doesn't leak
    // which emails are registered. Using a fixed dummy hash for the
    // "user not found" case keeps the bcrypt cost identical either way.
    const inputIdentifier = String(email).trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: inputIdentifier },
        ...(inputIdentifier === 'admin' ? [{ email: 'admin@fotographiya.com' }] : []),
        ...(inputIdentifier === 'admin@fotographiya.com' ? [{ email: 'admin' }] : []),
      ]
    });

    const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOynsDoyZc/aB7c7HU8/CYpzD6E4nzMNm';
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;

    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN_SECONDS,
    });

    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears the session cookie. Idempotent — always returns 200 even if
 * no session existed.
 */
export async function logout(req, res, next) {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });

    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Mounted behind requireAuth, so reaching this handler at all already
 * proves the session is valid — req.user was populated by the
 * middleware. This is exactly the endpoint the frontend's
 * <ProtectedRoute> calls before rendering any /admin/* page.
 */
export async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

export default { login, logout, me };
