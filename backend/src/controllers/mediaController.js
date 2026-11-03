// backend/src/controllers/mediaController.js
//
// Amazon S3 Media Pipeline (Direct S3 Streaming via Multer-S3):
//   POST /api/media/upload       -> Streams image/document to S3, returns S3 URL
//   POST /api/media/upload-video -> Streams video to S3, returns S3 URL

import path      from 'path';
import { randomUUID } from 'crypto';
import multer    from 'multer';
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import multerS3  from 'multer-s3';

import Media from '../models/Media.js';
import Post from '../models/Post.js';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const s3Client = s3;
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const DEFAULT_PAGE_LIMIT   = 24;
const MAX_PAGE_LIMIT       = 100;

// ── Multer S3 Storage & Filter ───────────────────────────────────────────────

const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    file.originalname = utf8Name;
    cb(null, `${Date.now()}-${utf8Name}`);
  },
});

const mediaFileFilter = (req, file, cb) => {
  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'dll', 'com', 'scr', 'vbs', 'js', 'jar', 'apk', 'iso', 'dmg'];
  if (dangerousExtensions.includes(ext)) {
    const error = new Error('Executable and script files are strictly prohibited.');
    error.status = 400;
    return cb(error, false);
  }

  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/x-msvideo', 'video/mpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/x-m4a'
  ];

  const allowedExtensions = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
    'mp4', 'webm', 'mov', 'mkv', 'avi',
    'pdf', 'doc', 'docx',
    'mp3', 'wav', 'ogg', 'aac', 'm4a'
  ];

  if (
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/') ||
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only standard images, videos, audio, and documents are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

// Multer instances streaming directly to S3
const imageUpload = multer({
  storage: s3Storage,
  limits:  { fileSize: 500 * 1024 * 1024 },
  fileFilter: mediaFileFilter,
});

const videoUpload = multer({
  storage: s3Storage,
  limits:  { fileSize: 500 * 1024 * 1024 },
  fileFilter: mediaFileFilter,
});

// Named middleware exports — imported individually in mediaRoutes.js so they
// can be chained as discrete Express middleware rather than spread.
export const uploadImageMiddleware = imageUpload.single('file');
export const uploadVideoMiddleware = videoUpload.single('file');

// ── POST /api/media/upload ────────────────────────────────────────────────────

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure accurate fileSize even if multer-s3 reports 0 for chunked streams
    let fileSize = Number(req.file.size) || 0;
    if ((!fileSize || fileSize <= 0) && req.file.key && process.env.AWS_S3_BUCKET_NAME) {
      try {
        const head = await s3Client.send(new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key,
        }));
        if (head.ContentLength) {
          fileSize = head.ContentLength;
        }
      } catch (headErr) {
        console.warn('[uploadImage] HeadObject size check failed:', headErr.message);
      }
    }
    if (!fileSize || fileSize <= 0) {
      fileSize = Number(req.headers['content-length']) || 1;
    }

    // Global Duplicate Check (Name + Size)
    const existingMedia = await Media.findOne({ 
      originalName: req.file.originalname, 
      size: fileSize 
    });

    if (existingMedia) {
      if (req.file.key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key,
        })).catch(() => {});
      }
      return res.status(409).json({ 
        error: 'Duplicate File', 
        message: 'A file with this exact name and size already exists in the library.',
        existingMedia
      });
    }

    const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
    let kind = 'IMAGE';
    if (req.file.mimetype.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
      kind = 'VIDEO';
    } else if (req.file.mimetype.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) {
      kind = 'AUDIO';
    } else if (
      req.file.mimetype === 'application/pdf' || 
      req.file.mimetype === 'application/msword' || 
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ['pdf', 'doc', 'docx'].includes(ext)
    ) {
      kind = 'DOCUMENT';
    }

    let mimeType = req.file.mimetype;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (['mp4', 'm4v'].includes(ext)) mimeType = 'video/mp4';
      else if (ext === 'webm') mimeType = 'video/webm';
      else if (ext === 'mov') mimeType = 'video/quicktime';
      else if (ext === 'mp3') mimeType = 'audio/mpeg';
      else if (ext === 'wav') mimeType = 'audio/wav';
      else if (ext === 'pdf') mimeType = 'application/pdf';
    }

    const filename = req.file.key || path.basename(req.file.location || req.file.originalname);

    let media;
    try {
      media = await Media.create({
        kind,
        filename,
        originalName: req.file.originalname,
        mimeType:     mimeType || 'application/octet-stream',
        size:         fileSize,
        sizeBytes:    fileSize,
        url:          req.file.location,
        uploadedBy:   req.user._id,
      });
    } catch (dbErr) {
      // Rollback: if database operation fails after multer-s3 upload, delete file from S3
      const s3Key = req.file.key || (req.file.location ? decodeURIComponent(req.file.location.split('/').pop()) : null);
      if (s3Key && process.env.AWS_S3_BUCKET_NAME) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
        })).catch(s3Err => console.error(`[uploadImage rollback] Failed to delete S3 file "${s3Key}":`, s3Err.message));
      }
      throw dbErr;
    }

    return res.status(201).json(media);
  } catch (err) {
    console.error('[uploadImage] Failed to process media upload:', err);
    return res.status(500).json({
      message: 'Failed to upload media',
      error: err.message,
    });
  }
}

