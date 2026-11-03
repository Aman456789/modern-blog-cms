// backend/src/models/Media.js
//
// Amazon S3 Media Storage: files are streamed directly to S3 via Multer-S3.
// sizeBytes reflects the final S3 object size, capped at 500MB by the max validator.

import mongoose from 'mongoose';
import { trashLifecycleOptions } from './sharedSchema.js';

const MediaSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true, enum: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'PDF'], index: true },
    filename: { type: String, required: true, trim: true, maxlength: 512, unique: true },
    originalName: { type: String, required: true, trim: true, maxlength: 512 },
    mimeType: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    size: { type: Number }, // Original uploaded size
    sizeBytes: { type: Number, required: true, min: 1, max: 524288000 }, // Max 500MB enforced for final stored file
    url: { type: String, required: true, trim: true, maxlength: 1024, unique: true },
    caption: { type: String, default: '' },
    videoDurationInSeconds: { type: Number, default: null },
    mediaCategory: { type: String, default: 'Wedding' },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ...trashLifecycleOptions,
  },
  { collection: 'media', timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

// Media items aren't editorial drafts — they're either live (PUBLISHED) or
// TRASHED, so default away from the inherited DRAFT.
MediaSchema.path('status').default('PUBLISHED');

MediaSchema.index({ filename: 1 }, { unique: true, name: 'uq_media_filename' });
MediaSchema.index({ url: 1 }, { unique: true, name: 'uq_media_url' });
MediaSchema.index({ postId: 1, createdAt: -1 }, { name: 'idx_media_postId_createdAt_desc' });
MediaSchema.index(
  { uploadedBy: 1, createdAt: -1 },
  { name: 'idx_media_uploadedBy_createdAt_desc' }
);
MediaSchema.index(
  { status: 1, kind: 1, createdAt: -1 },
  { name: 'idx_media_status_kind_createdAt_desc' }
);
MediaSchema.index({ status: 1, trashedAt: 1 }, { name: 'idx_media_status_trashedAt' });

export default mongoose.models.Media || mongoose.model('Media', MediaSchema);
