// frontend/src/components/public/LoadMoreButton.jsx
//
// Pagination control at the bottom of BlogFeed.jsx / CategoryFeed.jsx /
// TagFeed.jsx. Renders nothing once hasMore is false — the feed simply
// ends, no "you've reached the end" copy needed per the minimalist brief.
//
// Props:
//   onClick    — () => void
//   isLoading  — bool
//   hasMore    — bool

export default function LoadMoreButton({ onClick, isLoading, hasMore }) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-10">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="rounded-sm border border-ink-primary px-8 py-3 font-sans text-sm font-semibold text-ink-primary transition-colors duration-fast hover:bg-ink-primary hover:text-ink-inverse disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary"
      >
        {isLoading ? "Loading…" : "Load More"}
      </button>
    </div>
  );
}
