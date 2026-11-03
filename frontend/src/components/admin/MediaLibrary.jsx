// frontend/src/components/admin/MediaLibrary.jsx
//
// Central media asset browser for /admin/media.
// Renders a responsive CSS grid of uploaded images and videos with:
//
//   ┌─── Top Rail ──────────────────────────────────────────────┐
//   │  [All] [Images] [Videos] [Unused/Orphaned]   [Upload]     │
//   └───────────────────────────────────────────────────────────┘
//   ┌─── Asset Grid ─────────────────────────────────────────────┐
//   │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
//   │  │ img  │  │ vid  │  │ img  │  │ img  │  │ vid  │       │
//   │  │      │  │      │  │ UNUSED│  │      │  │      │       │
//   │  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘       │
//   └───────────────────────────────────────────────────────────┘
//
// ── FILTER LOGIC ──────────────────────────────────────────────────────────
//   'all'     → GET /api/admin/media
//   'IMAGE'   → GET /api/admin/media?kind=IMAGE
//   'VIDEO'   → GET /api/admin/media?kind=VIDEO
//   'orphaned'→ GET /api/admin/media?orphaned=true
//
//   "Unused/Orphaned" = media records where postId is null/undefined.
//   Backend filters on this query param; badge is rendered client-side.
//
// ── KEYBOARD NAVIGATION ──────────────────────────────────────────────────
//   Filter tabs: Tab moves between tabs; Enter/Space activates.
//   Grid cells:  Tab enters the grid (first cell). Arrow keys navigate
//                within the grid using a roving-tabindex pattern.
//                Enter/Space selects. Delete/Backspace opens delete confirm.
//   Modal:       Focus trapped inside; Escape closes if not processing.
//
// ── MODES ────────────────────────────────────────────────────────────────
//   'library' (default): full admin page — shows delete controls, bulk actions.
//   'picker':            embedded in the editor — clicking selects a file,
//                        no delete controls, header shows "Select Media".

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api.js";
import MediaPreviewModal from "./MediaPreviewModal.jsx";

function getFileType(url, item) {
  if (item?.kind) {
    const k = item.kind.toLowerCase();
    if (k === 'audio') return 'audio';
    if (k === 'video') return 'video';
    if (k === 'document' || k === 'pdf') return 'document';
    if (k === 'image') return 'image';
  }
  if (item?.mimeType) {
    if (item.mimeType.startsWith('audio/')) return 'audio';
    if (item.mimeType.startsWith('video/')) return 'video';
    if (item.mimeType.includes('pdf') || item.mimeType.includes('document')) return 'document';
    if (item.mimeType.startsWith('image/')) return 'image';
  }
  if (!url) return 'image';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'mpeg', 'aac', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
  return 'image';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'ALL',    label: 'All' },
  { id: 'IMAGES', label: 'Images' },
  { id: 'VIDEOS', label: 'Videos' },
  { id: 'AUDIO',  label: 'Audio' },
  { id: 'DOCS',   label: 'Docs' },
  { id: 'UNUSED', label: 'Unused', badge: true },
];

const PAGE_LIMIT = 24;
const GRID_COL_MIN = 160; // px — used for arrow-key column calculation

// ─── API helpers ─────────────────────────────────────────────────────────────

// Map frontend tab id → backend query params
const TAB_TO_BACKEND_KIND = {
  IMAGES: 'IMAGE',
  VIDEOS: 'VIDEO',
  AUDIO:  'AUDIO',
  DOCS:   'DOCUMENT',
};

async function fetchMedia({ filter, page }) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  if (filter === 'UNUSED') {
    params.set('orphaned', 'true');
  } else if (filter !== 'ALL' && TAB_TO_BACKEND_KIND[filter]) {
    params.set('kind', TAB_TO_BACKEND_KIND[filter]);
  }
  const { data } = await api.get(`/api/admin/media?${params.toString()}`);
  return data; // expected: { items: Media[], total: number, page: number, totalPages: number }
}

