// frontend/src/components/public/RelatedPosts.jsx
//
// Dynamic horizontal recommendation row (file_directory.txt), rendered
// beneath a SinglePost.jsx article body. Fetches other PUBLISHED posts
// sharing the current post's category, via the same public
// GET /api/posts endpoint (postController.js) the main feed uses —
// no separate "related posts" backend endpoint exists, so this
// filters client-side on the already-documented `category` query
// param and simply excludes the current post by id.

import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const RELATED_LIMIT = 4;

/**
 * @param {object} props
 * @param {string} props.currentPostId
 * @param {string} [props.categorySlug]
 */
export default function RelatedPosts({ currentPostId, categorySlug }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(categorySlug));

  useEffect(() => {
    if (!categorySlug) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    api
      .get("/api/posts", { params: { category: categorySlug, limit: RELATED_LIMIT + 1 } })
      .then(({ data }) => {
        if (cancelled) return;
        const filtered = (data.items ?? [])
          .filter((post) => post._id !== currentPostId)
          .slice(0, RELATED_LIMIT);
        setPosts(filtered);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPostId, categorySlug]);

  if (isLoading || posts.length === 0) return null;

  return (
    <section className="border-t border-surface-mid px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-6 font-sans text-xs uppercase tracking-widest text-ink-muted">
          More stories
        </p>

        <div className="flex gap-6 overflow-x-auto pb-2">
          {posts.map((post) => (
            <RelatedPostCard key={post._id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedPostCard({ post }) {
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
    <Link
      to={`/blog/${post.slug}`}
      className="w-64 shrink-0 focus-visible:outline-none group"
    >
      <div 
        className="aspect-[3/2] w-full overflow-hidden bg-surface-mid relative"
        {...interactionHandlers}
      >
        {isVideo ? (
          <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
            ref={videoRef}
            src={`${post.featuredImageUrl}#t=0.001`}
            preload="metadata"
            muted={true}
            loop={false}
            playsInline={true}
            crossOrigin="anonymous"
            onLoadedData={(e) => { e.target.currentTime = 0.1; }}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          post.featuredImageUrl && (
            <img
              src={post.featuredImageUrl}
              alt={post.title || "Blog Cover"}
              loading="lazy"
              crossOrigin="anonymous"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { e.target.src = '/fallback-image-url.jpg'; }}
            />
          )
        )}
      </div>
      <h3 className="mt-3 font-syne text-lg leading-snug text-ink-primary group-hover:text-white transition-colors">
        {post.title}
      </h3>
    </Link>
  );
}
