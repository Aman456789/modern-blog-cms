// backend/src/controllers/adminPostController.js
//
// Admin post management: list/create/update/permanent-delete, plus the
// Trash/Restore lifecycle endpoints.
//
// Fixes applied (audit Bug 6):
//   a) listPosts returned { items, page, limit, total } — PostList.jsx reads
//      data.posts and data.totalPages. Fixed to { posts, total, page, totalPages }.
//   b) createPost and updatePost never destructured or persisted `featuredImageUrl`
//      from req.body, silently discarding the featured image on every save.
//      Fixed to read `featuredImageUrl` and write it to the Post document.

import Post  from '../models/Post.js';
import Media from '../models/Media.js';
import { sanitizeHtml } from '../utils/sanitize.js';

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'TRASHED'];

// ── Media usage linker ───────────────────────────────────────────────────────
//
// Parses all media URLs referenced in a post (content HTML, featuredImageUrl,
// mediaGallery) and sets postId on those Media documents so the "Unused" filter
// works correctly. Also clears postId from any Media that are no longer used.

function extractSrcUrls(html = '') {
  const urls = [];
  // Match src="..." from <img> and <video> tags
  const srcPattern = /<(?:img|video|source|audio)[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = srcPattern.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

async function linkMediaToPost(postId, content, featuredImageUrl, mediaGallery) {
  // Collect all URLs referenced by this post
  const contentUrls = extractSrcUrls(content || '');
  const galleryUrls = Array.isArray(mediaGallery)
    ? mediaGallery.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
    : [];

  const usedUrls = [
    ...new Set([
      ...contentUrls,
      featuredImageUrl,
      ...galleryUrls,
    ].filter(Boolean)),
  ];

  if (usedUrls.length === 0) return;

  // Mark all matching Media docs as used by this post (bulk, efficient)
  await Media.updateMany(
    { url: { $in: usedUrls } },
    { $set: { postId } },
  );
}

async function unlinkRemovedMedia(postId, content, featuredImageUrl, mediaGallery) {
  // URLs now in use
  const contentUrls = extractSrcUrls(content || '');
  const galleryUrls = Array.isArray(mediaGallery)
    ? mediaGallery.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
    : [];
  const usedUrls = new Set([
    ...contentUrls,
    featuredImageUrl,
    ...galleryUrls,
  ].filter(Boolean));

  // Find all Media currently linked to this post
  const linked = await Media.find({ postId }).select('url').lean();

  // Unlink any that are no longer referenced
  const toUnlink = linked.map((m) => m.url).filter((u) => !usedUrls.has(u));
  if (toUnlink.length > 0) {
    await Media.updateMany(
      { url: { $in: toUnlink } },
      { $unset: { postId: '' } },
    );
  }
}

const pendingLocks = new Map();
function isLocked(postId)        { return pendingLocks.has(String(postId)); }
function setLock(postId, kind)   { pendingLocks.set(String(postId), { lockedAt: Date.now(), kind }); }
function clearLock(postId)       { pendingLocks.delete(String(postId)); }

// ── GET /api/admin/posts ──────────────────────────────────────────────────────

export async function listPosts(req, res, next) {
  try {
    // Auto-purge posts that were soft-deleted more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Post.deleteMany({ isDeleted: true, deletedAt: { $lte: sevenDaysAgo } });

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .select('-content')
        .populate({ path: 'tags',       select: 'name slug' })
        .populate('mediaGallery')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    // FIX Bug 6a: return 'posts' (not 'items') and include 'totalPages'
    return res.status(200).json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/admin/posts/:id ──────────────────────────────────────────────────

export async function getPost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id)
      .populate({ path: 'tags',       select: 'name slug' })
      .populate('mediaGallery');

    if (!post) return res.status(404).json({ message: 'Post not found' });

    return res.status(200).json({ post });
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/admin/posts ─────────────────────────────────────────────────────

export async function createPost(req, res, next) {
  try {
    // FIX Bug 6b: destructure featuredImageUrl from request body
    const { title, content, excerpt, tags, status, featuredImageUrl, author, mediaGallery, seo_title, seo_description } = req.body;

    // --- ROUTE NAME LOGIC ---
    // 1. Extract routeName from body, or fallback to title
    let rawRouteName = req.body.routeName && req.body.routeName.trim() !== '' 
      ? req.body.routeName 
      : req.body.title;

    if (!rawRouteName) {
      return res.status(400).json({ message: "Post title is required to generate a route." });
    }

    // 2. Sanitize: Lowercase, replace spaces with hyphens, remove special characters
    const finalSlug = rawRouteName
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-') // replace spaces and underscores with hyphens
      .replace(/[^a-z0-9-]/g, ''); // remove all non-alphanumeric/hyphen characters

    // 4. Assign to the object being saved
    const slug = finalSlug;
    // --- END ROUTE NAME LOGIC ---

    if (!title || !slug) {
      return res.status(400).json({ message: 'title and slug are required' });
    }

    // === NEW FIX: TRASHED SLUG RESOLVER FOR CREATION ===
    const existingTrashedPost = await Post.findOne({ slug });
    if (existingTrashedPost) {
        if (existingTrashedPost.status === 'TRASHED') {
            // Free up the slug by renaming the trashed post
            existingTrashedPost.slug = `${existingTrashedPost.slug}-trashed-${Date.now()}`;
            await existingTrashedPost.save();
        }
    }
    // ===================================================

    // --- STRICT UNIQUENESS VALIDATION ---
    // Check if ANY other post exists with the exact same Title OR Slug
    // The $ne operator ensures we don't conflict with ourselves during an 'edit/update' operation
    const postId = req.params.id || null;
    const existingPost = await Post.findOne({
      $or: [
        { title: req.body.title },
        { slug: finalSlug }
      ],
      ...(postId ? { _id: { $ne: postId } } : {})
    });

    if (existingPost) {
      if (existingPost.title.toLowerCase() === req.body.title.toLowerCase()) {
        return res.status(400).json({ message: "A post with this EXACT Title already exists. Titles must be unique." });
      }
      if (existingPost.slug === finalSlug) {
        return res.status(400).json({ message: "A post with this Route Name already exists. Route names must be unique." });
      }
    }
    // --- END UNIQUENESS VALIDATION ---

    const requestedStatus = status && VALID_STATUSES.includes(status) ? status : 'DRAFT';

    // Safely extract SEO fields (handling both camelCase and snake_case payloads)
    const extractedSeoTitle = req.body.seo_title || req.body.seoTitle || null;
    const extractedSeoDesc = req.body.seo_description || req.body.seoDescription || null;
    const extractedSeoKeywords = req.body.seo_keywords || req.body.seoKeywords || null;

    const post = await Post.create({
      title,
      slug,
      content:          sanitizeHtml(content || ''),
      excerpt:          excerpt || '',
      tags:             Array.isArray(tags) ? tags : [],
      authorId:         req.user._id,
      status:           requestedStatus,
      featuredImageUrl: featuredImageUrl || '',  // FIX: persist the featured image
      author:           author || { authorName: 'Fotographiya Journal', authorAvatar: '' },
      mediaGallery:     Array.isArray(mediaGallery) ? mediaGallery : [],
      publishedAt:      requestedStatus === 'PUBLISHED' ? new Date() : null,
      seo_title:        extractedSeoTitle,
      seo_description:  extractedSeoDesc,
      seo_keywords:     extractedSeoKeywords,
    });

    // Link all referenced media to this post (fire-and-forget — don't block response)
    linkMediaToPost(post._id, post.content, post.featuredImageUrl, post.mediaGallery)
      .catch((e) => console.error('[linkMediaToPost] createPost error:', e));

    return res.status(201).json({ post });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A post with this slug already exists' });
    }
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation Failed', details: err.message });
    }
    return res.status(400).json({ error: 'Validation Failed', details: err.message });
  }
}

// ── PATCH /api/admin/posts/:id ────────────────────────────────────────────────

export async function updatePost(req, res, next) {
  try {
    if (isLocked(req.params.id)) {
      return res.status(409).json({
        message: 'This post is currently pending a trash/delete action and cannot be edited.',
      });
    }

    // FIX Bug 6b: destructure featuredImageUrl from request body
    const { title, content, excerpt, tags, status, featuredImageUrl, author, mediaGallery, seo_title, seo_description } = req.body;
    
    // --- ROUTE NAME LOGIC ---
    let slug = undefined;
    if (req.body.routeName !== undefined || req.body.title !== undefined) {
      let rawRouteName = req.body.routeName && req.body.routeName.trim() !== '' 
        ? req.body.routeName 
        : (req.body.title || '');

      if (rawRouteName) {
        slug = rawRouteName
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
    }
    const finalSlug = slug;
    // --- END ROUTE NAME LOGIC ---
    
    // === NEW FIX: TRASHED SLUG RESOLVER FOR UPDATES ===
    if (slug !== undefined) {
        const existingTrashedPost = await Post.findOne({ slug });
        if (existingTrashedPost && existingTrashedPost._id.toString() !== req.params.id) { 
            if (existingTrashedPost.status === 'TRASHED') {
                // Free up the slug by renaming the trashed post
                existingTrashedPost.slug = `${existingTrashedPost.slug}-trashed-${Date.now()}`;
                await existingTrashedPost.save();
            }
        }
    }
    // ==================================================

    // --- STRICT UNIQUENESS VALIDATION ---
    if (req.body.title || finalSlug) {
      // Check if ANY other post exists with the exact same Title OR Slug
      // The $ne operator ensures we don't conflict with ourselves during an 'edit/update' operation
      const postId = req.params.id || null;
      const orConditions = [];
      if (req.body.title) orConditions.push({ title: req.body.title });
      if (finalSlug) orConditions.push({ slug: finalSlug });

      const existingPost = await Post.findOne({
        $or: orConditions,
        ...(postId ? { _id: { $ne: postId } } : {})
      });

      if (existingPost) {
        if (req.body.title && existingPost.title.toLowerCase() === req.body.title.toLowerCase()) {
          return res.status(400).json({ message: "A post with this EXACT Title already exists. Titles must be unique." });
        }
        if (finalSlug && existingPost.slug === finalSlug) {
          return res.status(400).json({ message: "A post with this Route Name already exists. Route names must be unique." });
        }
      }
    }
    // --- END UNIQUENESS VALIDATION ---

    const update = {};

    if (title            !== undefined) update.title            = title;
    if (slug             !== undefined) update.slug             = slug;
    if (content          !== undefined) update.content          = sanitizeHtml(content);
    if (excerpt          !== undefined) update.excerpt          = excerpt;
    if (tags             !== undefined) update.tags             = Array.isArray(tags) ? tags : [];
    if (featuredImageUrl !== undefined) update.featuredImageUrl = featuredImageUrl; // FIX
    if (author           !== undefined) update.author           = author;
    if (mediaGallery     !== undefined) update.mediaGallery     = Array.isArray(mediaGallery) ? mediaGallery : [];
    // Safely extract SEO fields (handling both camelCase and snake_case payloads)
    const extractedSeoTitle = req.body.seo_title || req.body.seoTitle || null;
    const extractedSeoDesc = req.body.seo_description || req.body.seoDescription || null;
    const extractedSeoKeywords = req.body.seo_keywords || req.body.seoKeywords || null;
    
    update.seo_title = extractedSeoTitle;
    update.seo_description = extractedSeoDesc;
    update.seo_keywords = extractedSeoKeywords;

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      update.status = status;
    }

    const existing = await Post.findById(req.params.id).select('status publishedAt');
    if (!existing) return res.status(404).json({ message: 'Post not found' });

    if (status === 'PUBLISHED' && !existing.publishedAt) {
      update.publishedAt = new Date();
    }

    const post = await Post.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    });

    // Unlink media no longer used, then link all currently-used media
    if (post) {
      unlinkRemovedMedia(post._id, post.content, post.featuredImageUrl, post.mediaGallery)
        .then(() => linkMediaToPost(post._id, post.content, post.featuredImageUrl, post.mediaGallery))
        .catch((e) => console.error('[linkMediaToPost] updatePost error:', e));
    }

    return res.status(200).json({ post });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A post with this slug already exists' });
    }
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation Failed', details: err.message });
    }
    return res.status(400).json({ error: 'Validation Failed', details: err.message });
  }
}

