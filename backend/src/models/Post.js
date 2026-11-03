// backend/src/models/Post.js

import mongoose from 'mongoose';
import { trashLifecycleOptions } from './sharedSchema.js';

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 512 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 512,
      unique: true,
      index: true,
    },
    content: { type: String, required: true },
    excerpt: { type: String, trim: true, maxlength: 320, default: '' },
    featuredImageUrl: { type: String, trim: true, maxlength: 1024, default: '' },
    isPinned: { type: Boolean, default: false },
    metaTitle: { type: String, trim: true, maxlength: 512, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 160, default: '' },
    // --- SEO CUSTOM FIELDS ---
    seo_title: { 
      type: String, 
      maxLength: 255,
      default: '' 
    },
    seo_description: { 
      type: String, 
      maxLength: 300,
      default: '' 
    },
    seo_keywords: { 
      type: String, 
      maxLength: 255,
      default: null 
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    author: {
      authorName: { type: String, default: 'Fotographiya Journal' },
      authorAvatar: { type: String, default: '' },
    },
    mediaGallery: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
    tags: [{ type: String, trim: true }],
    publishedAt: { type: Date, default: null, index: true },
    ...trashLifecycleOptions,
  },
  { collection: 'posts', timestamps: true, optimisticConcurrency: true }
);

PostSchema.index({ slug: 1 }, { unique: true, name: 'uq_posts_slug' });
PostSchema.index({ status: 1, publishedAt: -1 }, { name: 'idx_posts_status_publishedAt_desc' });
// Category index removed (categories feature deleted)
PostSchema.index(
  { authorId: 1, status: 1, publishedAt: -1 },
  { name: 'idx_posts_author_status_publishedAt_desc' }
);
PostSchema.index(
  { tags: 1, status: 1, publishedAt: -1 },
  { name: 'idx_posts_tags_status_publishedAt_desc' }
);
PostSchema.index({ status: 1, trashedAt: 1 }, { name: 'idx_posts_status_trashedAt' });
PostSchema.index({ updatedAt: -1 }, { name: 'idx_posts_updatedAt_desc' });
PostSchema.index(
  { title: 'text', excerpt: 'text', metaTitle: 'text', metaDescription: 'text' },
  { name: 'txt_posts_search' }
);

export default mongoose.models.Post || mongoose.model('Post', PostSchema);
