// frontend/src/pages/admin/Trash.jsx
//
// REFACTOR — Cinematic Dark Theme
//
// Previous bugs:
//   • Delete modal panel:  bg-[#000000] (#fff) = WHITE MODAL on dark page
//   • Delete modal input:  bg-[#000000] (#fff) text-white (#fff) = white on white
//   • Delete modal input focus ring: ring-white (#fff) on white input = barely visible
//   • Delete button:       bg-ink-primary (#fff) text-white (#000) — actually correct
//                          but now explicitly bg-[#000000] text-white for clarity
//   • Cancel button:       border-[#333333] text-white hover:bg-[#000000]
//                          surface-mid = #333333 which is fine; kept as explicit values
//   • Skeleton:            bg-[#000000] (#333333) — correct for dark
//   • Error banner:        bg-[#000000] (#333333) OK as slight elevation on dark canvas
//   • List items:          border/hover using surface-mid tokens — all fine (#333333)
//   • Header text:         text-white (#fff) + text-[#777777] (#777) — correct

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";
import UndoToast from "../../components/admin/UndoToast.jsx";



export default function Trash() {
  const [status, setStatus] = useState("loading");
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const confirmInputRef = useRef(null);

  const load = useCallback(() => {
    setStatus("loading");
    api
      .get("/api/admin/posts", { params: { status: "TRASHED", sort: "-trashedAt" } })
      .then((res) => {
        setPosts(res.data.posts ?? []);
        setStatus("success");
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? "Couldn't load trash.");
        setStatus("error");
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-focus the confirm input when the delete modal opens
  useEffect(() => {
    if (deleteTarget) {
      setTypedConfirm("");
      setTimeout(() => confirmInputRef.current?.focus(), 50);
    }
  }, [deleteTarget]);

  // ── Restore (no modal, optimistic) ────────────────────────────────────
  const startRestore = (post) => {
    if (pending) return;
    const index = posts.findIndex((p) => p._id === post._id);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
    setPending({ post, index, type: "restore", message: `"${post.title || "Untitled"}" restored` });
  };

  // ── Permanent delete (typed-confirm modal) ─────────────────────────────
  const openDeleteModal = (post) => { if (!pending) setDeleteTarget(post); };
  const closeDeleteModal = () => { setDeleteTarget(null); setTypedConfirm(""); };

  const confirmPermanentDelete = () => {
    const requiredPhrase = deleteTarget.title || "Untitled";
    if (typedConfirm !== requiredPhrase) return;
    const post = deleteTarget;
    const index = posts.findIndex((p) => p._id === post._id);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
    setPending({
      post, index,
      type: "permanent-delete",
      message: `"${post.title || "Untitled"}" scheduled for permanent deletion`,
    });
    closeDeleteModal();
  };

  // ── Toast resolution ───────────────────────────────────────────────────
  const handleUndo = () => {
    if (!pending) return;
    setPosts((prev) => {
      const next = [...prev];
      const insertAt = Math.min(Math.max(0, pending.index), next.length);
      next.splice(insertAt, 0, pending.post);
      return next;
    });
    setPending(null);
  };

  const handleExpire = async () => {
    if (!pending) return;
    const { post, type } = pending;
    try {
      if (type === "restore") {
        await api.patch(`/api/admin/posts/${post._id}/restore`);
      } else {
        await api.delete(`/api/admin/posts/${post._id}`);
      }
    } catch {
      setPosts((prev) => {
        const next = [...prev];
        const insertAt = Math.min(Math.max(0, pending.index), next.length);
        next.splice(insertAt, 0, post);
        return next;
      });
      setError(
        type === "restore"
          ? "Couldn't restore the post. It's been put back in the trash."
          : "Couldn't permanently delete the post. It's been put back in the trash."
      );
    } finally {
      setPending(null);
    }
  };

  const otherRowsLocked = pending !== null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-8 pt-0 pb-8">

      {/* Page header */}
      <div className="mb-6">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
          Recovery Zone
        </p>
        <h1 className="font-syne text-3xl font-bold text-white leading-none">Trash</h1>
        <p className="mt-3 font-sans text-sm text-[#A1A1AA] leading-relaxed">
          Posts are permanently deleted after 7 days. Use Restore to recover them before then.
        </p>
      </div>

      {/* Inline error */}
      {error && (
        <div role="alert" className="mb-6 bg-[#111111] border border-[#333333] rounded-sm px-4 py-3">
          <p className="font-sans text-sm text-[#A1A1AA]">{error}</p>
        </div>
      )}

      {/* Loading skeletons */}
      {status === "loading" && (
        <div className="space-y-3" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-[#111111] border border-white/10 rounded-lg w-full">
              <div className="w-20 h-12 bg-white/5 flex-shrink-0 rounded-sm animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="w-24 h-8 bg-white/5 flex-shrink-0 rounded-sm animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Error state with retry */}
      {status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-[#111111] border border-[#333333] rounded-sm px-4 py-3">
          <p className="font-sans text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="font-sans text-xs font-semibold text-white border border-[#333333] px-4 py-2 rounded-sm hover:border-white transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Post list */}
      {status === "success" && (
        posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[#333333]" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4h6v2" />
            </svg>
            <p className="font-syne text-lg font-medium text-[#A1A1AA]">Trash is empty</p>
            <p className="font-sans text-sm text-[#666666]">Trashed posts auto-purge after 7 days.</p>
          </div>
        ) : (
          <ul className="bg-[#111111] border border-[#333333] rounded-md divide-y divide-[#222222]">
            {posts.map((post) => (
              <li
                key={post._id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 px-5 py-4 hover:bg-[#000000] transition-colors duration-[200ms] w-full"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/posts/${post._id}/edit`}
                    className="block font-sans text-sm font-medium text-white truncate hover:text-[#A1A1AA] transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-sm"
                  >
                    {post.title || "Untitled"}
                  </Link>
                  {/* Strict Date Display for Trash with Auto-Delete Warning */}
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-sm text-white">
                      Pub: {post?.publishedAt || post?.createdAt ? new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Draft'}
                    </span>
                    <span className="text-xs text-white/50">
                      Edit: {post?.updatedAt ? new Date(post.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                    {/* New Auto-Delete Warning */}
                    <span className="text-[11px] text-[#ff4d4d] font-medium tracking-wide mt-1">
                      Auto-deletes on: {
                        new Date(new Date(post?.deletedAt || post?.trashedAt || post?.updatedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      }
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 mt-4 md:mt-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => startRestore(post)}
                    disabled={otherRowsLocked}
                    className="font-sans text-xs font-semibold text-[#A1A1AA] border border-[#333333] px-3 py-1.5 rounded-sm hover:text-white hover:border-white transition-colors duration-[200ms] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(post)}
                    disabled={otherRowsLocked}
                    className="font-sans text-xs font-semibold text-[#555555] px-3 py-1.5 rounded-sm hover:text-[#A1A1AA] transition-colors duration-[200ms] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  >
                    Delete Permanently
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {/* ── Permanent delete confirmation modal ─────────────────────── */}
      {deleteTarget && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="trash-delete-title"
          aria-describedby="trash-delete-desc"
          className="fixed inset-0 flex items-center justify-center px-4 bg-black/80"
          style={{ zIndex: "var(--z-overlay)" }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}
        >
          {/* FIX: was bg-[#000000] (#fff white modal) → now bg-[#111111] dark */}
          <div className="w-full max-w-sm bg-[#111111] border border-[#333333] rounded-md overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#333333]">
              <h2 id="trash-delete-title" className="font-sans text-sm font-bold text-white uppercase tracking-widest">
                Permanently delete post?
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              <p id="trash-delete-desc" className="font-sans text-sm text-[#A1A1AA] leading-relaxed">
                <span className="text-white font-medium">
                  &ldquo;{deleteTarget.title || "Untitled"}&rdquo;
                </span>{" "}
                will be permanently deleted. Attached media is not deleted. This can't be undone after the 7-second window closes.
              </p>
              <div>
                <label
                  htmlFor="trash-confirm-input"
                  className="block font-sans text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-2"
                >
                  Type the post title <span className="text-white">"{deleteTarget.title || "Untitled"}"</span> to confirm
                </label>
                {/* FIX: was bg-[#000000] text-white = white on white */}
                <input
                  id="trash-confirm-input"
                  ref={confirmInputRef}
                  type="text"
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPermanentDelete();
                    if (e.key === "Escape") closeDeleteModal();
                  }}
                  placeholder={deleteTarget.title || "Untitled"}
                  className="w-full bg-[#000000] border border-[#333333] px-4 py-2.5 rounded-sm
                             font-sans text-sm text-white placeholder:text-[#555555]
                             focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white
                             transition-colors duration-[200ms]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#333333]">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="font-sans text-sm font-semibold text-[#A1A1AA] border border-[#333333] px-5 py-2.5 rounded-sm hover:text-white hover:border-white transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={typedConfirm !== (deleteTarget.title || "Untitled")}
                className="font-sans text-sm font-semibold text-[#a33] border border-[#4b0b0b] px-5 py-2.5 rounded-sm bg-transparent hover:bg-[#110000] transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deferred-commit undo toast */}
      {pending && (
        <UndoToast
          message={pending.message}
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </div>
  );
}
