// frontend/src/components/admin/RecentDraftsList.jsx
//
// Standalone version of the "Last 5 Drafts" block Dashboard.jsx currently
// inlines. Dumb/presentational, matching the per-widget independent
// loading contract (App Flow §4) — the parent passes down status/data/error.
//
// Props:
//   drafts    — [{ _id, title, updatedAt }]
//   status    — 'loading' | 'success' | 'error'
//   error     — string
//   onRetry   — () => void

import { Link } from "react-router-dom";

export default function RecentDraftsList({ drafts, status, error, onRetry }) {
  return (
    <div className="border border-[#333333] rounded-md p-6">
      <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[#777777]">
        Last 5 Drafts
      </p>

      {status === "loading" && (
        <div className="space-y-3" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-5 w-2/3 rounded-sm bg-[#000000] animate-pulse" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-[#777777]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-sm border border-[#333333] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors duration-fast hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}

      {status === "success" && (
        (drafts || []).length === 0 ? (
          <p className="font-sans text-sm text-[#777777]">No drafts in progress.</p>
        ) : (
          <ul className="divide-y divide-[#333333]">
            {(drafts || []).map((post) => (
              <li key={post._id}>
                <Link
                  to={`/admin/posts/${post._id}/edit`}
                  className="flex items-center justify-between gap-4 py-3 group rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="font-sans text-sm text-white group-hover:text-[#777777] transition-colors duration-fast truncate">
                    {post.title || "Untitled"}
                  </span>
                  <span className="font-sans text-xs text-[#777777] shrink-0">
                    {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
