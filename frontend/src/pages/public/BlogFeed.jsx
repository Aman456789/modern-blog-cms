import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api.js";
import BlogSidebar from "../../components/public/BlogSidebar.jsx";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function calculateReadTime(content) {
  if (!content || typeof content !== 'string') return "1 min read";
  try {
    const words = content.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  } catch (e) {
    return "1 min read";
  }
}

export default function BlogFeed() {
  const [posts, setPosts] = useState([]);
  const [globalPosts, setGlobalPosts] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);
  const [latestPost, setLatestPost] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    async function loadPosts() {
      try {
        // Frontend simply asks for the page. Backend handles ALL sorting and limits internally.
        const res = await api.get('/api/posts', { params: { page } });
        if (cancelled) return;

        const fetchedPosts = Array.isArray(res.data) ? res.data : (res.data.items || res.data.posts || res.data.data || []);
        setPosts(fetchedPosts);
        setLatestPost(res.data.latestPost); // Extract latest post
        setTotalPages(res.data.totalPages || res.data.meta?.totalPages || 1);
      } catch (err) {
        if (!cancelled) setIsError(true);
        console.error("Failed to load posts:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPosts();
    return () => { cancelled = true; };
  }, [page]);

  useEffect(() => {
    setSearchParams({ page: page.toString() });
  }, [page, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function fetchMasterList() {
      try {
        const res = await api.get('/api/posts', { params: { limit: 100 } });
        if (cancelled) return;
        const masterData = Array.isArray(res.data) ? res.data : (res.data.posts || res.data.items || []);
        setGlobalPosts(masterData);
      } catch (err) {
        console.error("Failed to load master list", err);
      }
    }
    fetchMasterList();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex pt-24 pb-20">
        {/* Placeholder for sidebar to maintain layout alignment */}
        <div className="hidden lg:block w-[300px] flex-shrink-0" />
        
        <div className="flex-1 min-w-0 w-full flex justify-start lg:pl-8">
          <div className="w-full px-4 sm:px-8 lg:pr-12 xl:pr-16 pt-12 md:pt-16 pb-20 flex flex-col gap-6">
            
            {/* Header placeholder */}
            <div className="flex flex-col items-center justify-center text-center w-full mb-6 pt-2">
              <div className="h-16 md:h-20 w-3/4 max-w-2xl bg-white/5 rounded-2xl animate-pulse" />
            </div>

            {/* Hero Skeleton */}
            <div className="bg-[#0a0a0a] border border-[#222222] rounded-[24px] p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center mb-12 hover:-translate-y-1 transition-transform duration-500 hover:border-[#444444]">
              <div className="w-full md:w-1/2 aspect-video overflow-hidden rounded-xl bg-white/5 animate-pulse" />
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div className="h-4 w-1/4 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-5/6 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-2/3 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse mt-4" />
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
              </div>
            </div>

            {/* Grid Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full relative min-h-[50vh]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group flex flex-col hover:-translate-y-1 transition-all duration-300 relative">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-[#111111] border border-[#222222] animate-pulse" />
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" />
                    <div className="h-6 w-full bg-white/5 rounded animate-pulse mt-2" />
                    <div className="h-6 w-5/6 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse mt-3" />
                    <div className="h-3 w-4/5 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#000000] text-white pt-24 pb-20 px-6 md:px-12 lg:px-24 flex items-center justify-center text-center">
        <p className="font-sans text-base text-[#777777]">
          Unable to load the journal at this time.
        </p>
      </div>
    );
  }
  const sortedPosts = posts ? [...posts].sort((a, b) => {
    // Strictly cast to 1 or 0 to avoid undefined comparisons
    const pinA = a?.isPinned ? 1 : 0;
    const pinB = b?.isPinned ? 1 : 0;
    
    // 1. Pinned strictly goes to the top
    if (pinA !== pinB) return pinB - pinA;
    
    // Helper to prevent NaN crashes
    const getSafeTime = (dateVal) => {
      if (!dateVal) return 0;
      const time = new Date(dateVal).getTime();
      return isNaN(time) ? 0 : time;
    };

    // 2. Both pinned: Sort by newest updatedAt
    if (pinA === 1 && pinB === 1) {
      return getSafeTime(b.updatedAt) - getSafeTime(a.updatedAt);
    }
    
    // 3. Both unpinned: Sort by publishedAt (matching backend controller)
    return getSafeTime(b.publishedAt || b.createdAt) - getSafeTime(a.publishedAt || a.createdAt);
  }) : [];

  // Sort global posts for the Hero
  const sortedGlobalPosts = globalPosts ? [...globalPosts].sort((a, b) => {
    const pinA = a?.isPinned ? 1 : 0;
    const pinB = b?.isPinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    const getSafeTime = (dateVal) => {
      if (!dateVal) return 0;
      const time = new Date(dateVal).getTime();
      return isNaN(time) ? 0 : time;
    };
    if (pinA === 1 && pinB === 1) {
      return getSafeTime(b.updatedAt) - getSafeTime(a.updatedAt);
    }
    return getSafeTime(b.publishedAt || b.createdAt) - getSafeTime(a.publishedAt || a.createdAt);
  }) : [];

  // Locate the most recent unpinned post for the Hero frame
  const featuredPost = latestPost || posts?.[0];
  const remainingPosts = sortedPosts.length > 0 ? sortedPosts.slice(1) : [];

  const handleInteract = (e) => {
    const video = e.currentTarget.querySelector('video');
    if (video) {
      video.play().catch(() => {});
      if (video.hoverTimeout) clearTimeout(video.hoverTimeout);
      video.hoverTimeout = setTimeout(() => {
        video.pause();
      }, 7500);
    }
  };

  const handleStop = (e) => {
    const video = e.currentTarget.querySelector('video');
    if (video) {
      if (video.hoverTimeout) clearTimeout(video.hoverTimeout);
      video.pause();
      video.currentTime = 0.1;
    }
  };

  // --- STRICT SEO JSON-LD: Organization + WebSite + SearchAction ---
  const siteUrl = "https://www.fotographiya.com";
  const globalSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "Fotographiya",
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          "url": `${siteUrl}/og-default.jpg`,
          "contentUrl": `${siteUrl}/og-default.jpg`,
          "caption": "Fotographiya — Luxury Wedding Photography & Cinematic Storytelling"
        },
        "sameAs": [
          "https://www.instagram.com/fotographiya_official/"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "The Fotographiya Journal",
        "description": "Behind the lens of luxury weddings. Discover stories, real weddings, and exclusive cinematic content.",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${siteUrl}/blog?search={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };
  // --- END SEO SCHEMA ---

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-['ui-sans-serif'] flex items-start relative w-full max-w-[100%] overflow-x-hidden">
      {/* Invisible SEO Schema — Organization + WebSite + SearchAction */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchema) }} 
      />
      
      {/* 1. Global Sidebar - Sits at absolute x=0 */}
      <BlogSidebar posts={posts} />

      {/* 2. Main Content Container (Hero + Grid) */}
      <div className="flex-1 min-w-0 w-full flex justify-start transition-all duration-300 lg:pl-8">
        
        {/* FIXED: Removed max-w-[1200px] and added lg:pr-12 xl:pr-16 to let content expand into the unused right space safely */}
        <div className="w-full px-4 sm:px-8 lg:pr-12 xl:pr-16 pt-12 md:pt-16 pb-20 flex flex-col gap-6">

        {/* ── Hero Section ── */}
        <div className="flex flex-col items-center justify-center text-center w-full mb-6 pt-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] text-center font-bold tracking-tight text-white max-w-full break-words px-4 mx-auto leading-tight">The Fotographiya Journal</h1>
        </div>

        {!posts || posts.length === 0 ? (
          <div className="mt-32 flex flex-col items-center justify-center text-center opacity-80">
             <div className="w-16 h-[1px] bg-[#333333] mb-8"></div>
             <h2 className="text-2xl md:text-3xl font-light text-white tracking-widest uppercase mb-4">Blogs Coming Soon</h2>
             <p className="text-[#A1A1AA] text-sm tracking-wide">Beautiful moments are being curated. Check back later.</p>
          </div>
        ) : (
          <>
            {/* ── Featured Post ── */}
            {featuredPost && (
              <Link 
                to={`/blog/${featuredPost.slug}`} 
                className="block group mb-24 relative"
                onMouseEnter={handleInteract} 
                onMouseLeave={handleStop} 
                onTouchStart={handleInteract} 
                onTouchEnd={handleStop}
              >
                {/* Minimalist Premium Pin Icon */}
                {featuredPost?.isPinned && (
                  <div 
                    className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md border border-white/10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg pointer-events-none group-hover:bg-white/10 transition-all duration-300"
                    title="Pinned Article"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/90 drop-shadow-md transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h4v6l2 2 2-2v-6h4v-2l-2-2z" />
                    </svg>
                  </div>
                )}
                <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center hover:-translate-y-1 transition-transform duration-500 hover:border-[#444444]">

                  {/* Cover Image */}
                  <div className="w-full md:w-1/2 aspect-video overflow-hidden rounded-xl bg-[#111111] relative">
                    {featuredPost.featuredImageUrl ? (
                      featuredPost.featuredImageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                        <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
                          src={`${featuredPost.featuredImageUrl}#t=0.1`}
                          preload="metadata"
                          muted={true}
                          playsInline={true}
                          loop={false}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <img 
                          src={featuredPost.featuredImageUrl} 
                          alt={featuredPost.title} 
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#333333]">No Image</div>
                    )}
                  </div>

                  {/* Typography / Metadata */}
                  <div className="w-full md:w-1/2 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-sm md:text-base tracking-widest uppercase text-[#a0a0a0] font-bold font-sans">
                      <span>{formatDate(featuredPost.publishedAt)}</span>
                    </div>
                    <h2 className="font-syne text-4xl md:text-5xl font-bold mb-6 leading-tight group-hover:text-gray-300 transition-colors line-clamp-4 break-words overflow-hidden max-w-full">
                      {featuredPost.title}
                    </h2>
                    <p className="font-sans text-lg text-[#A1A1AA] line-clamp-3 break-words leading-relaxed">
                      {featuredPost.excerpt || "Click to read the full story of this beautiful celebration."}
                    </p>
                  </div>

                  {/* Absolute View Button */}
                  <span className="absolute bottom-6 right-6 bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-md flex items-center justify-center z-10 pointer-events-none md:pointer-events-auto">
                    View
                  </span>
                </div>
              </Link>
            )}

            {/* 2. Pull the All Articles section upward using a negative margin */}
            <div className="w-full -mt-4 lg:-mt-8 relative z-10">
                
                {sortedPosts.length > 0 && (
                  <>
                    {/* Title for Grid */}
                    <h2 className="text-white text-2xl lg:text-3xl font-bold tracking-wide mb-8 border-b border-[#2a2a2a] pb-4">
                      All Articles
                    </h2>

                    {/* The Existing Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                  {/* Optimized Grid Sort: Pins on top (by edit date), Unpinned by original publish date */}
                  {[...(posts || [])].sort((a, b) => {
                    const pinA = a?.isPinned ? 1 : 0;
                    const pinB = b?.isPinned ? 1 : 0;
                    
                    // 1. Pinned strictly goes to the top
                    if (pinA !== pinB) return pinB - pinA;
                    
                    // 2. If BOTH are PINNED: Sort by latest edit (updatedAt)
                    if (pinA === 1 && pinB === 1) {
                      const editA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                      const editB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                      return (isNaN(editB) ? 0 : editB) - (isNaN(editA) ? 0 : editA);
                    }
                    
                    // 3. If BOTH are UNPINNED: Strictly sort by original publish date (publishedAt/createdAt)
                    const pubA = new Date(a.publishedAt || a.createdAt || 0).getTime();
                    const pubB = new Date(b.publishedAt || b.createdAt || 0).getTime();
                    return (isNaN(pubB) ? 0 : pubB) - (isNaN(pubA) ? 0 : pubA);
                  }).map((post, index) => (
                    <Link
                      key={post._id}
                      to={`/blog/${post.slug}`}
                      className="group flex flex-col hover:-translate-y-1 transition-all duration-300 relative"
                      onMouseEnter={handleInteract} 
                      onMouseLeave={handleStop} 
                      onTouchStart={handleInteract} 
                      onTouchEnd={handleStop}
                    >
                      {/* Minimalist Premium Pin Icon */}
                      {post?.isPinned && (
                        <div 
                          className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md border border-white/10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg pointer-events-none group-hover:bg-white/10 transition-all duration-300"
                          title="Pinned Article"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/90 drop-shadow-md transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h4v6l2 2 2-2v-6h4v-2l-2-2z" />
                          </svg>
                        </div>
                      )}
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-[#111111] border border-[#222222] relative">
                        {post.featuredImageUrl ? (
                          post.featuredImageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                            <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}
                              src={`${post.featuredImageUrl}#t=0.1`}
                              preload="metadata"
                              muted={true}
                              playsInline={true}
                              loop={false}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <img
                              src={post.featuredImageUrl}
                              alt={post.title}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#333333]">No Image</div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col gap-3 flex-1 min-w-0 w-full">
                        {/* Date & Metadata */}
                        <div className="text-xs md:text-sm uppercase tracking-widest text-[#a0a0a0] font-bold">
                          {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-white leading-tight line-clamp-3 break-words overflow-hidden max-w-full">
                          {post.title}
                        </h2>

                        {/* Excerpt Section - Add this under the Title */}
                        <div className="text-white/70 text-sm mt-3 leading-relaxed line-clamp-3 break-words">
                          {(() => {
                            const text = post?.excerpt || post?.content || "";
                            const cleanText = text.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
                            const displayExcerpt = cleanText.length > 100 
                              ? cleanText.substring(0, 100) + "..." 
                              : cleanText;
                              
                            return (
                              <>
                                {displayExcerpt}
                                <span className="ml-1 font-bold text-white underline cursor-pointer">View More</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </Link>
                  ))}
                    </div>
                  </>
                )}
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="w-full flex justify-center items-center gap-4 mt-12 mb-8">
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page === 1}
                  className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg> Previous
                </button>
                
                <span className="text-white/60 text-sm font-medium tracking-widest uppercase">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page === totalPages}
                  className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300 flex items-center"
                >
                  Next <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
            </div>
          </>
        )}

        </div>
      </div>
    </div>
  );
}