async function deleteMediaById(id, force = false) {
  try {
    await api.delete(`/api/admin/media/${id}${force ? '?force=true' : ''}`);
    return id;
  } catch (error) {
    if (error.response?.status === 409 && error.response?.data?.isUsed) {
      const confirmForceDelete = window.confirm(`${error.response.data.message}\n\nAre you sure you want to forcefully delete it?`);
      if (confirmForceDelete) {
        return deleteMediaById(id, true); // re-trigger with force flag
      }
    } else {
      alert(error.response?.data?.error || 'Failed to delete media');
    }
    throw error;
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function resolveUrl(url) {
  if (!url) return '';
  return url;
}

/** Detect grid column count from container width and minimum cell width. */
function getColCount(containerWidth) {
  return Math.max(1, Math.floor(containerWidth / GRID_COL_MIN));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Loading skeleton cell — matches the card aspect ratio. */
function SkeletonCard() {
  return (
    <div className="w-full aspect-square bg-[#111111] border border-[#222222] rounded-[16px] animate-pulse flex items-center justify-center">
      <div className="w-12 h-12 rounded-md bg-[#222222]"></div>
    </div>
  );
}

/** "Unused / Orphaned" badge chip. */
function OrphanBadge() {
  return (
    <span
      role="img"
      aria-label="Unused — not linked to any post"
      title="This file is not attached to any post"
      className="inline-flex items-center gap-1 px-1.5 py-0.5
                 font-sans text-[10px] font-bold uppercase tracking-wide
                 border border-[#333333] text-white bg-[#000000] leading-none"
    >
      <span aria-hidden="true">●</span> Unused
    </span>
  );
}

/** Kind badge (IMAGE / VIDEO). */
function KindBadge({ url, kind, onClick }) {
  const type = getFileType(url) || (kind || '').toLowerCase();
  let text = '⬛ Image';
  if (type === 'video') text = '▶ Video';
  if (type === 'audio') text = '🎵 Audio';
  if (type === 'document') text = '📄 Doc';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title="Preview Media"
      className="inline-flex items-center px-1.5 py-0.5
                 font-sans text-[10px] font-bold uppercase tracking-wide
                 bg-[#000000] border border-[#333333] text-white hover:border-white hover:bg-[#111111] leading-none focus:outline-none cursor-pointer"
    >
      {text}
    </button>
  );
}

/** Delete confirmation modal. */
function DeleteModal({ item, onConfirm, onCancel, isDeleting }) {
  const modalRef = useRef(null);
  const cancelRef = useRef(null);

  // Focus the cancel button on open (safer default for destructive actions)
  useEffect(() => { cancelRef.current?.focus(); }, []);

  // Escape key → cancel (unless deleting)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !isDeleting) onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDeleting, onCancel]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 'var(--z-overlay)', backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-modal-title"
        aria-describedby="del-modal-desc"
        className="w-full max-w-sm bg-[#000000] border border-[#333333]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#333333]">
          <h3
            id="del-modal-title"
            className="font-sans text-sm font-bold text-white uppercase tracking-wide"
          >
            Delete Media
          </h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p
            id="del-modal-desc"
            className="font-sans text-sm text-white leading-relaxed"
          >
            Permanently delete{' '}
            <span className="font-bold">{item.originalName || item.filename}</span>?
            {item.postId && (
              <span className="block mt-1 text-[#777777] text-xs">
                This file is still linked to a post. Deleting it here will orphan that reference.
              </span>
            )}
          </p>
          <p className="font-sans text-xs text-[#777777]">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#333333]">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 font-sans text-sm font-bold text-white
                       border border-[#333333] hover:border-[#333333]
                       transition-colors duration-[var(--duration-fast)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 font-sans text-sm font-bold
                       bg-transparent border border-[#333333] text-white hover:border-white
                       transition-colors duration-[var(--duration-fast)]
                       focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting…' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * MediaLibrary
 *
 * @param {Object}    props
 * @param {'library'|'picker'} [props.mode='library']
 *   'library' = full admin view with delete controls.
 *   'picker'  = embedded in editor; clicking selects the file.
 * @param {Function}  [props.onSelect]
 *   In 'picker' mode: called with the selected Media record.
 * @param {Function}  [props.onUploadClick]
 *   Optional: called when the Upload button is pressed (parent handles the
 *   actual upload dialog if needed). If omitted, the button is not rendered.
 */
export default function MediaLibrary({
  mode = 'library',
  onSelect,
  onUploadClick,
}) {
  const isPickerMode = mode === 'picker';

  // ── Filter & pagination state ───────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // Media | null
  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimeoutRef = useRef(null);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [previewItem, setPreviewItem] = useState(null);

  const gridRef = useRef(null);
  const filterTabIds = useId();

  const queryClient = useQueryClient();

  // ── Data fetching ───────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-media', activeFilter, page],
    queryFn: () => fetchMedia({ filter: activeFilter, page }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasMore = page < totalPages;

  // Reset to page 1 when filter changes
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setPage(1);
    setSelectedId(null);
    setFocusedIdx(0);
  };

  // ── Delete mutation with Undo ───────────────────────────────────────────
  const handleDeleteClick = (media) => {
    // Optimistically hide it
    setPendingDelete(media);
    
    // Wait 7 seconds before actual API call
    deleteTimeoutRef.current = setTimeout(async () => {
        try {
            await api.delete(`/api/admin/media/${media._id}`);
            setPendingDelete(null);
            // Trigger fetchMedia() here to refresh state
            queryClient.invalidateQueries({ queryKey: ['admin-media'] });
        } catch (err) {
            console.error(err);
            setPendingDelete(null); // Revert on fail
        }
    }, 7000);
  };

  const handleUndo = () => {
    clearTimeout(deleteTimeoutRef.current);
    setPendingDelete(null); // Instantly put it back
  };

  // ── Grid keyboard navigation (roving tabindex) ──────────────────────────
  const handleGridKeyDown = useCallback((e) => {
    if (!items.length) return;

    // Determine column count from container width
    const containerWidth = gridRef.current?.offsetWidth ?? 640;
    const cols = getColCount(containerWidth);

    let next = focusedIdx;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        next = Math.min(items.length - 1, focusedIdx + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        next = Math.max(0, focusedIdx - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        next = Math.min(items.length - 1, focusedIdx + cols);
        break;
      case 'ArrowUp':
        e.preventDefault();
        next = Math.max(0, focusedIdx - cols);
        break;
      case 'Home':
        e.preventDefault();
        next = 0;
        break;
      case 'End':
        e.preventDefault();
        next = items.length - 1;
        break;
      default:
        return;
    }

    setFocusedIdx(next);
    // Focus the newly active card
    const cards = gridRef.current?.querySelectorAll('[data-grid-cell]');
    if (cards?.[next]) {
      (cards[next]).focus();
    }
  }, [focusedIdx, items.length]);

  // When a grid cell receives focus via pointer, sync the focused index
  const handleCellFocus = (idx) => setFocusedIdx(idx);

  // ── Item selection ──────────────────────────────────────────────────────
  const handleItemActivate = (item, idx) => {
    setSelectedId(item._id);
    setFocusedIdx(idx);
    if (isPickerMode && onSelect) onSelect(item);
  };

  // ── Handle Delete key on focused cell ──────────────────────────────────
  const handleCellKeyDown = (e, item) => {
    if (!isPickerMode && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      handleDeleteClick(item);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemActivate(item, focusedIdx);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────
  const isOrphaned = (item) => item.isUsed === false;

  // Client-side filter as a safety net (backend may not store `kind` on older records)
  const filteredMedia = (items || []).filter((item) => {
    const itemType = (item?.mimeType || item?.type || '').toLowerCase();
    const itemKind = (item?.kind || '').toUpperCase();
    if (activeFilter === 'ALL')    return true;
    if (activeFilter === 'IMAGES') return itemKind === 'IMAGE'  || itemType.startsWith('image/');
    if (activeFilter === 'VIDEOS') return itemKind === 'VIDEO'  || itemType.startsWith('video/');
    if (activeFilter === 'AUDIO')  return itemKind === 'AUDIO'  || itemType.startsWith('audio/');
    if (activeFilter === 'DOCS')   return itemKind === 'DOCUMENT' || itemType.includes('pdf') || itemType.includes('document');
    if (activeFilter === 'UNUSED') return item.isUsed === false;
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#000000]">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
        <h2 className="font-sans text-sm font-bold text-white uppercase tracking-widest">
          {isPickerMode ? 'Select Media' : 'Media Library'}
        </h2>

        <div className="flex items-center gap-3">
          {/* Item count */}
          {!isLoading && (
            <span className="font-sans text-xs text-[#777777] tabular-nums">
              {total} {total === 1 ? 'file' : 'files'}
            </span>
          )}

          {/* Upload trigger */}
          {onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wide
                         bg-[#000000] text-white
                         hover:bg-[#000000]
                         transition-colors duration-[var(--duration-fast)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
            >
              + Upload
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tab rail ───────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Media filter"
        className="flex items-stretch border-b border-[#333333] px-6 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`${filterTabIds}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${filterTabIds}-panel`}
              onClick={() => handleFilterChange(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-3 flex-shrink-0',
                'font-sans text-xs font-bold uppercase tracking-wide',
                'border-b-2 -mb-px transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset',
                isActive
                  ? 'border-[#333333] text-white'
                  : 'border-transparent text-[#777777] hover:text-white hover:border-[#333333]/30',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Grid panel ───────────────────────────────────────────────── */}
      <div
        id={`${filterTabIds}-panel`}
        role="tabpanel"
        aria-label={`${FILTER_TABS.find(t => t.id === activeFilter)?.label} media`}
        className="flex-1 overflow-y-auto px-6 py-5"
      >

        {/* Loading state — skeletons */}
        {isLoading && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            aria-label="Loading media files"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i} 
                className="w-full aspect-square bg-[#1a1a1a] border border-[#222222] rounded-[24px] animate-pulse"
              ></div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="font-sans text-sm text-white font-bold">
              Failed to load media
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 font-sans text-xs font-bold text-white
                         border border-[#333333] hover:border-[#333333]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {(!isLoading && !isError && (items || []).length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <MediaEmptyIcon className="w-10 h-10 text-[#777777]" />
            <p className="font-sans text-sm font-bold text-white">
              {activeFilter === 'orphaned'
                ? 'No unused files'
                : activeFilter === 'IMAGE'
                  ? 'No images uploaded yet'
                  : activeFilter === 'VIDEO'
                    ? 'No videos uploaded yet'
                    : 'No media files yet'}
            </p>
            <p className="font-sans text-xs text-[#777777]">
              {activeFilter === 'orphaned'
                ? 'All files are currently attached to posts.'
                : 'Upload your first file to get started.'}
            </p>
          </div>
        )}

        {/* Empty state for filtered results */}
        {!isLoading && !isError && filteredMedia.length === 0 && (items || []).length > 0 && (
          <div className="col-span-full py-20 text-center text-[#A1A1AA] font-sans text-sm">
            No files found in this category.
          </div>
        )}

        {/* Asset grid */}
        {!isLoading && !isError && (
          <div
            ref={gridRef}
            onKeyDown={handleGridKeyDown}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            aria-label={`Media grid, ${filteredMedia.length} items shown`}
          >
            {filteredMedia.length > 0 && filteredMedia.map((item, idx) => {
              if (!item || !item._id || !item.url) return null;
              if (item._id === pendingDelete?._id) return null;

              const orphaned = isOrphaned(item);
              const isSelected = selectedId === item._id;
              const isFocused = focusedIdx === idx;
              
              const isAudio = (url) => url && url.match(/\.(mp3|wav|ogg)$/i);
              const isPdf = (url) => url && url.match(/\.(pdf)$/i);

              return (
                <div
                  key={item._id || item.filename}
                  data-grid-cell
                  role="gridcell"
                  tabIndex={isFocused ? 0 : -1}
                  aria-label={[
                    item.originalName || item.filename,
                    item.kind === 'VIDEO' ? 'Video' : 'Image',
                    formatBytes(item.sizeBytes),
                    orphaned ? '— Unused' : '',
                    isSelected ? '— selected' : '',
                  ].filter(Boolean).join(', ')}
                  aria-selected={isSelected}
                  onFocus={() => handleCellFocus(idx)}
                  onClick={() => handleItemActivate(item, idx)}
                  onKeyDown={(e) => handleCellKeyDown(e, item)}
                  className={[
                    'relative group border cursor-pointer overflow-hidden',
                    'transition-all duration-[var(--duration-fast)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1',
                    isSelected
                      ? 'border-[#333333] ring-2 ring-white ring-offset-1'
                      : 'border-[#333333] hover:border-[#333333]',
                  ].join(' ')}
                >
                  {/* Media preview */}
                  <div
                    className="aspect-square bg-[#000000] overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewItem(item);
                    }}
                  >
                    {getFileType(item.url, item) === 'audio' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#2d1b4e] text-white p-4">
                        <div className="text-5xl mb-3 shadow-sm">🎵</div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center truncate w-full opacity-90">{item.originalName || item.filename}</span>
                      </div>
                    ) : getFileType(item.url, item) === 'document' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#f5f5f5] text-[#333333] relative">
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider shadow-sm">DOC</div>
                        <div className="text-5xl mb-2 text-[#555555]">📄</div>
                        <span className="text-[9px] font-bold text-center truncate w-[90%] opacity-80 px-2">{item.originalName || item.filename}</span>
                      </div>
                    ) : getFileType(item.url, item) === 'video' ? (
                      <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} preload="metadata" playsInline src={`${resolveUrl(item.url)}#t=0.1`} className="w-full h-full object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-105" muted />
                    ) : (
                      <img
                        src={resolveUrl(item.url)}
                        alt={item.originalName || item.filename}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    )}

                    {/* Image fallback (shown via onError above) */}
                    <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center bg-[#000000]">
                      <BrokenImageIcon className="w-8 h-8 text-[#777777]" />
                    </div>
                  </div>

                  {/* Bottom metadata strip */}
                  <div className="px-2 py-1.5 bg-[#000000] border-t border-[#333333]">
                    {/* Badges row */}
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <KindBadge url={item.url} kind={item.kind} onClick={() => setPreviewItem(item)} />
                      {orphaned && <OrphanBadge />}
                    </div>

                    {/* Filename */}
                    <p
                      className="font-sans text-[11px] text-white truncate leading-tight"
                      title={item.originalName || item.filename}
                    >
                      {item.originalName || item.filename}
                    </p>

                    {/* Size */}
                    <p className="font-sans text-[10px] text-[#777777] tabular-nums">
                      {formatBytes(item.sizeBytes)}
                    </p>
                  </div>

                  {/* Hover action overlay (delete) — library mode only */}
                  {!isPickerMode && (
                    <div
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
                                 transition-opacity duration-[var(--duration-fast)]"
                    >
                      <button
                        type="button"
                        tabIndex={-1}             /* Grid arrow-key nav owns focus routing */
                        onClick={(e) => {
                          e.stopPropagation();    /* Don't also fire the card's select */
                          handleDeleteClick(item);
                        }}
                        disabled={item.isUsed}
                        aria-label={`Delete ${item.originalName || item.filename}`}
                        className="w-6 h-6 flex items-center justify-center
                                   bg-[#000000] border border-[#333333] text-white
                                   hover:border-white
                                   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div
                      aria-hidden="true"
                      className="absolute top-1 left-1 w-5 h-5 bg-[#000000] border border-[#333333] flex items-center justify-center"
                    >
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {!isLoading && !isError && hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="px-6 py-2.5 font-sans text-sm font-bold text-white
                         border border-[#333333] hover:border-[#333333]
                         transition-colors duration-[var(--duration-fast)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isFetching ? 'Loading…' : `Load More (${total - items.length} remaining)`}
            </button>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ──────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* ── Preview Modal ──────────────────────────────────────────────── */}
      {previewItem && (
        <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* ── Undo Deletion Popup ────────────────────────────────────────── */}
      {pendingDelete && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-[#111111] border border-[#333333] text-white px-6 py-4 rounded-full shadow-2xl flex items-center justify-between gap-6 z-50">
              <span className="text-sm tracking-wide">Deleting file...</span>
              <button onClick={handleUndo} className="text-[#A1A1AA] hover:text-white text-sm font-bold tracking-widest uppercase transition-colors">
                  Undo
              </button>
          </div>
      )}
    </div>
  );
}

// ─── Inline icons ─────────────────────────────────────────────────────────────
// Self-contained SVGs so the component has zero icon-library dependencies.

function VideoIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function BrokenImageIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm4.5-1.929h.008v.008H18V10.07z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function MediaEmptyIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 16l5-5 4 4 3-3 6 6" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  );
}

