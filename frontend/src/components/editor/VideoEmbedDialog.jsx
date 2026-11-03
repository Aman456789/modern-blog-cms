// frontend/src/components/editor/VideoEmbedDialog.jsx
//
// Modal for embedding an external video (YouTube or Vimeo) into the
// TipTap canvas via a pasted URL, as distinct from CompressionMeter.jsx
// (which handles uploading and compressing a LOCAL video file). Parses
// the pasted URL client-side to identify provider + video ID and shows a
// thumbnail/title-less preview confirmation before insertion — nothing
// is uploaded to the backend here, this only ever produces an embed
// reference for CustomVideoNode.js to render.
//
// Props:
//   onClose    — () => void
//   onConfirm  — ({ provider: 'youtube' | 'vimeo', videoId, url }) => void

import { useMemo, useRef, useState, useEffect } from "react";

// ── URL parsing ──────────────────────────────────────────────────────────────

function parseVideoUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  // youtube.com/watch?v=ID, youtube.com/shorts/ID, youtu.be/ID
  if (host === "youtube.com" || host === "m.youtube.com") {
    const watchId = url.searchParams.get("v");
    if (watchId) return { provider: "youtube", videoId: watchId };

    const shortsMatch = url.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch) return { provider: "youtube", videoId: shortsMatch[1] };

    return null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.replace("/", "");
    return id ? { provider: "youtube", videoId: id } : null;
  }

  // vimeo.com/ID
  if (host === "vimeo.com") {
    const match = url.pathname.match(/^\/(\d+)/);
    return match ? { provider: "vimeo", videoId: match[1] } : null;
  }

  return null;
}

function getThumbnailUrl(parsed) {
  if (!parsed) return null;
  if (parsed.provider === "youtube") {
    return `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`;
  }
  return null; // Vimeo thumbnails require an oEmbed API call; omitted for a local-only build.
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoEmbedDialog({ onClose, onConfirm }) {
  const [rawUrl, setRawUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const parsed = useMemo(() => (rawUrl.trim() ? parseVideoUrl(rawUrl) : null), [rawUrl]);
  const showError = rawUrl.trim().length > 0 && parsed === null;
  const thumbnailUrl = getThumbnailUrl(parsed);

  const handleConfirm = () => {
    if (!parsed) return;
    onConfirm?.({ ...parsed, url: rawUrl.trim() });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 flex items-center justify-center px-4 bg-black/70"
      style={{ zIndex: "var(--z-overlay)" }}
    >
      <div
        className="w-full max-w-md border border-[#333333] rounded-md bg-[#000000] p-8"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id="embed-title" className="font-sans text-base font-semibold text-white">
          Embed a video
        </h2>
        <p className="mt-1 font-sans text-sm text-[#777777]">
          Paste a YouTube or Vimeo link.
        </p>

        <div className="mt-5">
          <label htmlFor="embed-url" className="sr-only">
            Video URL
          </label>
          <input
            ref={inputRef}
            id="embed-url"
            type="url"
            value={rawUrl}
            onChange={(e) => setRawUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && parsed) handleConfirm();
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={showError}
            className="w-full rounded-sm border border-[#333333] bg-[#000000] px-4 py-2.5 font-sans text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
          {showError && (
            <p role="alert" className="mt-2 font-sans text-xs text-white">
              That doesn't look like a YouTube or Vimeo link.
            </p>
          )}
        </div>

        {parsed && (
          <div className="mt-5 border border-[#333333] rounded-sm overflow-hidden">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" crossOrigin="anonymous" className="w-full aspect-video object-cover bg-[#000000]" />
            ) : (
              <div className="w-full aspect-video bg-[#000000] flex items-center justify-center">
                <span className="font-sans text-xs uppercase tracking-widest text-[#777777]">
                  {parsed.provider} video
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!parsed}
            className="flex-1 rounded-sm bg-ink-primary px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-ink-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
          >
            Insert Video
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#333333] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