// ── POST /api/media/upload-video ──────────────────────────────────────────────

export async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileSize = Number(req.file.size) || 0;
    if ((!fileSize || fileSize <= 0) && req.file.key && process.env.AWS_S3_BUCKET_NAME) {
      try {
        const head = await s3Client.send(new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key,
        }));
        if (head.ContentLength) {
          fileSize = head.ContentLength;
        }
      } catch (headErr) {
        console.warn('[uploadVideo] HeadObject size check failed:', headErr.message);
      }
    }
    if (!fileSize || fileSize <= 0) {
      fileSize = Number(req.headers['content-length']) || 1;
    }

    // Global Duplicate Check (Name + Size)
    const existingMedia = await Media.findOne({ 
      originalName: req.file.originalname, 
      size: fileSize 
    });

    if (existingMedia) {
      if (req.file.key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key,
        })).catch(() => {});
      }
      return res.status(409).json({ 
        error: 'Duplicate File', 
        message: 'A file with this exact name and size already exists in the library.',
        existingMedia
      });
    }

    const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
    let mimeType = req.file.mimetype;
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = 'video/mp4';
    }

    const filename = req.file.key || path.basename(req.file.location || req.file.originalname);

    let media;
    try {
      media = await Media.create({
        kind:         'VIDEO',
        filename,
        originalName: req.file.originalname,
        mimeType:     mimeType || 'video/mp4',
        size:         fileSize,
        sizeBytes:    fileSize,
        url:          req.file.location,
        uploadedBy:   req.user._id,
      });
    } catch (dbErr) {
      // Rollback: if database operation fails after multer-s3 upload, delete file from S3
      const s3Key = req.file.key || (req.file.location ? decodeURIComponent(req.file.location.split('/').pop()) : null);
      if (s3Key && process.env.AWS_S3_BUCKET_NAME) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
        })).catch(s3Err => console.error(`[uploadVideo rollback] Failed to delete S3 file "${s3Key}":`, s3Err.message));
      }
      throw dbErr;
    }

    return res.status(201).json(media);
  } catch (err) {
    console.error('[uploadVideo] Failed to process video upload:', err);
    return res.status(500).json({
      message: 'Failed to upload video',
      error: err.message,
    });
  }
}

// ── GET /api/admin/media ──────────────────────────────────────────────────────
//
// FIX Bug 4:
//   - Handles `?orphaned=true` — filters to Media where postId is null/undefined.
//   - Handles `?kind=IMAGE|VIDEO` — existing filter preserved.
//   - Adds full pagination: ?page=&limit= → returns { items, total, page, totalPages }
//     matching the shape MediaLibrary.jsx's useQuery expects.

