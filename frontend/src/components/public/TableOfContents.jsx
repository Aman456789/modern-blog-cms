// frontend/src/components/public/TableOfContents.jsx
//
// Desktop sidebar TOC (App Flow §2.3 "Desktop sidebar"). Tracks which
// heading is currently in view via IntersectionObserver and highlights
// the corresponding TOC entry — no scroll-event polling, no layout
// thrash. Active entry inverts to Black & White per the design system
// (no colored accent).

import { useEffect, useRef, useState } from "react";

/**
 * @param {object} props
 * @param {Array<{ id: string, text: string, level: number }>} props.headings
 *   Extracted from the sanitized post HTML by the parent (SinglePost.jsx),
 *   since this component only observes — it doesn't parse content.
 */
export default function TableOfContents({ headings }) {
  const [activeId, setActiveId] = useState(headings?.[0]?.id ?? null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!headings || headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Among headings currently intersecting the viewport band, pick
        // the one closest to the top — this is what "TOC Active" state
        // (App Flow route-state list) actually tracks as "current".
        const visible = entries.filter((entry) => entry.isIntersecting);

        if (visible.length > 0) {
          const topMost = visible.reduce((closest, entry) =>
            entry.boundingClientRect.top < closest.boundingClientRect.top
              ? entry
              : closest
          );
          setActiveId(topMost.target.id);
        }
      },
      {
        // Treats a heading as "current" once it crosses into the upper
        // third of the viewport and hasn't yet left the lower third —
        // a comfortable reading-position band rather than the literal
        // top edge.
        rootMargin: "-15% 0px -70% 0px",
        threshold: 0,
      }
    );

    elements.forEach((el) => observerRef.current.observe(el));

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (!headings || headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="sticky top-12">
      <p className="mb-3 font-sans text-xs uppercase tracking-widest text-ink-muted">
        Contents
      </p>
      <ul className="flex flex-col gap-2 border-l border-surface-mid">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "block border-l-2 py-0.5 pl-4 font-sans text-sm transition-colors duration-fast",
                  heading.level >= 3 ? "ml-3" : "",
                  isActive
                    ? "border-ink-primary text-ink-primary font-medium"
                    : "border-transparent text-ink-muted hover:text-ink-primary",
                ].join(" ")}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
