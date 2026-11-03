import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const BlogSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarPosts, setSidebarPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single global fetch to prevent infinite loops
  useEffect(() => {
    const fetchGlobalIndex = async () => {
      try {
        const res = await api.get('/api/posts', { 
          params: { fetchAll: 'true' } 
        });

        // Safely extract data
        const rawData = res.data?.posts || res.data?.items || res.data?.data || res.data;

        // STRICT ARRAY CHECK: Prevents ".map is not a function" crashes
        const validArray = Array.isArray(rawData) ? rawData : [];
        
        // DIAGNOSTIC LOG: Check if backend is actually sending seo_title
        if (validArray.length > 0) {
          console.log("DIAGNOSTIC - First Post Data:", validArray[0]);
          console.log("DIAGNOSTIC - Does seo_title exist?:", 'seo_title' in validArray[0]);
        }

        setSidebarPosts(validArray);
        console.log("DIAGNOSTIC - Sidebar Received API Data (Item 0):", validArray.length > 0 ? validArray[0] : "Empty Array");
      } catch (error) {
        console.error("Sidebar global fetch failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGlobalIndex();
  }, []); // Empty array ensures it runs strictly once per mount

  // Extracted to avoid duplicating the map logic between desktop sticky and mobile drawer
  const SidebarList = (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
      <h3 className="text-[#666666] text-sm lg:text-base font-bold tracking-[0.2em] uppercase mb-6 whitespace-nowrap opacity-100">
        INDEX
      </h3>

      <ul 
        className="flex flex-col gap-5 overflow-y-auto overflow-x-hidden pb-4 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex flex-col gap-5 px-1 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (!sidebarPosts || sidebarPosts.length === 0) ? (
          <div className="px-4 py-8 text-white/40 text-xs text-center italic">No posts available</div>
        ) : (
          sidebarPosts.map((post) => {
            // STRICT FALLBACK LOGIC: 
            // Checks if seo_title exists, is not null, and is not an empty string
            const hasSeoTitle = post.seo_title && typeof post.seo_title === 'string' && post.seo_title.trim() !== '';
            const displayTitle = hasSeoTitle ? post.seo_title.trim() : post.title;
              
            const truncatedTitle = displayTitle.length > 25 ? displayTitle.substring(0, 25) + '...' : displayTitle;

            return (
              <li key={post._id} className="relative group">
                <Link
                  to={`/blog/${post.slug}`}
                  onClick={() => setIsExpanded(false)}
                  className="block text-white transition-all duration-300 transform focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1 hover:font-bold hover:scale-105 text-base whitespace-normal leading-[1.4] origin-left"
                >
                  {truncatedTitle}
                </Link>

                {/* Pin Icon - Permanently Visible since it's full mode */}
                {post?.isPinned && (
                  <div className="absolute top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-md border border-[#d0d0d0]/20 w-5 h-5 rounded-full flex items-center justify-center shadow-lg pointer-events-none transition-all duration-300 right-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/90 drop-shadow-md transform -rotate-45" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h4v6l2 2 2-2v-6h4v-2l-2-2z"></path></svg>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  return (
    <>
      {/* DESKTOP STICKY SIDEBAR */}
      <aside
        className="transition-all duration-300 ease-in-out z-40 overflow-visible hidden lg:flex lg:flex-col lg:shrink-0 lg:bg-[#0d0d0d]/90 lg:backdrop-blur-xl lg:border-y lg:border-r lg:border-l-0 lg:border-[#2a2a2a] lg:rounded-r-[24px] lg:rounded-l-none lg:shadow-[10px_0_30px_rgba(0,0,0,0.5)] lg:relative lg:mt-28 lg:h-[calc(100vh-8rem)] lg:w-56 self-start"
      >
        {SidebarList}
      </aside>

      {/* MOBILE DRAWER TRIGGER (Sticky Track ensuring it respects Navbar/Footer boundaries) */}
      <div className="lg:hidden shrink-0 w-0 self-stretch z-[60]">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="sticky top-[12vh] ml-4 mt-[12vh] p-2 bg-black/50 rounded-lg backdrop-blur-md border border-white/10 flex items-center justify-center w-10 h-10 shadow-lg hover:bg-black/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isExpanded && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/80 backdrop-blur-md p-6 flex flex-col">
          <button 
            onClick={() => setIsExpanded(false)} 
            className="self-end text-white text-3xl mb-2 hover:text-[#deff9a] transition-colors"
          >
            ×
          </button>
          
          <div className="flex-1 overflow-hidden">
            {SidebarList}
          </div>
        </div>
      )}
    </>
  );
};

export default BlogSidebar;
