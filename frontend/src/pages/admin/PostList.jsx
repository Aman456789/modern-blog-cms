// frontend/src/pages/admin/PostList.jsx
//
// Post management list (/admin/posts) — fully dark.
// Optimistic trash: row hides immediately, UndoToast fires 7s window,
// PATCH only fires if undo is not clicked. Permanent delete requires
// typing "DELETE" in a dark confirmation modal.

import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../../services/api.js";
import UndoToast from "../../components/admin/UndoToast.jsx";

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "PUBLISHED", label: "Published" },
  { id: "DRAFT", label: "Drafts" },
  { id: "TRASHED", label: "Trash" },
];

const PAGE_LIMIT = 20;

// ── API ───────────────────────────────────────────────────────────────────

async function fetchPosts({ status, search, page }) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  if (status && status !== "all") params.set("status", status);
  if (search.trim()) params.set("q", search.trim());
  const { data } = await api.get(`/api/admin/posts?${params}`);
  return data;
}

async function trashPost(id) {
  const { data } = await api.patch(`/api/admin/posts/${id}`, { status: "TRASHED" });
  return data.post;
}

async function restorePost(id) {
  const { data } = await api.patch(`/api/admin/posts/${id}/restore`);
  return data.post;
}

async function deletePostPermanently(id) {
  await api.delete(`/api/admin/posts/${id}`);
  return id;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    PUBLISHED: "bg-[#000000] text-white border-[#333333]",
    DRAFT: "bg-transparent text-[#A1A1AA] border-[#444444]",
    TRASHED: "bg-transparent text-[#666666] border-[#333333] line-through",
  };
  return (
    <span className={`inline-flex items-center border rounded-sm px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider ${styles[status] ?? ""}`}>
      {status?.toLowerCase() ?? "—"}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ activeTab, debouncedQ, onNewPost }) {
  const icon = (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[#333333]" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  if (activeTab === "TRASHED") return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-[#333333]" aria-hidden="true">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
      </svg>
      <p className="font-syne text-lg font-medium text-[#A1A1AA]">Trash is empty</p>
      <p className="font-sans text-sm text-[#666666]">Trashed posts auto-purge after 7 days.</p>
    </div>
  );

  if (debouncedQ) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      {icon}
      <p className="font-syne text-lg font-medium text-[#A1A1AA]">No results</p>
      <p className="font-sans text-sm text-[#666666]">Nothing matched &ldquo;{debouncedQ}&rdquo;</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      {icon}
      <p className="font-syne text-lg font-medium text-[#A1A1AA]">
        {activeTab === "DRAFT" ? "No drafts yet" : "No posts yet"}
      </p>
      {activeTab !== "DRAFT" && (
        <button
          type="button"
          onClick={onNewPost}
          className="bg-[#000000] text-white font-sans text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-80 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Write your first post
        </button>
      )}
    </div>
  );
}

// ── Permanent delete modal ─────────────────────────────────────────────────

