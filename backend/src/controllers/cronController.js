// backend/src/controllers/cronController.js
//
// Daily automated trash cleanup (file_directory.txt: "Cron-secret
// daily automated cleanup script for trash"). Hard-deletes any Post
// with status: 'TRASHED' whose trashedAt is older than the configured
// window, using node-cron for the in-process daily schedule.
//
// NOTE ON THE WINDOW VALUE: this controller's window is set to 30 days
// per this explicit instruction. The only window figure that appears
// anywhere else in this project's documentation is "7-day auto-purge"
// (file_directory.txt's comment on TrashWarningBanner.jsx, the
// frontend component that's expected to warn admins before this job
// runs). These two numbers conflict. TRASH_AUTO_PURGE_DAYS below is
// the single source of truth for both this job and whatever banner
// copy TrashWarningBanner.jsx eventually renders — confirm the
// intended value before that component is built, since right now it
// would be quoting a different number than this job actually enforces.
//
// CRON_SECRET (documented in the Roadmap's required .env vars) guards
// a manual HTTP trigger — useful for ops/testing without waiting for
// the daily schedule, or for an external scheduler (e.g. a host-level
// cron hitting this endpoint) instead of relying on node-cron staying
// alive inside a long-running Node process.

import cron from 'node-cron';
import Post from '../models/Post.js';
import Media from '../models/Media.js';

export const TRASH_AUTO_PURGE_DAYS = 30; // see NOTE above re: 7 vs 30 conflict

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Hard-deletes every TRASHED post older than TRASH_AUTO_PURGE_DAYS,
 * running the same Permanent Delete Hook (Backend Schema §5) that the
 * manual admin delete path uses, per post, so orphaned Media records
 * are unset identically regardless of which path triggered the delete.
 *
 * @returns {Promise<{ deletedCount: number, postIds: string[] }>}
 */
export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_AUTO_PURGE_DAYS * 24 * 60 * 60 * 1000);

  const expiredPosts = await Post.find({
    status: 'TRASHED',
    trashedAt: { $ne: null, $lte: cutoff },
  })
    .select('_id')
    .lean();

  if (expiredPosts.length === 0) {
    return { deletedCount: 0, postIds: [] };
  }

  const postIds = expiredPosts.map((p) => p._id);

  await Post.deleteMany({ _id: { $in: postIds } });

  // Permanent Delete Hook, applied in bulk for every purged post.
  await Media.updateMany({ postId: { $in: postIds } }, { $unset: { postId: '' } });

  return { deletedCount: postIds.length, postIds: postIds.map(String) };
}

/**
 * Registers the daily node-cron schedule. Call this once from
 * server.js during startup (after dbConnect() resolves) — it is not
 * itself an Express route handler.
 *
 * Schedule: '0 3 * * *' — once daily at 03:00 server time, a low-
 * traffic window for a small local/single-tenant deployment.
 */
export function scheduleTrashCleanup() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await purgeExpiredTrash();
      if (result.deletedCount > 0) {
        console.log(
          `[cron] Purged ${result.deletedCount} trashed post(s) older than ${TRASH_AUTO_PURGE_DAYS} days.`
        );
      }
    } catch (err) {
      console.error('[cron] Trash cleanup failed:', err);
    }
  });
}

/**
 * POST /api/cron/purge-trash  (or wherever this is eventually mounted)
 * Header: x-cron-secret: <CRON_SECRET>
 *
 * Manual trigger, guarded by a shared secret rather than requireAuth —
 * this is meant to be called by infrastructure (an external scheduler,
 * an ops script), not by a logged-in admin's browser session.
 */
export async function triggerTrashCleanup(req, res, next) {
  try {
    if (!CRON_SECRET) {
      return res.status(500).json({ message: 'CRON_SECRET is not configured' });
    }

    const providedSecret = req.get('x-cron-secret');

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      return res.status(401).json({ message: 'Invalid or missing cron secret' });
    }

    const result = await purgeExpiredTrash();

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export default {
  TRASH_AUTO_PURGE_DAYS,
  purgeExpiredTrash,
  scheduleTrashCleanup,
  triggerTrashCleanup,
};
