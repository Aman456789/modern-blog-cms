// backend/src/controllers/settingsController.js
//
// Two responsibilities, per file_directory.txt: "Meta dynamic config
// persistence & panel stats". Intended to be mounted under the protected
// /api/admin router (adminRoutes.js), behind requireAuth — this file does
// not enforce auth itself, matching the thin-controller pattern used by
// authController.js / mediaController.js elsewhere in this codebase.
//
// Routes this controller is built to serve (wire up in adminRoutes.js):
//   GET   /api/admin/settings                  -> getSettings
//   PATCH /api/admin/settings                  -> updateSettings
//   GET   /api/admin/stats/summary              -> getSummaryStats
//   GET   /api/admin/stats/publish-activity      -> getPublishActivity
//
// NOTE on the Settings model: there is no dedicated models/Settings.js yet
// (only Post/Category/Tag/Media/User exist as of this handoff). Rather than
// silently inventing an extra top-level file outside this task's scope,
// the schema is defined locally below using the same
// `mongoose.models.X || mongoose.model(...)` hot-reload-safe pattern used
// everywhere else in this codebase. If a dedicated models/Settings.js file
// is built later, this definition should move there unchanged — the
// `mongoose.models.Settings` cache means doing so is a no-op for callers.

import mongoose from 'mongoose';
import Post from '../models/Post.js';

// ── Settings model (singleton document) ─────────────────────────────────────

const SettingsSchema = new mongoose.Schema(
  {
    // Fixed key so there is always exactly one settings document, found via
    // upsert rather than by a generated _id the caller would need to know.
    key: { type: String, required: true, unique: true, default: 'global' },

    siteTitle: { type: String, trim: true, maxlength: 160, default: 'Fotographiya' },
    defaultMetaDescription: { type: String, trim: true, maxlength: 160, default: '' },
    defaultOgImageUrl: { type: String, trim: true, maxlength: 1024, default: '' },
    siteUrl: { type: String, trim: true, maxlength: 512, default: '' },
    postsPerPage: { type: Number, min: 1, max: 50, default: 12 },
    metaTitle: { type: String, required: true, default: 'Fotographiya' },
    metaKeywords: { type: String, default: '' },
  },
  { collection: 'settings', timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
);

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

const SETTINGS_KEY = 'global';

// ── GET /api/admin/settings ──────────────────────────────────────────────────
export async function getSettings(req, res, next) {
  try {
    // Upsert-on-read: guarantees the singleton document exists without
    // requiring a separate seed/migration step on a fresh local database.
    const settings = await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $setOnInsert: { key: SETTINGS_KEY } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    // Fallback logic for Default OG Image
    if (!settings.defaultOgImage || settings.defaultOgImage.trim() === '') {
        settings.defaultOgImage = '';
    }

    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/settings ────────────────────────────────────────────────
const EDITABLE_FIELDS = [
  'siteTitle',
  'defaultMetaDescription',
  'defaultOgImageUrl',
  'siteUrl',
  'postsPerPage',
  'metaTitle',
  'metaKeywords',
];

export async function updateSettings(req, res, next) {
  try {
    // Whitelist incoming fields explicitly — never spread req.body directly
    // into a Mongoose update, to avoid an admin's malformed/extra payload
    // keys silently persisting as new schema-less fields.
    const update = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    if (update.defaultMetaDescription) {
      update.defaultMetaDescription = String(update.defaultMetaDescription).slice(0, 160);
    }
    if (update.metaTitle) {
      update.metaTitle = String(update.metaTitle).slice(0, 60);
    }
    if (update.metaKeywords !== undefined) {
      update.metaKeywords = String(update.metaKeywords).replace(/[^a-zA-Z0-9\s,]/g, '');
    }
    if (update.defaultOgImageUrl) {
      try {
        new URL(update.defaultOgImageUrl);
      } catch {
        // Fallback or leave empty if invalid
        update.defaultOgImageUrl = '';
      }
    }
    if (update.postsPerPage !== undefined) {
      const parsed = Number.parseInt(update.postsPerPage, 10);
      update.postsPerPage = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 12;
    }

    const settings = await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: update, $setOnInsert: { key: SETTINGS_KEY } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/stats/summary ─────────────────────────────────────────────
// Total/Draft/Trashed counts for the dashboard's counter widgets.
export async function getSummaryStats(req, res, next) {
  try {
    const [totalPosts, draftCount, trashedCount, recentDrafts] = await Promise.all([
      Post.countDocuments({ status: { $in: ['PUBLISHED', 'DRAFT'] } }),
      Post.countDocuments({ status: 'DRAFT' }),
      Post.countDocuments({ status: 'TRASHED' }),
      Post.find({ status: 'DRAFT' })
        .select('title slug updatedAt')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({ totalPosts, draftCount, trashedCount, recentDrafts });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/stats/publish-activity ────────────────────────────────────
// Monthly published-post counts for the Chart.js dashboard widget.
// Query param: months (default 6, max 24).
export async function getPublishActivity(req, res, next) {
  try {
    const monthsBack = Math.min(
      Math.max(Number.parseInt(req.query.months, 10) || 6, 1),
      24
    );

    const since = new Date();
    since.setMonth(since.getMonth() - (monthsBack - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Post.aggregate([
      { $match: { status: 'PUBLISHED', publishedAt: { $gte: since, $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$publishedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in any zero-count months between `since` and now so the chart
    // doesn't silently skip a month with no published posts.
    const countsByMonth = new Map(rows.map((r) => [r._id, r.count]));
    const activity = [];
    const cursor = new Date(since);
    const now = new Date();

    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      activity.push({ month: key, count: countsByMonth.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

export default {
  getSettings,
  updateSettings,
  getSummaryStats,
  getPublishActivity,
};