function ConfirmDeleteModal({ post, onConfirm, onCancel, isPending }) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && !isPending) onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel, isPending]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="del-title"
      className="fixed inset-0 flex items-center justify-center px-4 bg-black/80"
      style={{ zIndex: "var(--z-overlay)" }}
      onPointerDown={(e) => { if (!isPending && e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-[#111111] border border-[#333333] rounded-md overflow-hidden">
        <div className="px-6 py-5 border-b border-[#333333]">
          <h2 id="del-title" className="font-sans text-sm font-bold text-white uppercase tracking-widest">
            Permanently delete post?
          </h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="font-sans text-sm text-[#A1A1AA] leading-relaxed">
            <span className="text-white font-medium">&ldquo;{post.title || "Untitled"}&rdquo;</span> will be permanently deleted. This cannot be undone.
          </p>
          <div>
            <label htmlFor="del-input" className="block font-sans text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-2">
              Type <span className="text-white">DELETE</span> to confirm
            </label>
            <input
              id="del-input"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isPending}
              className="w-full bg-black border border-[#333333] px-4 py-2.5 font-sans text-sm text-white rounded-sm placeholder:text-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-40"
              placeholder="DELETE"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#333333]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="font-sans text-sm font-semibold text-[#A1A1AA] border border-[#333333] px-5 py-2.5 rounded-sm hover:text-white hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={typed !== "DELETE" || isPending}
            className="font-sans text-sm font-semibold bg-[#000000] text-white px-5 py-2.5 rounded-sm hover:opacity-80 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isPending ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function PostList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pendingTrash, setPendingTrash] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [activeTab, debouncedQ]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-posts", activeTab, debouncedQ, page],
    queryFn: () => fetchPosts({ status: activeTab, search: debouncedQ, page }),
    keepPreviousData: true,
    staleTime: 15_000,
  });

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const visiblePosts = pendingTrash
    ? posts.filter((p) => p._id !== pendingTrash.post._id)
    : posts;

  const trashMutation = useMutation({
    mutationFn: trashPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: restorePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePostPermanently,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    },
  });

  const handleTrash = useCallback((post) => {
    const timer = setTimeout(() => {
      trashMutation.mutate(post._id);
      setPendingTrash(null);
    }, 7_000);
    setPendingTrash({ post, timer });
  }, [trashMutation]);

  const handleUndoTrash = useCallback(() => {
    if (!pendingTrash) return;
    clearTimeout(pendingTrash.timer);
    setPendingTrash(null);
  }, [pendingTrash]);

  const handleToastExpire = useCallback(() => {
    setPendingTrash(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black pt-0 pb-8 -mt-5 md:-mt-6">

      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#333333]">
        <div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-1">
            Content
          </p>
          <h1 className="font-syne text-2xl font-bold text-white leading-none">
            Posts
            {!isLoading && (
              <span className="ml-3 font-sans text-sm font-normal text-[#A1A1AA]">
                ({total})
              </span>
            )}
          </h1>
        </div>
        <Link to="/admin/posts/new" className="border border-white rounded-sm text-white px-4 py-2 hover:bg-[#111111] transition-colors font-sans text-sm">
          New Post
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between px-8 border-b border-[#333333] bg-[#0a0a0a]">
        <div role="tablist" aria-label="Filter by status" className="flex">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-4 py-3.5 font-sans text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-inset",
                  isActive
                    ? "border-white text-white"
                    : "border-transparent text-[#A1A1AA] hover:text-white hover:border-[#555555]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative py-2">
          <label htmlFor="posts-search" className="sr-only">Search posts</label>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA] pointer-events-none" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            id="posts-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="bg-black border border-[#333333] pl-9 pr-4 py-2 font-sans text-sm text-white rounded-sm w-56 placeholder:text-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          />
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 space-y-3" aria-busy="true" aria-label="Loading posts">
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="font-sans text-sm text-[#A1A1AA]">Failed to load posts.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-sans text-sm font-semibold text-white border border-[#333333] px-5 py-2.5 rounded-sm hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Try Again
            </button>
          </div>
        ) : (visiblePosts || []).length === 0 ? (
          <EmptyState activeTab={activeTab} debouncedQ={debouncedQ} onNewPost={() => navigate("/admin/posts/new")} />
        ) : (
          <div className="space-y-3 px-4 py-6">
            {(visiblePosts || []).map((post) => (
              <div
                key={post._id}
                className="flex flex-col md:flex-row items-start md:items-center gap-4 p-3 bg-[#111111] border border-[#333333] rounded-sm hover:-translate-y-1 hover:border-white transition-all duration-300 w-full"
              >
                <div className="w-20 h-12 bg-[#0a0a0a] flex-shrink-0 rounded-sm overflow-hidden border border-[#222222]">
                  {post.featuredImageUrl ? (
                    post.featuredImageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                      <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
                        src={`${post.featuredImageUrl}#t=0.1`}
                        preload="metadata"
                        muted={true}
                        playsInline={true}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img src={post.featuredImageUrl} crossOrigin="anonymous" alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#333333]">No image</div>
                  )}
                </div>

                <div className="min-w-0 w-full flex-1">
                  <Link
                    to={`/admin/posts/${post._id}/edit`}
                    className="block font-sans text-sm font-medium text-white break-words overflow-hidden text-ellipsis line-clamp-2 w-full max-w-full hover:text-[#A1A1AA] transition-colors duration-300"
                  >
                    {post.title || <span className="text-[#555555] italic">Untitled</span>}
                  </Link>
                  {post.excerpt && (
                    <p className="mt-0.5 text-sm text-[#777777] line-clamp-2 break-words overflow-hidden text-ellipsis w-full max-w-full">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4">
                    {/* STRICT DRAFT BADGE LOGIC */}
                    <div className="flex flex-col gap-1 mt-1">
                      {post.status !== 'PUBLISHED' ? (
                        <div className="w-fit">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest border border-white/10 flex items-center justify-center">
                            Draft
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-white">
                          Pub: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      
                      {/* Last Edited Date */}
                      <span className="text-xs text-white/50">
                        Edit: {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                    {post.categoryId?.name && (
                      <>
                        <span className="text-[#555555]">|</span>
                        <span className="text-[12px] text-[#A1A1AA]">{post.categoryId.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 sm:ml-auto">
                  {post.status !== 'TRASHED' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/posts/${post._id}/edit`)}
                        className="text-sm font-semibold text-white border border-white px-3 py-1.5 rounded-sm bg-transparent hover:bg-[#111111] transition-colors duration-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTrash(post)}
                        className="text-sm font-semibold text-[#A1A1AA] border border-[#333333] px-3 py-1.5 rounded-sm hover:text-white hover:border-white transition-colors duration-300"
                      >
                        Trash
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => restoreMutation.mutate(post._id)}
                        disabled={restoreMutation.isPending}
                        className="text-sm font-semibold text-[#A1A1AA] border border-[#333333] px-3 py-1.5 rounded-sm hover:text-white hover:border-white transition-colors duration-300 disabled:opacity-40"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(post)}
                        className="text-sm font-semibold text-[#A1A1AA] px-3 py-1.5 rounded-sm hover:text-white transition-colors duration-300"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-8 py-4 border-t border-[#333333] bg-[#0a0a0a]">
          <span className="font-sans text-xs text-[#A1A1AA]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="font-sans text-xs font-semibold text-[#A1A1AA] border border-[#333333] px-4 py-2 rounded-sm hover:text-white hover:border-white transition-colors duration-fast disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="font-sans text-xs font-semibold text-[#A1A1AA] border border-[#333333] px-4 py-2 rounded-sm hover:text-white hover:border-white transition-colors duration-fast disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Permanent delete modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          post={deleteTarget}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Undo toast */}
      {pendingTrash && (
        <UndoToast
          message={`"${pendingTrash.post.title || "Untitled"}" moved to trash`}
          onUndo={handleUndoTrash}
          onExpire={handleToastExpire}
        />
      )}
    </div>
  );
}

