// frontend/src/pages/public/SinglePost.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api.js";
import MediaGrid from "../../components/public/MediaGrid.jsx";
import BlogSidebar from "../../components/public/BlogSidebar.jsx";
import PostArticleBody from "../../components/public/PostArticleBody.jsx";
import SEOMeta from "../../components/public/SEOMeta.jsx";

function calculateReadTime(content) {
  if (!content) return "1 min read";
  const words = content.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

const AuthorTrustCard = ({ authorName, authorAvatar }) => {
  return (
    <div className="flex items-center justify-center gap-3 mt-8 mb-4">
      {authorAvatar ? (
        <img 
          src={authorAvatar} 
          alt={authorName} 
          className="w-8 h-8 rounded-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center font-display text-white text-sm font-bold">
          F
        </div>
      )}
      <span className="font-sans text-sm text-[#D4D4D8]">
        - {authorName || "Fotographiya Journal"}
      </span>
    </div>
  );
};

// ── CRITICAL HTML PARSING LOGIC ──
function parseContent(html) {
  const textNodesHTML = [];
  const extractedMedia = [];

  if (html && typeof html === 'string') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (doc && doc.body && doc.body.childNodes) {
      Array.from(doc.body.childNodes).forEach((node) => {
        if (!node) return;
        
        const tag = (node.tagName && typeof node.tagName === 'string') ? node.tagName.toLowerCase() : '';

        if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'iframe' || tag === 'figure') {
          if (node.nodeType === 1) {
             let src = node.getAttribute('src') || node.querySelector?.('source')?.getAttribute('src') || '';
             if (src && typeof src === 'string') {
                node.setAttribute('src', src);
             }
             if (tag === 'video' || tag === 'audio') {
               node.setAttribute('controlsList', 'nodownload');
               node.setAttribute('oncontextmenu', 'return false;');
               node.setAttribute('crossorigin', 'anonymous');
             }
             const isVideo = tag === 'video' || node.querySelector?.('video');
             const isAudio = tag === 'audio' || node.querySelector?.('audio') || (src && src.match(/\.(mp3|wav|ogg|aac|m4a)($|\?|#)/i));
             const type = isVideo ? 'video' : isAudio ? 'audio' : 'image';
             extractedMedia.push({
               type,
               url: src,
               fallbackHtml: node.outerHTML
             });
          }
        } else if (node.outerHTML || (node.textContent && node.textContent.trim())) {
          textNodesHTML.push(node.outerHTML || node.textContent);
        }
      });
    }
  }

  return { textHtml: textNodesHTML.join(''), mediaHtml: extractedMedia };
}

export default function SinglePost() {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [textHtml, setTextHtml] = useState("");
  const [mediaHtml, setMediaHtml] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const heroVideoRef = useRef(null);
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
    if (heroVideoRef.current) {
      heroVideoRef.current.play().catch(() => {});
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => {
        if (heroVideoRef.current) heroVideoRef.current.pause();
      }, 7500); 
    }
  };

  const handleEndInteraction = () => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    if (heroVideoRef.current) {
      heroVideoRef.current.pause();
      heroVideoRef.current.currentTime = 0.1; 
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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsNotFound(false);

    async function load() {
      try {
        const [postRes, postsRes] = await Promise.all([
          api.get(`/api/posts/slug/${slug}`),
          api.get('/api/posts', { params: { limit: 50 } })
        ]);
        
        if (cancelled) return;
        
        const data = postRes.data;
        const fetchedPosts = Array.isArray(postsRes.data) ? postsRes.data : (postsRes.data.items || postsRes.data.posts || postsRes.data.data || []);
        setPosts(fetchedPosts);

        const { textHtml: textNodes, mediaHtml: mediaNodes } = parseContent(data.post.content);
        
        // Combine legacy extracted media with new mediaGallery
        const combinedMedia = [...mediaNodes, ...(data.post.mediaGallery || [])];
        
        setPost(data.post);
        setTextHtml(textNodes);
        setMediaHtml(combinedMedia);

        // Inject JSON-LD Schema
        if (data.schemaJson) {
          const scriptId = 'post-json-ld';
          let scriptTag = document.getElementById(scriptId);
          if (!scriptTag) {
            scriptTag = document.createElement('script');
            scriptTag.id = scriptId;
            scriptTag.type = 'application/ld+json';
            document.head.appendChild(scriptTag);
          }
          scriptTag.textContent = data.schemaJson;
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404) setIsNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    return () => { 
      // Cleanup JSON-LD on unmount
      const scriptTag = document.getElementById('post-json-ld');
      if (scriptTag) scriptTag.remove();
    };
  }, [post]);

  const formattedDate = useMemo(() => {
    if (!post?.publishedAt) return null;
    return new Date(post.publishedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  }, [post]);

  const handleShare = (platform) => {
    if (typeof window === 'undefined') return;
    const currentUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || '');
    const imageUrl = post?.featuredImageUrl ? encodeURIComponent(post.featuredImageUrl) : '';

    let shareUrl = '';
    switch (platform) {
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${currentUrl}&text=${title}`;
        break;
      case 'reddit':
        shareUrl = `https://www.reddit.com/submit?url=${currentUrl}&title=${title}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${title}%20${currentUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${currentUrl}&title=${title}`;
        break;
      case 'instagram':
        shareUrl = `https://www.instagram.com/fotographiya_official/`;
        break;
      default:
        return;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#ffffff] font-['ui-sans-serif'] flex flex-col lg:flex-row items-start relative w-full max-w-[100%] overflow-x-hidden">
        <BlogSidebar posts={posts} />
        
        <div className="flex-1 min-w-0 w-full max-w-[100%] overflow-x-hidden flex flex-col justify-start transition-all duration-300 lg:pl-8">
          <div className="w-full px-4 sm:px-8 lg:pr-12 xl:pr-16 pt-8 pb-20 flex flex-col gap-4 lg:gap-6">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-12 pb-6">
              
              {/* Back Link Placeholder */}
              <div className="h-4 w-24 bg-white/5 rounded mb-8 animate-pulse" />
              
              {/* Header Skeleton */}
              <header className="mb-10 flex flex-col items-center justify-center text-center">
                <div className="h-12 md:h-16 w-3/4 max-w-2xl bg-white/5 rounded-2xl mb-6 animate-pulse" />
                <div className="h-12 md:h-16 w-1/2 max-w-xl bg-white/5 rounded-2xl mb-8 animate-pulse" />
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
              </header>

              {/* Hero Image Skeleton */}
              <div className="w-full mx-auto mt-8 mb-10">
                <div className="relative w-full h-[50vh] md:h-[70vh] rounded-[24px] bg-white/5 border border-white/5 animate-pulse" />
              </div>

              {/* Body Content Skeleton */}
              <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6 py-6 border-t border-[#111111] pt-12">
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded mt-8 animate-pulse" />
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-display text-4xl text-white font-bold mb-4">Story not found</h1>
        <p className="font-sans text-lg text-[#777777] mb-8">
          This story may have been moved or no longer exists.
        </p>
        <Link
          to="/blog"
          className="border border-[#333333] px-6 py-3 rounded-full font-sans text-sm font-medium text-white hover:bg-white hover:text-black transition-colors"
        >
          Back to all stories
        </Link>
      </div>
    );
  }

  if (!post) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">Post could not be loaded. Check API logs.</div>;
  }



  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-['ui-sans-serif'] flex flex-col lg:flex-row items-start relative w-full max-w-[100%] overflow-x-hidden">
      {/* 1. Global Sidebar */}
      <BlogSidebar posts={posts} />

      {/* 2. Main Content Container (Hero + Grid) */}
      <div className="flex-1 min-w-0 w-full max-w-[100%] overflow-x-hidden flex flex-col justify-start transition-all duration-300 lg:pl-8">
        {/* FIXED: Removed max-w-[1200px] and added lg:pr-12 xl:pr-16 to let content expand into the unused right space safely */}
        <div className="w-full px-4 sm:px-8 lg:pr-12 xl:pr-16 pt-8 pb-20 flex flex-col gap-4 lg:gap-6">
      {post && (
        <SEOMeta 
          title={post.metaTitle || post.title} 
          description={post.metaDescription || post.excerpt} 
          ogImage={post.featuredImageUrl}
          isSinglePostView={true}
          post={post}
        />
      )}
      {/* ── STRICT BlogPosting JSON-LD Schema ── */}
      {post && (() => {
        const SITE_URL     = "https://www.fotographiya.com";
        const DEFAULT_IMG  = `${SITE_URL}/og-default.jpg`;

        // --- ISO 8601 date helper (never emits NaN/null) ---
        const toISO = (raw) => {
          if (!raw) return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };

        // --- OG image priority: real image → video .jpg thumbnail → default ---
        let ogImage = DEFAULT_IMG;
        if (post.featuredImageUrl && post.featuredImageUrl.trim() !== '') {
          const isVideo = /\.(mp4|webm|ogg)$/i.test(post.featuredImageUrl);
          ogImage = isVideo
            ? post.featuredImageUrl.replace(/\.[^/.]+$/, ".jpg")
            : post.featuredImageUrl;
          // Resolve relative path to absolute
          if (ogImage.startsWith('/')) {
            ogImage = `${SITE_URL}${ogImage}`;
          }
        }

        // --- Safe description: strip HTML, crop to 155 chars ---
        const rawDesc =
          post.seo_description ||
          post.excerpt ||
          (post.content ? post.content.replace(/<[^>]+>/g, '').trim().slice(0, 155) + '…' : '');

        // --- Safe JSON string: escape </script> sequences ---
        const safeJSON = JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              "name": "Fotographiya",
              "url": SITE_URL,
              "logo": {
                "@type": "ImageObject",
                "@id": `${SITE_URL}/#logo`,
                "url": DEFAULT_IMG,
                "contentUrl": DEFAULT_IMG,
                "caption": "Fotographiya — Luxury Wedding Photography & Cinematic Storytelling"
              },
              "sameAs": ["https://www.instagram.com/fotographiya_official/"]
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              "url": SITE_URL,
              "name": "The Fotographiya Journal",
              "publisher": { "@id": `${SITE_URL}/#organization` }
            },
            {
              "@type": "BlogPosting",
              "@id": `${SITE_URL}/blog/${post.slug}#article`,
              "isPartOf": { "@id": `${SITE_URL}/#website` },
              "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
              "url": `${SITE_URL}/blog/${post.slug}`,

              // Headline: seo_title → title (max 110 chars per Google spec)
              "headline": (post.seo_title || post.title || '').slice(0, 110),

              // Description: seo_description → excerpt → content crop
              "description": rawDesc,

              // Image: OG priority ladder
              "image": {
                "@type": "ImageObject",
                "url": ogImage,
                "contentUrl": ogImage
              },

              // Dates: strict ISO 8601
              "datePublished": toISO(post.publishedAt || post.createdAt),
              "dateModified":  toISO(post.updatedAt  || post.publishedAt || post.createdAt),

              // Author: Person node
              "author": {
                "@type": "Person",
                "name": post.author?.authorName || post.author?.name || "Fotographiya Team"
              },

              // Publisher: cross-link to Organization @id
              "publisher": { "@id": `${SITE_URL}/#organization` },

              // Keywords from tags
              ...(post.tags?.length ? {
                "keywords": post.tags.map(t => t?.name || t).join(", ")
              } : {})
            }
          ]
        // Escape </script> to prevent injection
        }).replace(/<\/script>/gi, '<\\/script>');

        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJSON }}
          />
        );
      })()}
      {/* ── END BlogPosting Schema ── */}
      
      {/* ── BlogHero ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-6">
        {/* ── Back Link ── */}
        <Link 
          to="/blog" 
          className="inline-flex items-center text-white/60 hover:text-white transition-colors text-base font-medium tracking-wide mb-8"
        >
          <span className="mr-2">←</span> All articles
        </Link>
        
        {/* ── Header ── */}
        <header className="mb-10 text-center min-w-0 w-full flex flex-col items-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight text-white mb-8 break-words break-all sm:break-words max-w-full overflow-hidden">
            {post.title}
          </h1>

          <p className="text-white/60 text-base md:text-lg font-bold tracking-[0.2em] uppercase mb-4 text-center">
            {formattedDate && <span>{formattedDate}</span>}
          </p>
        </header>

        {/* ── Cover Image ── */}
        {post.featuredImageUrl && (
          <div className="w-full mx-auto mt-8 mb-10">
            <div 
              className="relative w-full h-[50vh] md:h-[70vh] rounded-2xl md:rounded-[40px] overflow-hidden shadow-2xl bg-[#111111] border border-[#222222] group cursor-pointer"
              {...interactionHandlers}
            >
              {isVideo ? (
                <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} 
                  ref={heroVideoRef}
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
                <img 
                  src={post.featuredImageUrl}
                  alt={post?.title || "Blog Cover"} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  crossOrigin="anonymous"
                  onError={(e) => { e.target.src = '/fallback-image-url.jpg'; }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editorial Grid Container */}
      <div className="max-w-[1400px] w-full max-w-[100%] mx-auto px-4 md:px-8 pt-2 lg:pt-4 pb-12 lg:grid lg:grid-cols-12 lg:gap-12 relative items-start overflow-hidden">
        
        {/* Left Column: Sticky Social Icons */}
        <div className="hidden lg:block lg:col-span-1 min-w-0 sticky top-32">
          {/* Style ShareButtons inside to be stacked vertically, circular, glassmorphism B&W */}
          <div className="flex flex-col gap-4 items-center z-50">
            <a href="https://www.instagram.com/fotographiya_official/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Instagram">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/fotographiya-the-wedding-photography/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our LinkedIn">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=100092454265642" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Facebook">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.youtube.com/@Fotographiya_official" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our YouTube">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://www.pexels.com/@fotographiya-wedding-photography-823737813/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Pexels">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 8v12c0 1.105-.895 2-2 2H2c-1.105 0-2-.895-2-2V8c0-1.105.895-2 2-2h4.086l1.293-2.586C7.625 2.923 8.016 2.5 8.5 2.5h7c.484 0 .875.423 1.121.914L17.914 6H22c1.105 0 2 .895 2 2zm-12 11c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm0-10c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Middle Column: Main Content */}
        <div className="lg:col-span-7 xl:col-span-8 w-full min-w-0 max-w-[100%]">
          {/* Mobile Socials (Hidden on Desktop) */}
          <div className="flex lg:hidden mb-8 gap-4 justify-center z-50">
            <a href="https://www.instagram.com/fotographiya_official/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Instagram">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/fotographiya-the-wedding-photography/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our LinkedIn">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=100092454265642" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Facebook">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.youtube.com/@Fotographiya_official" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our YouTube">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://www.pexels.com/@fotographiya-wedding-photography-823737813/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 shadow-lg group" aria-label="Visit our Pexels">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 8v12c0 1.105-.895 2-2 2H2c-1.105 0-2-.895-2-2V8c0-1.105.895-2 2-2h4.086l1.293-2.586C7.625 2.923 8.016 2.5 8.5 2.5h7c.484 0 .875.423 1.121.914L17.914 6H22c1.105 0 2 .895 2 2zm-12 11c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm0-10c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z"/>
              </svg>
            </a>
          </div>
          
          {/* ── Excerpt Wrapper ── */}
          {post?.excerpt && (
            <div className="w-full mb-10 p-6 md:p-10 rounded-3xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.06)] border border-transparent hover:border-[#111111]">
              <h2 className="text-2xl md:text-3xl font-medium text-white leading-snug break-words [overflow-wrap:anywhere]">
                {post.excerpt}
              </h2>
            </div>
          )}
          
          {/* ── Main Content Wrapper ── */}
          <div className="w-full min-w-0 max-w-[100%] overflow-hidden break-words [overflow-wrap:anywhere] whitespace-pre-wrap [&_img]:max-w-full [&_img]:h-auto [&_video]:max-w-full [&_video]:h-auto [&_iframe]:max-w-full">
            <PostArticleBody content={textHtml} />
            <div className="mt-16 pt-8 flex items-center justify-end gap-4 border-t border-[#222222] w-full text-right">
              <span className="text-lg text-[#A1A1AA] font-light">- {post?.author?.authorName || 'Fotographiya Journal'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: More to Explore (Cinematic Gallery) */}
        <div className="w-full min-w-0 max-w-[100%] overflow-x-hidden lg:overflow-visible lg:col-span-4 xl:col-span-3 mt-16 lg:mt-0 sticky top-32">
          <div className="text-white text-xl font-bold tracking-widest uppercase mb-8 border-b border-white/20 pb-4">
            The Cinematic Gallery
          </div>
          
          {mediaHtml.length > 0 && (
            <div className="mb-12 w-full min-w-0 max-w-[100%]">
              <MediaGrid mediaItems={mediaHtml} />
            </div>
          )}

          {/* ── Tags Display ── */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags?.map((tag, index) => tag ? (
                <span 
                  key={index} 
                  className="bg-[#111111] text-[#A1A1AA] text-xs px-3 py-1 rounded-full border border-[#333333]"
                >
                  #{tag}
                </span>
              ) : null)}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <div className="max-w-4xl mx-auto mt-24 mb-16 px-4">
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-6 md:p-10 text-center flex flex-col items-center justify-center">
          <h3 className="font-display text-2xl font-bold text-white mb-3">Enjoyed this article?</h3>
          <p className="font-sans text-[#A1A1AA] mb-8 max-w-md">
            Discover more stories, real weddings, and exclusive content in our journal.
          </p>
          <Link 
            to="/blog"
            className="bg-white text-black px-8 py-3 rounded-full font-sans font-semibold tracking-wide hover:bg-gray-200 transition-colors"
          >
            See all articles
          </Link>
        </div>
      </div>

        </div>
      </div>
    </div>
  );
}