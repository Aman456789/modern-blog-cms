// backend/src/middleware/rateLimiter.js
//
// Login abuse protection (TRD 1.3 / Implementation Roadmap Task 2.2):
// 5 attempts per 15 minutes, backed by RateLimiterMongo so the limit
// survives server restarts and is shared correctly even if the API is
// ever run as multiple processes.
//
// Keyed by IP address rather than by submitted email, so an attacker
// can't bypass the limiter by cycling through different email guesses
// from the same machine, and a legitimate user mistyping their own
// password doesn't get blocked by someone else's failed attempts
// against a different account.

import mongoose from 'mongoose';
import { RateLimiterMongo } from 'rate-limiter-flexible';

const POINTS = 5; // 5 attempts...
const DURATION_SECONDS = 15 * 60; // ...per 15 minutes
const BLOCK_DURATION_SECONDS = 15 * 60; // once exhausted, block for the same window

let limiter = null;

/**
 * Lazily constructs the RateLimiterMongo instance using the active
 * Mongoose connection. Lazy because the limiter must not be built
 * before dbConnect() has resolved during server startup.
 */
function getLimiter() {
  if (limiter) return limiter;

  limiter = new RateLimiterMongo({
    storeClient: mongoose.connection,
    dbName: mongoose.connection.name,
    tableName: 'login_rate_limits',
    points: POINTS,
    duration: DURATION_SECONDS,
    blockDuration: BLOCK_DURATION_SECONDS,
    keyPrefix: 'login',
  });

  return limiter;
}

/**
 * Express middleware for POST /api/auth/login.
 * Consumes one point per request; once the 5-attempt budget for the
 * requesting IP is exhausted, responds 429 with a Retry-After header
 * for the remaining block duration instead of calling next().
 */
export async function loginRateLimiter(req, res, next) {
  try {
    const key = req.ip;
    await getLimiter().consume(key, 1);
    return next();
  } catch (rateLimiterRes) {
    // rate-limiter-flexible rejects with a RateLimiterRes object (not an
    // Error) when the limit is exceeded — distinguish that from a real
    // infrastructure failure (e.g. Mongo briefly unreachable).
    if (rateLimiterRes instanceof Error) {
      return next(rateLimiterRes);
    }

    const retryAfterSeconds = Math.ceil((rateLimiterRes?.msBeforeNext || 0) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
      retryAfterSeconds,
    });
  }
}

export default loginRateLimiter;
