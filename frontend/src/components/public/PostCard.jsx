// frontend/src/components/public/PostCard.jsx
//
// Feed magazine card — dark theme per DESIGN.md:
//   - background: color.surface.base (#000000)
//   - border:     color.border.default (#333333)
//   - title:      font.size.2xl (24px), color.text.primary (#ffffff)
//   - author/date: font.size.xs (12px), color.text.tertiary (#777777)
//   - category pill: color.surface.element (#111111), white text
//   - hover: image scale-105, category pill inverts to white bg/black text
//
// Props:
//   post — { slug, title, excerpt, featuredImageUrl,
//             categoryId: { name, slug }, authorId: { name }, publishedAt }

import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function PostCard({ post }) {
  const category = post?.categoryId;
  const author   = post?.authorId;
  const videoRef = useRef(null);
  const interactionTimerRef = useRef(null);
  const isTouchDeviceRef = useRef(false);

  const isVideo = post?.featuredImageUrl && (
    post.featuredImageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || 
    post.featuredImageUrl.includes('video') ||
    post?.coverKind === 'VIDEO'
  );

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      isTouchDeviceRef.current = true;
    }
  }, []);

  const handleStartInteraction = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => {
        if (videoRef.current) videoRef.current.pause();
      }, 7500); 
    }
  };

  const handleEndInteraction = () => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0.1; 
    }
  };

  const interactionHandlers = isTouchDeviceRef.current ? {
    onTouchStart: handleStartInteraction,
    onTouchEnd: handleEndInteraction,
    onFocus: handleStartInteraction,
    onBlur: handleEndInteraction
  } : {
    onMouseEnter: handleStartInteraction,
    onMouseLeave: handleEndInteraction
  };

  return (
    <article
      className="group flex flex-col border border-[#333333] bg-[#000000] relative"
    >
      {/* Absolute Floating Pin Icon */}
      {post?.isPinned && (
        <div 
          className="absolute top-3 right-3 z-[60] bg-black/70 backdrop-blur-md border border-white/20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg pointer-events-none"
        >
          <span className="text-[1.1rem]">📌</span>
        </div>
      )}
      {/* ── Media frame ─────────────────────────────────────────────── */}
      <Link
        to={`/blog/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block overflow-hidden"
      >
        <div 
          className="aspect-[3/2] w-full bg-[#111111] relative overflow-hidden group"
          {...interactionHandlers}
        >
          {post.featuredImageUrl ? (
            isVideo ? (
              <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
                ref={videoRef}
                src={`${post.featuredImageUrl}#t=0.001`}
                preload="metadata"
                muted={true}
                loop={false}
                playsInline={true}
                crossOrigin="anonymous"
                onLoadedData={(e) => { e.target.currentTime = 0.1; }}
                className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-105"
              />
            ) : (
              <img
                src={post.featuredImageUrl}
                alt={post.title || "Blog Cover"}
                loading="lazy"
                crossOrigin="anonymous"
                className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-105"
                onError={(e) => { e.target.src = '/fallback-image-url.jpg'; }}
              />
            )
          ) : (
            /* Empty frame placeholder */
            <div className="h-full w-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="28" height="28" rx="1" stroke="#333333" strokeWidth="1" />
                <circle cx="11" cy="11" r="2.5" stroke="#333333" strokeWidth="1" />
                <path d="M2 22l8-8 5 5 4-4 11 9" stroke="#333333" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Title — DESIGN.md: font.size.2xl = 24px, color.text.primary = #ffffff */}
        <Link
          to={`/blog/${post.slug}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
        >
          <h3 className="font-syne text-2xl font-semibold leading-snug text-white link-underline">
            {post.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="line-clamp-2 font-sans text-sm leading-relaxed" style={{ color: "#777777" }}>
            {post.excerpt}
          </p>
        )}

        {/* Meta row — DESIGN.md: font.size.xs, color.text.tertiary (#777777) */}
        <div className="mt-auto flex items-center gap-2 font-sans text-xs" style={{ color: "#777777" }}>
          {author?.name && <span>{author.name}</span>}
          {author?.name && post.publishedAt && (
            <span aria-hidden="true">&middot;</span>
          )}
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
        </div>
      </div>
    </article>
  );
}
