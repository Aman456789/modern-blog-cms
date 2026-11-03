// frontend/src/components/editor/PostMetaSidebar.jsx
//
// REFACTOR — Cinematic Dark Theme
//
// Previous bugs (every form field was broken):
//   • All inputs:     bg-[#000000] (#fff) + text-white (#fff) = WHITE TEXT ON WHITE = invisible
//   • All selects:    same white-on-white problem
//   • All textareas:  same white-on-white problem
//   • focus:border-surface-dark = focusing to #000000 border = invisible on dark canvas
//   • Sidebar container: border-[#333333] is correct (#333333) — kept
//   • Tag pills: border-[#333333] OK, but text-white (#fff) on transparent = fine
//
// Fix applied universally:
//   bg-[#000000] → bg-[#000000]
//   text-white → text-white (explicit)
//   border-[#333333] → border-[#333333] (explicit)
//   focus:border-surface-dark → focus-visible:border-white
//   placeholder text → placeholder:text-[#555555]
//   All label text: text-[#777777] → text-[#777777] (same value, explicit)

import SmartSuggestions from "./SmartSuggestions.jsx";

const MAX_LENGTHS = {
  excerpt: 320,
  metaTitle: 512,
  metaDescription: 160,
};

// Shared dark input class — replaces the old bg-[#000000] pattern throughout
const inputBase = [
  "w-full rounded-sm bg-[#000000] border border-[#333333]",
  "px-3 py-2.5 font-sans text-sm text-white",
  "placeholder:text-[#555555]",
  "transition-colors duration-[200ms]",
  "focus-visible:outline-none focus-visible:border-white focus-visible:ring-0",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

function CharCount({ value, max }) {
  const count   = value?.length ?? 0;
  const isOver  = count > max;
  const nearMax = count > max * 0.85;
  return (
    <span
      className={`font-sans text-[10px] tabular-nums ${
        isOver  ? "text-white font-semibold" :
        nearMax ? "text-[#A1A1AA]" :
                  "text-[#555555]"
      }`}
    >
      {count}/{max}
    </span>
  );
}

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#777777]"
    >
      {children}
    </label>
  );
}

export default function PostMetaSidebar({
  slug,
  status,
  categoryInput,
  tagInput,
  tags,
  excerpt = "",
  featuredImageUrl = "",
  metaTitle = "",
  metaDescription = "",
  onSlugChange,
  onStatusChange,
  onTagInputChange,
  onTagSelect,
  onTagRemove,
  onExcerptChange,
  onFeaturedImageUrlChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onBlurField,
}) {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      {/* FIX: border-[#333333] → border-[#333333], added bg-[#0a0a0a] dark panel bg */}
      <div className="flex flex-col gap-6 rounded-sm border border-[#333333] bg-[#0a0a0a] p-6">

        {/* ── Slug ──────────────────────────────────────────────────── */}
        <div>
          <FieldLabel htmlFor="post-slug">Slug</FieldLabel>
          {/* FIX: was bg-[#000000] text-white = white on white */}
          <input
            id="post-slug"
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            onBlur={onBlurField}
            placeholder="post-url-slug"
            className={inputBase}
          />
        </div>

        {/* ── Status ────────────────────────────────────────────────── */}
        <div>
          <FieldLabel htmlFor="post-status">Status</FieldLabel>
          {/* FIX: was bg-[#000000] text-white = white on white */}
          <select
            id="post-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={inputBase}
            style={{ colorScheme: "dark" }}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>

        {/* ── Tags ──────────────────────────────────────────────────── */}
        <div>
          <SmartSuggestions
            kind="tag"
            label="Tags"
            value={tagInput}
            onChange={onTagInputChange}
            onSelect={onTagSelect}
            placeholder="Search tags…"
          />

          {tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {tags.map((tagId) => (
                <li
                  key={tagId}
                  className="flex items-center gap-2 rounded-pill border border-[#333333] bg-[#111111] px-3 py-1 font-sans text-sm text-white"
                >
                  <span>#{tagId.replace(/^#+/g, '')}</span>
                  <button
                    type="button"
                    aria-label="Remove tag"
                    onClick={() => onTagRemove(tagId)}
                    className="text-[#777777] hover:text-white transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-sm"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── SEO & Sharing ─────────────────────────────────────────── */}
        {/* FIX: border-[#333333] → border-[#333333] */}
        <div className="border-t border-[#333333] pt-6">
          <p className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#777777]">
            SEO &amp; Sharing
          </p>

          <div className="flex flex-col gap-5">

            {/* Featured image URL */}
            <div>
              <FieldLabel htmlFor="post-featured-image">Featured image URL</FieldLabel>
              {/* FIX: was bg-[#000000] text-white */}
              <input
                id="post-featured-image"
                type="url"
                value={featuredImageUrl}
                onChange={(e) => onFeaturedImageUrlChange?.(e.target.value)}
                onBlur={onBlurField}
                placeholder="https://…"
                className={inputBase}
              />
            </div>

            {/* Excerpt */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel htmlFor="post-excerpt">Excerpt</FieldLabel>
                <CharCount value={excerpt} max={MAX_LENGTHS.excerpt} />
              </div>
              {/* FIX: was bg-[#000000] text-white */}
              <textarea
                id="post-excerpt"
                rows={3}
                maxLength={MAX_LENGTHS.excerpt}
                value={excerpt}
                onChange={(e) => onExcerptChange?.(e.target.value)}
                onBlur={onBlurField}
                className={`${inputBase} resize-none`}
                placeholder="A brief summary shown in search results and social sharing…"
              />
            </div>

            {/* Meta title */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel htmlFor="post-meta-title">Meta title</FieldLabel>
                <CharCount value={metaTitle} max={MAX_LENGTHS.metaTitle} />
              </div>
              {/* FIX: was bg-[#000000] text-white */}
              <input
                id="post-meta-title"
                type="text"
                maxLength={MAX_LENGTHS.metaTitle}
                value={metaTitle}
                onChange={(e) => onMetaTitleChange?.(e.target.value)}
                onBlur={onBlurField}
                placeholder="Override the page <title>…"
                className={inputBase}
              />
            </div>

            {/* Meta description */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel htmlFor="post-meta-description">Meta description</FieldLabel>
                <CharCount value={metaDescription} max={MAX_LENGTHS.metaDescription} />
              </div>
              {/* FIX: was bg-[#000000] text-white */}
              <textarea
                id="post-meta-description"
                rows={2}
                maxLength={MAX_LENGTHS.metaDescription}
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange?.(e.target.value)}
                onBlur={onBlurField}
                className={`${inputBase} resize-none`}
                placeholder="Override the meta description for search engines…"
              />
            </div>

          </div>
        </div>
      </div>
    </aside>
  );
}
