// frontend/src/components/public/BlogHero.jsx
//
// Top-of-feed hero block on BlogFeed.jsx.
// DESIGN.md rules:
//   - Hero title: font.size.4xl (48px), Syne, #ffffff
//   - High contrast guaranteed via gradient scrim over any image
//   - Category pill: font.size.sm, #333333 border
//   - Author/Date: font.size.xs, #777777

import { Link } from "react-router-dom";

export default function BlogHero({ post }) {
  if (!post) return null;

  const categoryName = post.categoryId?.name;
  const authorName   = post.authorId?.name;
  const dateLabel    = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group relative block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {/* Media frame */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-[#111111]">
        {post.featuredImageUrl && (
          <img
            src={post.featuredImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.02]"
          />
        )}

        {/* Overlay Container */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end justify-center p-6 md:p-12">
          
          {/* Wrap the Title and Meta info inside this Glassmorphism board */}
          <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-10 lg:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500 hover:bg-black/50">
            
            {/* Meta Info (Date & Time) */}
            <div className="flex items-center gap-4 text-white/70 text-xs md:text-sm font-bold tracking-[0.2em] uppercase mb-4">
              <span>{new Date(post?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Blog Title */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl text-white font-light tracking-wide leading-tight">
              {post?.title}
            </h1>

          </div>

        </div>
      </div>
    </Link>
  );
}
