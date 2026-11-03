import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import api from '../../services/api.js';

export default function SEOMeta({ 
  title, 
  description, 
  keywords, 
  ogImage,
  isSinglePostView,
  post
}) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/api/settings');
      return res.data.settings;
    },
    staleTime: 5 * 60 * 1000, // Cache settings for 5 minutes
  });

  if (isLoading) return null;

  // --- STRICT TITLE LOGIC ---
  // Assuming 'post' is the single blog post object, and 'settings' holds global data
  let pageTitle = "";
  
  if (isSinglePostView && post) {
    // Priority: SEO Title -> Post Title -> Default Meta Title
    const baseTitle = post.seo_title || post.title || settings?.metaTitle || "Fotographiya";
    pageTitle = `${baseTitle} | Fotographiya`;
  } else {
    // Homepage / Listing: Strictly use Site Title / Identity setting
    pageTitle = settings?.siteTitle || "Fotographiya - Luxury Wedding Photography & Cinematic Storytelling";
  }
  // --- END TITLE LOGIC ---

  // --- STRICT DESCRIPTION LOGIC ---
  let pageDescription = "";

  if (isSinglePostView && post) {
    // Safely strip HTML tags from content for the fallback crop
    const strippedContent = post.content ? post.content.replace(/<[^>]+>/g, '') : '';
    const autoCrop = strippedContent.length > 155 ? strippedContent.substring(0, 155) + '...' : strippedContent;

    // Priority: SEO Desc -> Excerpt -> Auto-Crop -> Default
    pageDescription = post.seo_description || post.excerpt || autoCrop || settings?.metaDescription || "";
  } else {
    // Homepage: Strictly use Default Meta Description
    pageDescription = settings?.metaDescription || "Discover Fotographiya, where luxury meets cinematic storytelling.";
  }
  // --- END DESCRIPTION LOGIC ---

  // --- STRICT CANONICAL LOGIC ---
  const baseUrl = "https://www.fotographiya.com";
  let canonicalUrl = baseUrl;
  
  if (isSinglePostView && post) {
    // Fallback to post._id if slug/routeName is missing somehow
    canonicalUrl = `${baseUrl}/blog/${post.slug || post.routeName || post._id}`;
  } else {
    // Homepage / Default
    canonicalUrl = baseUrl;
  }
  // --- END CANONICAL LOGIC ---

  // --- STRICT KEYWORDS LOGIC ---
  let pageKeywords = "";

  if (isSinglePostView && post) {
    // Priority: Custom SEO Keywords -> Default Site Keywords
    pageKeywords = post.seo_keywords || settings?.metaKeywords || "wedding, photography, cinematic";
  } else {
    pageKeywords = settings?.metaKeywords || "wedding, photography, cinematic";
  }
  // --- END KEYWORDS LOGIC ---
  // --- STRICT OG:IMAGE LOGIC ---
  let finalOgImage = settings?.defaultOgImage || "https://fotographiya.com/og-default.jpg"; // Baseline fallback

  if (isSinglePostView && post && post.featuredImageUrl && post.featuredImageUrl.trim() !== '') {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(post.featuredImageUrl);
    if (!isVideo) {
      // Priority 1: Cover Image
      finalOgImage = post.featuredImageUrl;
    } else {
      // Priority 2: Cover Video Thumbnail (reference generated first-frame thumbnail)
      finalOgImage = post.featuredImageUrl.replace(/\.[^/.]+$/, ".jpg");
    }
  }
  // --- END OG:IMAGE LOGIC ---

  return (
    <>
      {/* --- STRICT SEO HELMET BLOCK --- */}
      <Helmet>
        <title>{post?.seo_title || post?.title ? `${post.seo_title || post.title} | Fotographiya` : settings?.siteTitle || "Fotographiya"}</title>
        
        <meta name="description" content={post?.seo_description || post?.excerpt || settings?.metaDescription || "Luxury Wedding Photography"} />
        <meta name="keywords" content={pageKeywords} />
        
        {/* Force OG Image to use the prioritized finalOgImage */}
        <meta property="og:image" content={finalOgImage} />
        <meta name="twitter:image" content={finalOgImage} />
        
        <meta property="og:title" content={post?.seo_title || post?.title || "Fotographiya"} />
        <meta property="og:description" content={post?.seo_description || post?.excerpt || settings?.metaDescription} />
        
        {/* Dynamic Canonical */}
        <link rel="canonical" href={`https://www.fotographiya.com${post?.slug ? `/blog/${post.slug}` : ''}`} />
      </Helmet>
      {/* --- END STRICT SEO HELMET BLOCK --- */}
    </>
  );
}
