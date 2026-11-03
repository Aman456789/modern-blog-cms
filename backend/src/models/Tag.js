// backend/src/models/Tag.js

import mongoose from 'mongoose';
import { trashLifecycleOptions } from './sharedSchema.js';

const TagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      unique: true,
      index: true,
    },
    ...trashLifecycleOptions,
  },
  { collection: 'tags', timestamps: false, versionKey: false }
);

// Same reasoning as Category: tags are reference data, default to PUBLISHED
// rather than the editorial DRAFT default used by Post.
TagSchema.path('status').default('PUBLISHED');

TagSchema.index({ name: 1 }, { unique: true, name: 'uq_tags_name' });
TagSchema.index({ slug: 1 }, { unique: true, name: 'uq_tags_slug' });
TagSchema.index({ status: 1, name: 1 }, { name: 'idx_tags_status_name' });

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);
