// frontend/src/pages/public/TagFeed.jsx
// Fix: bg-surface-light → bg-surface-dark on the root div (line ~235).
// All other logic is correct. Only the root wrapper class is wrong.
//
// FULL FILE with fix applied:

import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../services/api.js';

const PAGE_LIMIT = 9;

async function fetchTag(slug) {
  const { data } = await api.get(`/api/tags/${slug}`);
  return data.tag;
}

async function fetchPostsByTag({ tagSlug, pageParam = 1 }) {
  const params = new URLSearchParams({ tag: tagSlug, page: String(pageParam), limit: String(PAGE_LIMIT) });
  const { data } = await api.get(`/api/posts?${params}`);
  return data;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function estimateReadTime(content) {
  if (!content) return '1 min read';
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com').replace(/\/+$/, "");
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

function slugToTitle(slug) {
  return (slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PostCardItem({ post }) {
  const slug         = post.slug     || post._id;
  const title        = post.title    || 'Untitled';
  const excerpt      = post.excerpt  || '';
  const imageUrl     = resolveMediaUrl(post.featuredImage);
  const readTime = estimateReadTime(post.content);

  return (
    <article className="group flex flex-col border border-[#333333] bg-[#000000]">
      <Link to={`/blog/${slug}`} aria-label={`Read "${title}"`} tabIndex={-1}
        className="block overflow-hidden aspect-video bg-[#111111]">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" crossOrigin="anonymous"
            className="w-full h-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111111]">
            <svg className="w-10 h-10 text-[#333333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="1"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="3,15.5 8,10.5 12,14.5 16,11.5 21,15.5"/>
            </svg>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-2">
  
        <h2 className="font-syne text-xl leading-snug">
          <Link to={`/blog/${slug}`}
            className="text-white link-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black">
            {title}
          </Link>
        </h2>

        {excerpt && (
          <p className="font-sans text-base leading-relaxed line-clamp-2 flex-1" style={{ color: '#777777' }}>
            {excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 font-sans text-sm mt-auto pt-2 border-t border-[#333333]" style={{ color: '#777777' }}>
          <time dateTime={post.publishedAt || post.createdAt}>{formatDate(post.publishedAt || post.createdAt)}</time>
        </div>
      </div>
    </article>
  );
}

function PostCardSkeleton() {
  return (
    <div className="border border-[#333333] animate-pulse" aria-hidden="true">
      <div className="aspect-video bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-white/5" />
        <div className="h-5 w-full bg-white/5" />
        <div className="h-5 w-3/4 bg-white/5" />
        <div className="h-3 w-24 bg-white/5 mt-4" />
      </div>
    </div>
  );
}

export default function TagFeed() {
  const { tag: tagSlug } = useParams();

  const { data: tag, isLoading: isTagLoading } = useQuery({
    queryKey: ['tag', tagSlug],
    queryFn:  () => fetchTag(tagSlug),
    staleTime: 60_000,
    retry: 1,
  });

  const { data, isLoading: isPostsLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['public-posts-tag', tagSlug],
      queryFn:  ({ pageParam }) => fetchPostsByTag({ tagSlug, pageParam }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      staleTime: 30_000,
    });

  const allPosts     = data?.pages.flatMap((p) => p.posts) ?? [];
  const total        = data?.pages[0]?.total ?? 0;
  const isLoading    = isTagLoading || isPostsLoading;
  const tagName      = tag?.name || slugToTitle(tagSlug);
  const tagPostCount = tag?.postCount ?? total;

  return (
    // ✅ FIX: was bg-surface-light (#ffffff) — now bg-surface-dark (#000000)
    <div className="bg-surface-dark text-ink-primary min-h-screen">

      <header className="border-b border-[#333333]">
        <div className="max-w-[1100px] mx-auto px-6 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 font-sans text-sm" style={{ color: '#777777' }}>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page"><span className="text-white font-bold">#{tagName}</span></li>
            </ol>
          </nav>

          <p className="font-sans text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#777777' }}>Tag</p>

          <h1 className="font-syne text-5xl md:text-6xl text-white leading-tight">
            {isTagLoading
              ? <span className="block h-12 w-64 bg-[#111111] animate-pulse" aria-hidden="true" />
              : <><span style={{ color: '#777777' }} aria-hidden="true">#</span>{tagName}</>}
          </h1>

          {!isLoading && tagPostCount > 0 && (
            <p className="font-sans text-sm mt-4 tabular-nums" style={{ color: '#777777' }}>
              {tagPostCount} {tagPostCount === 1 ? 'story' : 'stories'} tagged with{' '}
              <span className="font-bold text-white">#{tagName}</span>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-12">
        {isError && !isLoading && (
          <div className="text-center py-20">
            <p className="font-sans text-sm text-white font-bold">Failed to load posts. Please try refreshing.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading posts" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && allPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-12 h-px bg-[#333333]" aria-hidden="true" />
            <p className="font-syne text-2xl text-white">
              No stories tagged with &ldquo;#{tagName}&rdquo; yet.
            </p>
            <p className="font-sans text-sm" style={{ color: '#777777' }}>Stories capturing this moment are on their way.</p>
            <Link to="/blog" className="font-sans text-sm font-bold text-white border-b border-white hover:border-transparent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              ← Back to all stories
            </Link>
          </div>
        )}

        {!isLoading && !isError && allPosts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPosts.map((post) => <PostCardItem key={post._id} post={post} />)}
            </div>

            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center mt-12">
                <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                  className="px-8 py-3 font-sans text-sm font-bold text-white border border-[#333333] hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-40 disabled:cursor-not-allowed">
                  {isFetchingNextPage ? 'Loading…' : 'Load More Stories'}
                </button>
              </div>
            )}

            {!hasNextPage && allPosts.length > 0 && !isFetchingNextPage && (
              <div className="flex flex-col items-center gap-4 mt-12">
                <div className="w-12 h-px bg-[#333333]" aria-hidden="true" />
                <p className="font-sans text-sm" style={{ color: '#777777' }}>
                  All {total} {total === 1 ? 'story' : 'stories'} shown for{' '}
                  <span className="font-bold text-white">#{tagName}</span>
                </p>
                <Link to="/blog" className="font-sans text-sm font-bold text-white border-b border-white hover:border-transparent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  ← Back to all stories
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
