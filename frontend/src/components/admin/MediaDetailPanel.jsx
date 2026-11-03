// frontend/src/components/admin/MediaDetailPanel.jsx
//
// Right-edge slide-in drawer showing the full metadata of a single media
// asset selected from MediaLibrary.jsx's masonry grid. Uses the drawer
// z-index (1001 — above the 999 overlay layer) since it's a persistent
// panel rather than a modal, and doesn't dim the rest of the screen.
//
// Props:
//   media     — { _id, filename, url, mimeType, kind ('image'|'video'),
//                 sizeBytes, width, height, durationSeconds, postId,
//                 createdAt } | null. Rendering null closes the panel.
//   onClose   — () => void
//   onDelete  — (id) => void — parent handles the actual confirm + API call;
//               this just exposes the trigger

import { useEffect, useRef } from "react";

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MediaDetailPanel({ media, onClose, onDelete }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (media) closeRef.current?.focus();
  }, [media]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && media) onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  const isOrphaned = !media.postId;

  return (
    <aside
      role="complementary"
      aria-label="Media details"
      className="fixed top-0 right-0 h-full w-full max-w-sm border-l border-[#333333] bg-[#000000] overflow-y-auto"
      style={{ zIndex: "var(--z-drawer)" }}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#333333]">
        <h2 className="font-sans text-sm font-semibold text-white">Asset Details</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="h-8 w-8 flex items-center justify-center border border-[#333333] rounded-sm text-[#777777] transition-colors duration-fast hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>
      </div>

      {/* Preview */}
      <div className="border-b border-[#333333] bg-[#000000]">
        {media.kind === "video" ? (
          <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} 
            src={media.url} 
            controls 
            playsInline
            className="w-full max-h-64 object-contain" 
          />
        ) : (
          <img src={media.url} alt={media.filename} className="w-full max-h-64 object-contain" />
        )}
      </div>

      {/* Metadata */}
      <dl className="px-6 py-5 space-y-4">
        {isOrphaned && (
          <div className="inline-flex items-center rounded-pill border border-[#333333] px-3 py-1">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-white">
              Unused
            </span>
          </div>
        )}

        <div>
          <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Filename</dt>
          <dd className="font-sans text-sm text-white break-all">{media.filename}</dd>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Type</dt>
            <dd className="font-sans text-sm text-white">{media.mimeType}</dd>
          </div>
          <div>
            <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Size</dt>
            <dd className="font-sans text-sm text-white">{formatBytes(media.sizeBytes)}</dd>
          </div>
        </div>

        {media.kind === "image" && media.width && media.height && (
          <div>
            <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Dimensions</dt>
            <dd className="font-sans text-sm text-white">{media.width} × {media.height}px</dd>
          </div>
        )}

        {media.kind === "video" && media.durationSeconds && (
          <div>
            <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Duration</dt>
            <dd className="font-sans text-sm text-white">{formatDuration(media.durationSeconds)}</dd>
          </div>
        )}

        <div>
          <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Uploaded</dt>
          <dd className="font-sans text-sm text-white">
            {media.createdAt ? new Date(media.createdAt).toLocaleString() : "—"}
          </dd>
        </div>

        <div>
          <dt className="font-sans text-[10px] uppercase tracking-widest text-[#777777] mb-1">Usage</dt>
          <dd className="font-sans text-sm text-white">
            {isOrphaned ? "Not referenced by any post" : "Used in a post"}
          </dd>
        </div>
      </dl>

      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={() => onDelete?.(media._id)}
          disabled={media.isUsed}w
          className="w-full rounded-sm border border-[#333333] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-ink-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete Asset
        </button>
      </div>
    </aside>
  );
}