export async function listMedia(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT)
    );

    const filter = { status: { $ne: 'TRASHED' } };

    // Kind filter: IMAGE | VIDEO | AUDIO | DOCUMENT
    if (req.query.kind && ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(req.query.kind)) {
      filter.kind = req.query.kind;
    }

    // Orphan filter: ?orphaned=true → media not linked to any post
    if (req.query.orphaned === 'true') {
      filter.$or = [{ postId: null }, { postId: { $exists: false } }];
    }

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('kind filename originalName mimeType sizeBytes url postId status createdAt')
        .lean(),
      Media.countDocuments(filter),
    ]);

    const allPosts = await Post.find().select('content featuredImageUrl mediaGallery').lean();

    const enrichedItems = items.map(media => {
      const isUsed = allPosts.some(post => {
        const inContent = post.content && post.content.includes(media.url);
        const isFeatured = post.featuredImageUrl === media.url;
        const inGallery = post.mediaGallery && post.mediaGallery.some(item => String(item) === String(media._id) || item === media.url);
        return inContent || isFeatured || inGallery;
      });
      return { ...media, isUsed };
    });

    return res.status(200).json({
      items: enrichedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Extracts the S3 Object Key from a full AWS S3 URL string or path.
 * Supports virtual-hosted style (bucket.s3.region.amazonaws.com/key)
 * and path-style (s3.region.amazonaws.com/bucket/key) URLs.
 */
export function getS3KeyFromUrl(urlString) {
  if (!urlString) return null;
  try {
    const parsed = new URL(urlString);
    let key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (bucket && key.startsWith(`${bucket}/`)) {
      key = key.slice(bucket.length + 1);
    }
    return key;
  } catch {
    return decodeURIComponent(urlString.replace(/^\/+/, ''));
  }
}

// ── DELETE /api/admin/media/:id ───────────────────────────────────────────────

export async function deleteMedia(req, res) {
  try {
    // 1. Fetch the media document using findById(req.params.id). If not found, return 404.
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // 2. Extract the exact S3 Object Key from the media.url (with URL decoding).
    let s3Key = null;
    if (media.url) {
      try {
        const parsed = new URL(media.url);
        let key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (bucket && key.startsWith(`${bucket}/`)) {
          key = key.slice(bucket.length + 1);
        }
        s3Key = key;
      } catch {
        s3Key = decodeURIComponent(media.url.split('?')[0].split('#')[0].split('/').pop());
      }
    }
    if (!s3Key && media.filename) {
      try {
        s3Key = decodeURIComponent(media.filename);
      } catch {
        s3Key = media.filename;
      }
    }

    // 3. Wrap the S3 deletion in a try/catch block.
    // 4. Execute the deletion
    try {
      if (s3Key && process.env.AWS_S3_BUCKET_NAME) {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
        });
        await s3Client.send(command);
      }
    } catch (s3Error) {
      // 7. If S3 deletion throws an error, log it and return 500 without crashing
      console.error(`[deleteMedia] Failed to delete object "${s3Key}" from S3:`, s3Error);
      return res.status(500).json({
        message: 'Failed to delete file from S3 storage',
        error: s3Error.message,
      });
    }

    // 5. After successful S3 deletion, delete the MongoDB document
    await media.deleteOne();

    // 6. Return a 200 OK JSON response
    return res.status(200).json({
      message: 'Media deleted successfully',
      deletedId: req.params.id,
    });
  } catch (err) {
    console.error('[deleteMedia] Controller error:', err);
    return res.status(500).json({
      message: 'Internal server error deleting media',
      error: err.message,
    });
  }
}

export default {
  uploadImageMiddleware,
  uploadVideoMiddleware,
  uploadImage,
  uploadVideo,
  listMedia,
  deleteMedia,
};