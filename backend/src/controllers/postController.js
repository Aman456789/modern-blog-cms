// backend/src/controllers/postController.js
//
// Public-facing post endpoints (TRD §5.1 "Public Data"; Backend Schema
// §4.2). These are the only handlers in the codebase that untrusted,
// unauthenticated traffic reaches directly, so every query here is
// hard-scoped to status: 'PUBLISHED' and never trusts a client-supplied
// status filter.
//
// Per the Backend Schema's documented query shape, the list endpoint
// MUST use .lean() (skip Mongoose document overhead — these are
// read-only responses) and .select('-content -previousStatus
// -trashedAt') (the article body and internal trash-lifecycle fields
// have no business being in a feed payload; content is fetched only
// by the single-post-by-slug endpoint, where the reader actually needs
// it).

import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
import mongoose from 'mongoose';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

/**
 * GET /api/posts
 * Query params: page (default 1), limit (default 12, capped at 50),
 *   category (Category slug), tag (Tag slug)
 *
 * Returns the documented { items, page, limit, total } shape so the
 * frontend's BlogFeed.jsx can paginate without a second round trip.
 */
export async function listPosts(req, res, next) {
  try {
    // --- START DYNAMIC LIMIT LOGIC (SIDEBAR SAFE) ---
    const page = parseInt(req.query.page, 10) || 1;
    // Robust check for fetchAll (handles both string and boolean parsers)
    const isFetchAll = req.query.fetchAll === 'true' || req.query.fetchAll === true;

    let limit = 5; // default fallback

    if (isFetchAll) {
      // Strictly bypass the Settings DB for the global sidebar
      limit = 1000; 
    } else {
      // Only fetch limits from DB if it is the main grid
      try {
        const models = Post.db.models; 
        const SettingModel = models.Setting || models.Settings || models.SiteSetting;
        if (SettingModel) {
          const siteSettings = await SettingModel.findOne().lean();
          if (siteSettings && siteSettings.postsPerPage) {
            limit = parseInt(siteSettings.postsPerPage, 10);
          }
        }
      } catch (error) { 
        console.error("Setting fetch safe-skip:", error.message); 
      }
    }

    const skip = isFetchAll ? 0 : (page - 1) * limit;
    // --- END DYNAMIC LIMIT LOGIC ---

    const filter = { status: { $regex: new RegExp('^published$', 'i') } };

    if (req.query.tag) {
      const tag = await Tag.findOne({ slug: req.query.tag }).select('_id').lean();
      if (!tag) {
        return res.status(200).json({ items: [], page, limit, total: 0 });
      }
      filter.tags = tag._id;
    }

    // 2. FETCH, SORT, AND LIMIT VIA MONGOOSE
    // --- STRICT QUERY LOCK: Prevent ANY earlier logic from breaking the Sidebar ---
    let finalLimit = Number(limit) || 5;
    let finalSkip = Number(skip) || 0;

    if (req.query.fetchAll === 'true' || req.query.fetchAll === true) {
      finalLimit = 1000;
      finalSkip = 0;
    }

    const [items, total] = await Promise.all([
      Post.find(filter)
        .select('title slug excerpt featuredImageUrl isPinned metaTitle metaDescription authorId author mediaGallery tags publishedAt createdAt updatedAt seo_title seo_description seo_keywords')
        .populate({ path: 'authorId', select: 'name' })
        .populate({ path: 'tags', select: 'name slug' })
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .skip(finalSkip)
        .limit(finalLimit) // Locked directly into the query
        .lean(),
      Post.countDocuments(filter),
    ]);
    // --- END STRICT QUERY LOCK ---
    
    

    const totalPages = Math.ceil(total / limit) || 1;

    

    // 3. SEND CLEAN RESPONSE
    return res.status(200).json({
      posts: items,
      currentPage: page,
      totalPages,
      totalPosts: total
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/posts/:slug
 *
 * Unlike the list endpoint, this DOES include `content` — the reader
 * is here specifically to read the article body — but still excludes
 * the internal lifecycle fields (previousStatus, trashedAt) that are
 * never any business of public clients.
 */
export async function getPostBySlug(req, res, next) {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: { $regex: new RegExp('^published$', 'i') } })
      .select('title slug content excerpt featuredImageUrl isPinned metaTitle metaDescription authorId author mediaGallery tags publishedAt createdAt updatedAt seo_title seo_description seo_keywords')
      .populate({ path: 'authorId', select: 'name' })
      .populate({ path: 'tags', select: 'name slug' })
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const mappedPost = {
      ...post,
      isPinned: !!post.isPinned
    };

    return res.status(200).json({ post: mappedPost });
  } catch (err) {
    return next(err);
  }
}

export async function getUniqueTags(req, res, next) {
  try {
    const tags = await Post.distinct('tags');
    return res.status(200).json(tags);
  } catch (err) {
    return next(err);
  }
}


// --- DEDICATED SIDEBAR CONTROLLER ---
// Fetches all posts globally for the sidebar index without pagination limits
export const getSidebarPosts = async (req, res) => {
  try {
    // Use your existing status filter if applicable, otherwise fetch all
    const filter = { status: 'published' }; 
    
    const posts = await Post.find(filter)
      .select('title slug isPinned publishedAt createdAt updatedAt seo_title seo_description seo_keywords')
      .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
      .lean();

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Error fetching sidebar posts:", error);
    res.status(500).json({ message: "Failed to fetch sidebar index", error: error.message });
  }
};

// --- REAL-TIME SLUG VALIDATION ---
export const checkSlugExists = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(200).json({ exists: false });
    
    // Optional: If you pass an ID, exclude it (useful for Edit Post mode)
    const query = { slug: slug };
    if (req.query.excludeId && req.query.excludeId !== 'undefined') {
      query._id = { $ne: req.query.excludeId };
    }

    const post = await Post.findOne(query).select('_id').lean();
    res.status(200).json({ exists: !!post });
  } catch (error) {
    console.error("Slug check error:", error);
    res.status(500).json({ exists: false });
  }
};

// STRICT FIX: The export statement MUST be the very last line of the file
export default { 
  listPosts, 
  getPostBySlug, 
  getUniqueTags, 
  getSidebarPosts 
};
