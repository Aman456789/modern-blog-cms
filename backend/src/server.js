// backend/src/server.js
//
// Express application bootstrap and HTTP server entry point.
// Execution order on startup:
//   1. Load .env (dotenv)
//   2. Connect to MongoDB (dbConnect — singleton, safe to call multiple times)
//   3. Register Express middleware stack
//   4. Mount route trees
//   5. Attach global error handler
//   6. Listen on PORT (default 5000)
//
// All route files are ESM modules — this file uses `import` throughout,
// matching `"type": "module"` in package.json.

import 'dotenv/config';

import express        from 'express';
import cors           from 'cors';
import cookieParser   from 'cookie-parser';
import helmet         from 'helmet';
import mongoSanitize  from 'express-mongo-sanitize';
import path           from 'path';
import { fileURLToPath } from 'url';

import { dbConnect }  from './config/mongoose.js';
import Media          from './models/Media.js';
import Post           from './models/Post.js';
import cron           from 'node-cron';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import authRoutes     from './routes/authRoutes.js';
import publicRoutes   from './routes/publicRoutes.js';
import adminRoutes    from './routes/adminRoutes.js';
import mediaRoutes    from './routes/mediaRoutes.js';

// ── Path helpers (ESM has no __dirname by default) ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Constants ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

// ── S3 Client (for cron auto-cleaner) ────────────────────────────────────────

const s3Cron = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || "https://main.d1ssqxz6taqm7m.amplifyapp.com",
    credentials: true
}));
app.options('*', cors({
    origin: process.env.FRONTEND_URL || "https://main.d1ssqxz6taqm7m.amplifyapp.com",
    credentials: true
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
// Security Middleware Shield
app.use(helmet({
    // Disable COEP so cross-origin S3 assets (images, audio, video) load without CORP restrictions
    crossOriginEmbedderPolicy: false,
    // crossOriginResourcePolicy must be false so S3 assets load across origins.
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-src": ["'self'", CLIENT_URL, "http://localhost:5000"],
            "frame-ancestors": ["'self'", CLIENT_URL],
            "object-src": ["'self'", CLIENT_URL, "http://localhost:5000"],
            "img-src": ["'self'", "data:", "blob:", CLIENT_URL, "http://localhost:5000", "https://*.amazonaws.com"],
            "media-src": ["'self'", "data:", "blob:", CLIENT_URL, "http://localhost:5000", "https://*.amazonaws.com"],
        },
    },
}));
app.use(mongoSanitize()); // Prevents NoSQL Injection

// JSON limit: expanded to 500mb to accommodate extremely large rich-text posts or base64 uploads.
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ── Cookie parser ─────────────────────────────────────────────────────────────
// Must come before any route that reads req.cookies (i.e., authMiddleware.js).
app.use(cookieParser());

// ── Static file serving ───────────────────────────────────────────────────────
// Files are now stored on AWS S3 — no local /uploads static route needed.
// (Removed: express.static(UPLOAD_DIR) block)

// ── Health Check & Root Status ────────────────────────────────────────────────
// Satisfies AWS Elastic Beanstalk ALB health checks and provides root status
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Fotographiya API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Fotographiya API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Public auth endpoints (login, logout, /me)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/api/auth', authRoutes);

// Public read-only blog API (posts, categories, tags)
app.use('/api', publicRoutes);

// Protected admin mutations (all behind requireAuth via router.use())
app.use('/api/admin', adminRoutes);

// Media pipeline (upload image, upload-video — each behind requireAuth)
app.use('/api/media', mediaRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
// Catches any request that didn't match a route above. Returns JSON rather than
// Express's default HTML 404 page, keeping the API surface consistent.
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express identifies error-handling middleware by its 4-argument signature.
// All unhandled errors (from controllers calling next(err)) land here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[server] unhandled error:', err);
  } else {
    console.error('[server] error:', err.message);
  }

  // Handle Mongoose Validation Error (return 400 Bad Request)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map(e => e.message);
    return res.status(400).json({
      message: messages[0] || 'Invalid input data. Please verify all required fields.',
      errors: messages,
    });
  }

  // Handle Mongoose CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid format for resource identifier.`,
    });
  }

  // Handle MongoDB Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'item';
    return res.status(409).json({
      message: `A record with this ${field} already exists.`,
    });
  }

  // Handle Multer Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum allowed file size is 500 MB.',
      });
    }
    return res.status(400).json({
      message: err.message || 'File upload processing failed.',
    });
  }

  const status = err.status || err.statusCode || 500;

  // Never leak technical stack traces, Mongoose or Axios internals to client
  res.status(status).json({
    message: status < 500
      ? err.message
      : 'An unexpected server error occurred. Please try again.',
  });
});

// ── Startup ───────────────────────────────────────────────────────────────────

async function start() {
  try {
    await dbConnect();
    console.log('[server] MongoDB connected.');

    // --- 7-DAY AUTO-CLEANER (Runs every midnight) ---
    cron.schedule('0 0 * * *', async () => {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const mediaItems = await Media.find({ createdAt: { $lt: sevenDaysAgo } }).lean();
            const allPosts = await Post.find().select('content featuredImageUrl mediaGallery').lean();

            for (const media of mediaItems) {
                // Check if media is used in any post
                const isUsed = allPosts.some(post => {
                    const inContent = post.content && post.content.includes(media.url);
                    const isFeatured = post.featuredImageUrl === media.url;
                    const inGallery = post.mediaGallery && post.mediaGallery.some(item => String(item) === String(media._id) || item === media.url);
                    return inContent || isFeatured || inGallery;
                });

                if (!isUsed) {
                    // 1. Delete from AWS S3
                    const rawKey = media.url ? media.url.split('?')[0].split('#')[0].split('/').pop() : media.filename;
                    const s3Key = rawKey ? decodeURIComponent(rawKey) : null;
                    if (s3Key && process.env.AWS_S3_BUCKET_NAME) {
                      await s3Cron.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: s3Key,
                      })).catch(err => console.error('[cron] S3 delete error:', err.message));
                    }
                    // 2. Delete from MongoDB
                    await Media.findByIdAndDelete(media._id);
                    console.log(`[cron] 🧹 Auto-deleted unused media: ${media.originalName}`);
                }
            }
        } catch (err) {
            console.error('[cron] Auto-cleaner error:', err);
        }
    });
    console.log('[server] Auto-cleaner cron scheduled.');

    app.listen(PORT, () => {
      console.log(`[server] Fotographiya API running → http://localhost:${PORT}`);
      console.log(`[server] Accepting requests from   → ${CLIENT_URL}`);
      console.log(`[server] Media storage             → AWS S3 (${process.env.AWS_S3_BUCKET_NAME})`);
    });
  } catch (err) {
    console.error('[server] Startup failed:', err.message);
    process.exit(1);
  }
}

start();