// ── POST /api/admin/posts/:id/trash ──────────────────────────────────────────

export async function trashPost(req, res, next) {
  try {
    setLock(req.params.id, 'trash');

    const post = await Post.findById(req.params.id);
    if (!post) {
      clearLock(req.params.id);
      return res.status(404).json({ message: 'Post not found' });
    }

    post.previousStatus = post.status === 'TRASHED' ? post.previousStatus : post.status;
    post.status   = 'TRASHED';
    post.trashedAt = new Date();
    await post.save();

    return res.status(200).json({ post });
  } catch (err) {
    return next(err);
  } finally {
    clearLock(req.params.id);
  }
}

// ── PATCH /api/admin/posts/:id/restore ───────────────────────────────────────

export async function restorePost(req, res, next) {
  try {
    if (isLocked(req.params.id)) {
      return res.status(409).json({
        message: 'This post is pending another action. Please try again shortly.',
      });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.status         = post.previousStatus || 'DRAFT';
    post.trashedAt      = null;
    post.previousStatus = null;
    await post.save();

    return res.status(200).json({ post });
  } catch (err) {
    return next(err);
  }
}

// ── DELETE /api/admin/posts/:id ───────────────────────────────────────────────

export async function deletePost(req, res, next) {
  try {
    setLock(req.params.id, 'delete');

    const post = await Post.findById(req.params.id);
    if (!post) {
      clearLock(req.params.id);
      return res.status(404).json({ message: 'Post not found' });
    }

    await Post.deleteOne({ _id: post._id });
    await Media.updateMany({ postId: post._id }, { $unset: { postId: '' } });

    return res.status(200).json({ message: 'Post permanently deleted' });
  } catch (err) {
    return next(err);
  } finally {
    clearLock(req.params.id);
  }
}

// ── PATCH /api/admin/posts/:id/pin ────────────────────────────────────────────────
export async function togglePin(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.isPinned = !post.isPinned;
    post.updatedAt = new Date(); // Explicitly touch timestamp for sorting priority
    await post.save();

    return res.status(200).json({ post });
  } catch (err) {
    return next(err);
  }
}

export default { listPosts, getPost, createPost, updatePost, trashPost, restorePost, deletePost, togglePin };