// frontend/src/components/public/Lightbox.jsx
//
// Mobile-optimized image lightbox (App Flow §2.3 "Mobile Lightbox";
// UI & UX §A11y table "Lightbox exit"). Exact documented behavior:
//   - Tap to open (caller's responsibility — this component is the
//     opened overlay itself).
//   - Pinch-to-zoom, clamped 1x–4x.
//   - Double-tap toggles between 1x and 2x.
//   - Swipe down to dismiss, but ONLY when zoom is at 1x — at any
//     zoom > 1x, a downward drag pans the image instead of dismissing.
//   - ~96px vertical drag threshold to commit the dismiss (App Flow
//     "Implementation Constants").
//   - Escape key also closes (keyboard parity with touch swipe).
//   - Inline retry state if the image fails to load.
//
// Pure Black & White: the scrim is the only departure from white,
// using black at reduced opacity rather than a flat color block, and
// has no shadow — depth comes entirely from the scrim itself.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_MAX_DELAY_MS = 300;
const SWIPE_DISMISS_THRESHOLD_PX = 96;

const isVideo = (url) => typeof url === 'string' && url.match(/\.(mp4|webm|ogg)$/i);
const isAudio = (url) => typeof url === 'string' && url.match(/\.(mp3|wav|ogg|aac|m4a)$/i);
const isDocument = (url) => typeof url === 'string' && url.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i);

function getDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function getMidpoint(touches) {
  const [a, b] = touches;
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

/**
 * @param {object} props
 * @param {string} props.src
 * @param {string} [props.alt='']
 * @param {() => void} props.onClose
 */
export default function Lightbox({ src, alt = "", onClose }) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const containerRef = useRef(null);
  const lastTapRef = useRef(0);

  // Gesture tracking refs — not React state, since these update on
  // every touchmove and must never trigger a re-render mid-gesture.
  // NOTE: startMidpoint is captured but not currently used to anchor
  // the zoom around the pinch point — zoom is center-anchored via the
  // CSS transform-origin default instead, a deliberate simplification.
  // True pinch-anchored zoom would need to offset `translate` based on
  // the midpoint's position relative to the image center; left as a
  // documented follow-up rather than added speculatively.
  const gestureRef = useRef({
    mode: null, // 'pinch' | 'pan-or-swipe' | null
    startDistance: 0,
    startScale: 1,
    startMidpoint: { x: 0, y: 0 },
    startTranslate: { x: 0, y: 0 },
    singleTouchStart: { x: 0, y: 0 },
    isVerticalSwipeCandidate: false,
  });

  // --- Escape key closes (keyboard parity with touch swipe) ----------------
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus the overlay on mount so Escape works immediately without
  // requiring an extra tap first.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const handleTouchStart = (e) => {
    const touches = e.touches;

    if (touches.length === 2) {
      gestureRef.current.mode = "pinch";
      gestureRef.current.startDistance = getDistance(touches);
      gestureRef.current.startScale = scale;
      gestureRef.current.startMidpoint = getMidpoint(touches);
      gestureRef.current.startTranslate = translate;
      return;
    }

    if (touches.length === 1) {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_MAX_DELAY_MS;
      lastTapRef.current = now;

      if (isDoubleTap) {
        // Double tap: toggle between 1x and 2x.
        if (scale > MIN_SCALE) {
          setScale(MIN_SCALE);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(DOUBLE_TAP_SCALE);
        }
        gestureRef.current.mode = null;
        return;
      }

      gestureRef.current.mode = "pan-or-swipe";
      gestureRef.current.singleTouchStart = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
      gestureRef.current.startTranslate = translate;
      // Swipe-to-dismiss is only ever a candidate when zoom is exactly
      // 1x — this is decided once per gesture, at touch start, per the
      // documented "Swipe down to dismiss only when zoom is 1x" rule.
      gestureRef.current.isVerticalSwipeCandidate = scale === MIN_SCALE;
    }
  };

  const handleTouchMove = (e) => {
    const touches = e.touches;
    const g = gestureRef.current;

    if (g.mode === "pinch" && touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(touches);
      const ratio = newDistance / (g.startDistance || 1);
      setScale(clampScale(g.startScale * ratio));
      return;
    }

    if (g.mode === "pan-or-swipe" && touches.length === 1) {
      const dx = touches[0].clientX - g.singleTouchStart.x;
      const dy = touches[0].clientY - g.singleTouchStart.y;

      if (g.isVerticalSwipeCandidate) {
        // At 1x zoom: track the swipe as a translate so the image
        // visibly follows the finger, giving feedback before the
        // dismiss threshold is reached.
        e.preventDefault();
        setTranslate({ x: 0, y: Math.max(0, dy) });
      } else if (scale > MIN_SCALE) {
        // Zoomed in: the same gesture pans the image instead.
        e.preventDefault();
        setTranslate({
          x: g.startTranslate.x + dx,
          y: g.startTranslate.y + dy,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    const g = gestureRef.current;

    if (g.mode === "pan-or-swipe" && g.isVerticalSwipeCandidate) {
      if (translate.y >= SWIPE_DISMISS_THRESHOLD_PX) {
        onClose();
        return;
      }
      // Under threshold: snap back rather than leaving the image
      // partially dragged.
      setTranslate({ x: 0, y: 0 });
    }

    g.mode = null;
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  };

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image viewer"}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm focus-visible:outline-none"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute right-6 top-6 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/80 border-2 border-white text-white text-3xl font-bold transition-all focus-visible:outline-none"
      >
        &times;
      </button>

      {hasError ? (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <p className="font-sans text-base text-ink-inverse">
            This image couldn&rsquo;t load.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-sm border border-ink-inverse px-4 py-2 font-sans text-sm font-medium text-ink-inverse"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {isLoading && (
            <div
              aria-hidden="true"
              className="absolute h-10 w-10 animate-pulse rounded-pill border-2 border-ink-inverse"
            />
          )}
          {isAudio(src) ? (
            <div
              key={retryKey}
              className="flex flex-col items-center justify-center w-full px-4 z-10"
              style={{ opacity: isLoading ? 0 : 1, transition: "opacity 200ms" }}
            >
              {/* Main Player Card */}
              <div className="w-full max-w-2xl bg-[#111111] border border-[#222222] rounded-[40px] p-10 md:p-16 shadow-2xl flex flex-col items-center gap-8">
                
                {/* 3D Music Icon / Visualizer Placeholder */}
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-[#deff9a] to-[#a3cfbb] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(222,255,154,0.2)]">
                  <i className="fa-solid fa-music text-black text-5xl md:text-6xl">🎵</i>
                </div>

                {/* File Info */}
                <div className="text-center w-full px-4">
                  <h3 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-2 truncate">
                    {alt || 'Audio File'}
                  </h3>
                  <p className="text-[#A1A1AA] text-sm tracking-widest uppercase">Now Playing</p>
                </div>

                {/* The Actual Player - Wide & Large */}
                <div className="w-full">
                  <audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} 
                    controls 
                    src={src} 
                    className="w-full h-14 scale-[1.02] md:scale-105 filter invert outline-none" 
                    autoPlay 
                    onLoadedData={() => setIsLoading(false)} 
                    onError={() => { setIsLoading(false); setHasError(true); }}
                  />
                </div>
              </div>
            </div>
          ) : src.toLowerCase().endsWith('.pdf') ? (
            <div
              key={retryKey}
              className="w-[90vw] h-[85vh] bg-white rounded-sm overflow-hidden flex flex-col shadow-2xl z-10"
              style={{ opacity: isLoading ? 0 : 1, transition: "opacity 200ms" }}
            >
              <object data={src.startsWith('http') ? src : `${(import.meta.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com').replace(/\/+$/, "")}${src}`} type="application/pdf" className="w-full h-full" onLoad={() => setIsLoading(false)} onError={() => { setIsLoading(false); setHasError(true); }}>
                  <div className="flex flex-col items-center justify-center h-full p-10 bg-[#0a0a0a]">
                      <p className="text-white mb-4">Your browser cannot display this PDF.</p>
                      <a href={src.startsWith('http') ? src : `${(import.meta.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com').replace(/\/+$/, "")}${src}`} target="_blank" rel="noreferrer" className="bg-white text-black px-6 py-2 rounded-full font-bold">Download PDF</a>
                  </div>
              </object>
            </div>
          ) : isDocument(src) ? (
            <div
              key={retryKey}
              className="flex flex-col items-center justify-center p-10 bg-[#0a0a0a] rounded-2xl border border-[#222222] shadow-2xl z-10"
              style={{ opacity: isLoading ? 0 : 1, transition: "opacity 200ms" }}
              onLoad={() => setIsLoading(false)}
            >
              <div className="text-7xl mb-4">📄</div>
              <h3 className="text-white text-lg mb-6 truncate max-w-md">{alt || 'Document'}</h3>
              <a href={src.startsWith('http') ? src : `${(import.meta.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com').replace(/\/+$/, "")}${src}`} target="_blank" rel="noreferrer" className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-[#daffde] transition-all">
                  Open / Download File
              </a>
            </div>
          ) : isVideo(src) ? (
            <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
              key={retryKey}
              src={src}
              controls
              autoPlay
              playsInline
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl z-10"
              style={{
                opacity: isLoading ? 0 : 1,
              }}
            />
          ) : (
            <img
              key={retryKey}
              src={src}
              alt={alt}
              draggable={false}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transition: gestureRef.current.mode ? "none" : "transform 200ms ease-out",
                touchAction: "none",
                opacity: isLoading ? 0 : 1,
              }}
              className="max-h-[90vh] max-w-[90vw] select-none object-contain rounded-lg shadow-2xl z-10"
            />
          )}
        </>
      )}
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}
