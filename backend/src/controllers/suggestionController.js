// backend/src/controllers/suggestionController.js
//
// GET /api/admin/suggestions — Smart Suggestions engine (Backend
// Schema §4.3, file_directory.txt "Smart suggestions engine for Tags
// and Categories [NEW]"). Returns unique, previously-used tags or
// categories matching a partial query string, consumed by
// SmartSuggestions.jsx's debounced dropdown.
//
// Query params: kind ('tag' | 'category', required), q (search prefix)

import Tag from '../models/Tag.js';

const SUGGESTION_LIMIT = 8;

/**
 * GET /api/admin/suggestions?kind=tag|category&q=...
 *
 * Response shape: { suggestions: [{ id, name }] } — matches what
 * SmartSuggestions.jsx expects (suggestion.id, suggestion.name).
 */
export async function getSuggestions(req, res, next) {
  try {
    const { kind, q } = req.query;

    if (kind !== 'tag') {
      return res.status(400).json({ message: "kind must be 'tag' (categories removed)" });
    }

    const Model = Tag;

    const filter = { status: { $ne: 'TRASHED' } };

    if (q && q.trim()) {
      // Case-insensitive prefix/substring match. Escape regex
      // metacharacters in the user-supplied query so a search like
      // "c++" or "(wedding)" can't throw or behave unexpectedly.
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const results = await Model.find(filter)
      .select('name')
      .sort({ name: 1 })
      .limit(SUGGESTION_LIMIT)
      .lean();

    const suggestions = results.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
    }));

    return res.status(200).json({ suggestions });
  } catch (err) {
    return next(err);
  }
}

export default { getSuggestions };
