// frontend/src/components/admin/PostListTable.jsx
//
// Admin data table for /admin/posts (Implementation Roadmap Task 4.4,
// App Flow §4.2, UI & UX brief §4.4). Owns the optimistic trash flow
// end-to-end: confirm modal -> row flash/collapse -> 7-second UndoToast
// -> compensating mutation (if undone) or the real DELETE/trash
// request (only after the toast's window expires untouched).
//
// Distinguishes the three flows from App Flow §4.2:
//   - Trash:    requires a confirmation modal before the row collapses.
//   - Restore:  no confirmation modal at all.
//   - Permanent delete: requires typing "DELETE" to confirm (out of
//     scope here — Trash.jsx, not built yet, owns that screen).
//
// Strict pure Black & White: no shadows, no blue links, borders only
// (border-[#333333]), focus-visible rings 2px solid Black.

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";
import UndoToast from "./UndoToast.jsx";

const STATUS_LABEL = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  TRASHED: "Trashed",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }) {
  // Pure Black & White inversion, not a colored badge — Published rows
  // get the inverted (Black bg / White text) treatment to read as
  // "live", everything else stays outlined.
  const isPublished = status === "PUBLISHED";
  return (
    <span
      className={[
        "inline-flex rounded-pill border px-2.5 py-0.5 font-sans text-xs font-medium uppercase tracking-wide",
        isPublished
          ? "border-surface-dark bg-[#000000] text-white"
          : "border-[#333333] text-[#777777]",
      ].join(" ")}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * @param {object} props
 * @param {Array<object>} props.posts - Post documents (title, slug, status, categoryName, updatedAt, _id)
 * @param {(postId: string) => void} props.onTrashed - Fired once a trash is confirmed by the server (so the parent can update counts/lists)
 * @param {(postId: string) => void} props.onRestored - Fired after a successful restore mutation
 */
export default function PostListTable({ posts, onTrashed, onRestored }) {
  // Rows currently mid-flight in the optimistic trash window, keyed by
  // post _id. Holding them here (not derived from `posts`) means the
  // collapse/undo lifecycle survives even if the parent re-fetches.
  const [pendingTrash, setPendingTrash] = useState({}); // { [postId]: { post } }
  const [confirmTarget, setConfirmTarget] = useState(null); // post pending confirm-modal
  const [rowError, setRowError] = useState(null);

  const visiblePosts = (posts || []).filter((post) => !pendingTrash[post._id]);

  const openTrashConfirm = (post) => setConfirmTarget(post);
  const closeTrashConfirm = () => setConfirmTarget(null);

  const confirmTrash = () => {
    const post = confirmTarget;
    setConfirmTarget(null);
    if (!post) return;

    // Optimistic: collapse the row locally immediately. The real
    // mutation is deferred until the 7s UndoToast window expires.
    setPendingTrash((prev) => ({ ...prev, [post._id]: { post } }));
  };

  const handleUndo = (postId) => {
    // Pure local rollback — the server was never told, so there is no
    // compensating mutation to fire, just restore the row to view.
    setPendingTrash((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  const handleExpire = async (postId) => {
    try {
      await api.patch(`/api/admin/posts/${postId}`, { status: "TRASHED" });
      onTrashed?.(postId);
    } catch (err) {
      // Rollback: the row reappears and an inline error banner explains
      // why (App Flow §1.2 "Rollback" state).
      setRowError(
        err?.response?.data?.message ||
          "Could not move this post to trash. It has been restored to the list."
      );
    } finally {
      setPendingTrash((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleRestore = async (post) => {
    try {
      await api.patch(`/api/admin/posts/${post._id}`, { status: post.previousStatus || "DRAFT" });
      onRestored?.(post._id);
    } catch (err) {
      setRowError(err?.response?.data?.message || "Could not restore this post.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {rowError && (
        <div role="alert" className="rounded-sm border border-[#333333] p-3">
          <p className="font-sans text-sm text-white">{rowError}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-[#333333]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#333333] bg-[#000000]">
              <th scope="col" className="px-4 py-3 text-left font-sans text-xs uppercase tracking-widest text-[#777777]">
                Title
              </th>
              <th scope="col" className="px-4 py-3 text-left font-sans text-xs uppercase tracking-widest text-[#777777]">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left font-sans text-xs uppercase tracking-widest text-[#777777]">
                Updated
              </th>
              <th scope="col" className="px-4 py-3 text-right font-sans text-xs uppercase tracking-widest text-[#777777]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visiblePosts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center font-sans text-base text-[#777777]">
                  No posts yet.
                </td>
              </tr>
            )}

            {visiblePosts.map((post) => (
              <tr
                key={post._id}
                className="border-b border-[#333333] transition-opacity duration-normal last:border-b-0 hover:bg-[#000000]"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/posts/${post._id}/edit`}
                    className="font-sans text-base font-medium text-white underline-offset-2 hover:underline focus-visible:outline-none"
                  >
                    {post.title || "Untitled"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={post.status} />
                </td>
                <td className="px-4 py-3 font-sans text-sm text-[#777777]">
                  {formatDate(post.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {post.status === "TRASHED" ? (
                      <button
                        type="button"
                        onClick={() => handleRestore(post)}
                        className="rounded-sm border border-[#333333] px-3 py-1.5 font-sans text-sm font-medium text-white transition-colors duration-fast hover:bg-[#000000] hover:text-white"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Move "${post.title || "Untitled"}" to trash`}
                        onClick={() => openTrashConfirm(post)}
                        className="rounded-sm border border-[#333333] px-3 py-1.5 font-sans text-sm font-medium text-white transition-colors duration-fast hover:bg-[#000000] hover:text-white"
                      >
                        Trash
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Trash confirmation modal (Trash flow only — App Flow §4.2) ---- */}
      {confirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-confirm-title"
          className="fixed inset-0 z-overlay flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-sm border border-[#333333] bg-[#000000] p-6">
            <h2 id="trash-confirm-title" className="font-syne text-xl text-white">
              Move to trash?
            </h2>
            <p className="mt-2 font-sans text-sm text-[#777777]">
              &ldquo;{confirmTarget.title || "Untitled"}&rdquo; will be moved to trash. You can
              undo this for the next 7 seconds.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeTrashConfirm}
                className="rounded-sm border border-[#333333] px-4 py-2 font-sans text-sm font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTrash}
                className="rounded-sm bg-[#000000] px-4 py-2 font-sans text-sm font-medium text-white"
              >
                Move to trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- UndoToast for the most recently trashed row. ----
          NOTE: UndoToast.jsx hardcodes `fixed bottom-6 right-6` inside
          itself, so multiple simultaneous instances would visually
          overlap at the same screen position — that component has no
          way to accept a position offset from here. Rendering only the
          single most recent pending-trash toast avoids a broken-looking
          stack; trashing a second row while the first toast is still
          counting down replaces it (the first row's expiry still fires
          correctly in the background via its own timer either way). If
          true multi-toast stacking is needed, UndoToast.jsx itself would
          need a `style`/offset prop added in a future pass. */}
      {Object.entries(pendingTrash).length > 0 && (() => {
        const [mostRecentPostId, { post }] = Object.entries(pendingTrash).at(-1);
        return (
          <UndoToast
            key={mostRecentPostId}
            message={`"${post.title || "Untitled"}" moved to trash`}
            onUndo={() => handleUndo(mostRecentPostId)}
            onExpire={() => handleExpire(mostRecentPostId)}
          />
        );
      })()}
    </div>
  );
}

