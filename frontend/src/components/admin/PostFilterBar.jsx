// frontend/src/components/admin/PostFilterBar.jsx
//
// Filter rail above PostListTable.jsx: a debounced title search, status
// tabs (All / Draft / Published — Trashed lives in its own /admin/trash
// page, not here), and an optional category dropdown.
//
// The search debounce (300ms) lives inside this component since it's
// purely an input-timing concern; the parent only ever receives the
// already-settled value via onSearchChange, never raw keystrokes.
//
// Props:
//   searchValue      — string — controlled value shown in the input;
//                       lets the parent reset/seed it (e.g. from a URL param)
//   onSearchChange    — (value) => void — fires 300ms after typing stops
//   activeStatus      — 'ALL' | 'DRAFT' | 'PUBLISHED'
//   onStatusChange    — (status) => void
//   categories        — [{ _id, name, slug }]
//   activeCategory     — slug | null
//   onCategoryChange   — (slug | null) => void

import { useEffect, useRef, useState } from "react";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
];

const DEBOUNCE_MS = 300;

export default function PostFilterBar({
  searchValue,
  onSearchChange,
  activeStatus,
  onStatusChange,
  categories = [],
  activeCategory,
  onCategoryChange,
}) {
  const [localSearch, setLocalSearch] = useState(searchValue ?? "");
  const debounceRef = useRef(null);

  // Keep local input in sync if the parent resets searchValue externally.
  useEffect(() => {
    setLocalSearch(searchValue ?? "");
  }, [searchValue]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div role="tablist" aria-label="Filter posts by status" className="flex gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStatusChange(tab.value)}
              className={[
                "rounded-pill px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-wide transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                isActive
                  ? "bg-ink-primary text-white"
                  : "border border-[#333333] text-white hover:bg-[#000000]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {(categories || []).length > 0 && (
          <select
            aria-label="Filter by category"
            value={activeCategory ?? ""}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className="rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 font-sans text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <div className="w-56">
          <label htmlFor="post-search" className="sr-only">
            Search posts by title
          </label>
          <input
            id="post-search"
            type="search"
            value={localSearch}
            onChange={handleInputChange}
            placeholder="Search posts…"
            className="w-full rounded-sm border border-[#333333] bg-[#000000] px-4 py-2 font-sans text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
        </div>
      </div>
    </div>
  );
}
