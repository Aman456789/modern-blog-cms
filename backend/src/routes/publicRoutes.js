// backend/src/routes/publicRoutes.js
//
// Public, unauthenticated read endpoints. Mounted at /api in server.js, so
// the routes below resolve to GET /api/posts, GET /api/posts/:slug,
// GET /api/categories, and GET /api/tags.
//
// Per the architectural decision in §6.9 of the state transfer doc, every
// list endpoint here uses .lean() with explicit field projection — the
// heavy `content` field is never fetched outside the single-post route.
//
// NOTE on scope: file_directory.txt assigns "paginated public feed &
// dynamic parameter resolvers" to a dedicated postController.js, but that
// controller has not been built yet (it isn't in the Phase 2 handoff's
// built list). To keep this file runnable today rather than depending on
// a controller that doesn't exist, the post-listing/resolution logic is
// implemented inline below. If/when postController.js is built, these two
// post handlers can be lifted out into it without changing this file's
// route signatures.

import { Router } from 'express';
import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
import { getUniqueTags, getSidebarPosts } from '../controllers/postController.js';
import { generatePostSchema } from '../utils/schemaGenerator.js';

const router = Router();

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// Public list/detail projections — title/slug/excerpt/etc. only; `content`
// is reserved for the single-post detail route.
const POST_LIST_PROJECTION = 'title slug excerpt featuredImageUrl tags authorId author mediaGallery publishedAt seo_title seo_description seo_keywords';
const POST_DETAIL_PROJECTION = 'title slug content excerpt featuredImageUrl metaTitle metaDescription tags authorId author mediaGallery publishedAt seo_title seo_description seo_keywords';

function clampPageSize(rawLimit) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function clampPage(rawPage) {
  const parsed = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

// ── GET /api/posts/sidebar ────────────────────────────────────────────────────
router.get('/posts/sidebar', getSidebarPosts);

// ── GET /api/posts ──────────────────────────────────────────────────────────
// Query params: page, limit, category (slug), tag (slug), search (free text)
router.get('/posts', async (req, res, next) => {
  try {
    // --- START DYNAMIC LIMIT LOGIC (CRASH-PROOF) ---
    const page = parseInt(req.query.page, 10) || 1;
    const isFetchAll = req.query.fetchAll === 'true' || req.query.fetchAll === true;
    
    let limit = parseInt(req.query.limit, 10) || 5; 
    let skip = 0; // Defined safely as 'let'
    
    let siteSettings = null;
    
    if (isFetchAll) {
      // Global Sidebar bypass
      limit = 1000;
      skip = 0;
    } else {
      // Normal Pagination for Grid
      try {
        const models = Post.db.models; 
        const SettingModel = models.Setting || models.Settings || models.SiteSetting;
        
        if (SettingModel) {
          siteSettings = await SettingModel.findOne().lean();
          if (siteSettings && siteSettings.postsPerPage) {
            limit = parseInt(siteSettings.postsPerPage, 10);
          }
        }
      } catch (error) { 
        console.error("Setting fetch safe-skip:", error.message); 
      }
      skip = (page - 1) * limit;
    }
    // --- END DYNAMIC LIMIT LOGIC ---

    const filter = { status: 'PUBLISHED' };
    
    if (req.query.tag) {
      const tag = await Tag.findOne({
        slug: String(req.query.tag).toLowerCase().trim(),
        status: 'PUBLISHED',
      }).select('_id').lean();
      if (tag) filter.tags = tag._id;
    }

    if (req.query.search) {
      filter.$text = { $search: String(req.query.search).slice(0, 200) };
    }

    // 2. The Absolute Database Sort
    const [items, total] = await Promise.all([
      Post.find(filter)
        .select('title slug excerpt featuredImageUrl isPinned metaTitle metaDescription authorId author mediaGallery tags publishedAt createdAt updatedAt seo_title seo_description seo_keywords')
        .populate({ path: 'authorId', select: 'name' })
        .populate({ path: 'tags', select: 'name slug' })
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 }) // STRICT PIN SORT
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    
    console.log("1. LIMIT APPLIED:", limit);
    console.log("2. TOTAL FETCHED:", items.length);
    console.log("3. PIN STATUS:", items.map(p => ({ title: p.title, isPinned: p.isPinned })));
    console.log("----------------------------------");

    const totalPages = Math.ceil(total / limit) || 0;

    // Fetch the absolute newest post regardless of pinned status for the Hero frame
    const latestPost = await Post.findOne(filter)
      .select('title slug excerpt featuredImageUrl isPinned metaTitle metaDescription authorId author mediaGallery tags publishedAt createdAt updatedAt seo_title seo_description seo_keywords')
      .populate({ path: 'authorId', select: 'name' })
      .populate({ path: 'tags', select: 'name slug' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    // Ensure your response payload includes latestPost like this:
    res.status(200).json({
      posts: items,
      currentPage: page,
      totalPages,
      totalPosts: total,
      latestPost, // <-- ADD THIS STRICTLY
      settings: siteSettings
    });
  } catch (err) {
    next(err);
  }
});



// ── GET /api/posts/tags ────────────────────────────────────────────────────────
router.get('/posts/tags', getUniqueTags);

// ── GET /api/settings ────────────────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    const models = Post.db.models;
    const SettingModel = models.Setting || models.Settings || models.SiteSetting;
    let settings = {};
    if (SettingModel) {
      settings = await SettingModel.findOne().lean();
    }
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/posts/slug/:slug ─────────────────────────────────────────────────────
router.get('/posts/slug/:slug', async (req, res, next) => {
  try {
    const post = await Post.findOne({
      slug: String(req.params.slug).toLowerCase().trim(),
      status: 'PUBLISHED',
    })
      .select(POST_DETAIL_PROJECTION)
      // category population removed (categories deleted)
      .populate('tags', 'name slug')
      .populate('authorId', 'name')
      .populate('mediaGallery')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let schemaJson = null;
    try {
        const finalizedSchemaObj = generatePostSchema(post);
        schemaJson = JSON.stringify(finalizedSchemaObj);
    } catch (e) {
        console.error("Schema Generation Failed:", e.message);
        // Continue without schema
    }

    res.json({ post, schemaJson });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/categories ─────────────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find({ status: 'PUBLISHED' })
      .select('name slug')
      .sort({ name: 1 })
      .lean();

    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/tags ────────────────────────────────────────────────────────────
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await Tag.find({ status: 'PUBLISHED' })
      .select('name slug')
      .sort({ name: 1 })
      .lean();

    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

export default router;
