// frontend/src/components/admin/MediaFilterBar.jsx
//
// Top-rail filter controls for MediaLibrary.jsx's masonry grid: kind
// filter pills (All / Images / Videos / Unused) plus a filename search
// input. Dumb/controlled — MediaLibrary.jsx owns the actual filtering.
//
// Props:
//   activeFilter    — 'all' | 'image' | 'video' | 'orphaned'
//   onFilterChange  — (filter) => void
//   searchValue     — string
//   onSearchChange  — (value) => void

const FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "orphaned", label: "Unused" },
];

export default function MediaFilterBar({ activeFilter, onFilterChange, searchValue, onSearchChange }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Filter media by type" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(filter.value)}
              className={[
                "rounded-pill px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-wide transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                isActive
                  ? "bg-ink-primary text-white"
                  : "border border-[#333333] text-white hover:bg-[#000000]",
              ].join(" ")}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="w-full sm:w-64">
        <label htmlFor="media-search" className="sr-only">
          Search media by filename
        </label>
        <input
          id="media-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search filenames…"
          className="w-full rounded-sm border border-[#333333] bg-[#000000] px-4 py-2 font-sans text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        />
      </div>
    </div>
  );
}
