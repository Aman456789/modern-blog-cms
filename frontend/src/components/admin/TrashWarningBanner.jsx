// frontend/src/components/admin/TrashWarningBanner.jsx
//
// Warning banner for the top of Trash.jsx. The 7-day window comes from
// the locked architectural decision in models/sharedSchema.js's
// trashedAt field (used by the cron auto-purge job) — this supersedes an
// earlier 30-day figure that appeared in an older PRD draft.
//
// Two display modes:
//   - No urgent items: a quiet, informational line.
//   - One or more trashed posts within URGENT_THRESHOLD_DAYS of purge:
//     an emphasized variant (solid black bar) naming how many and how
//     soon, since silently auto-deleting is the one truly irreversible
//     action in this whole admin.
//
// Props:
//   trashedCount    — number of posts currently in trash
//   oldestTrashedAt — Date | string | null — trashedAt of the
//                      longest-trashed post, used to compute urgency

const PURGE_WINDOW_DAYS = 7;
const URGENT_THRESHOLD_DAYS = 2; // warn loudly once a post has <= 2 days left

function daysRemaining(trashedAt) {
  if (!trashedAt) return null;
  const trashedDate = new Date(trashedAt);
  const purgeDate = new Date(trashedDate.getTime() + PURGE_WINDOW_DAYS * 86_400_000);
  const msRemaining = purgeDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(msRemaining / 86_400_000));
}

export default function TrashWarningBanner({ trashedCount, oldestTrashedAt }) {
  if (!trashedCount) return null;

  const remaining = daysRemaining(oldestTrashedAt);
  const isUrgent = remaining !== null && remaining <= URGENT_THRESHOLD_DAYS;

  if (isUrgent) {
    return (
      <div
        role="alert"
        className="mb-6 flex items-center justify-between gap-4 rounded-sm bg-ink-primary px-5 py-4"
      >
        <p className="font-sans text-sm text-white">
          {remaining === 0 ? (
            <>At least one post will be permanently deleted <strong>today</strong>.</>
          ) : (
            <>
              At least one post will be permanently deleted in{" "}
              <strong>{remaining} {remaining === 1 ? "day" : "days"}</strong>.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 border border-[#333333] rounded-sm px-5 py-3">
      <p className="font-sans text-sm text-[#777777]">
        Trashed posts are automatically and permanently deleted after {PURGE_WINDOW_DAYS} days.
      </p>
    </div>
  );
}
