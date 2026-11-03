// frontend/src/components/public/FloatingContactBtn.jsx
//
// Floating action button that fades in once the reader has scrolled past
// a 300px threshold, per the file directory's "300px window delta
// viewport floating hook". This blog SPA's route table has no /contact
// page (only /blog, /login, /admin), so the destination is configurable
// via props rather than hardcoded — defaults to a mailto link, but an
// external link (e.g. WhatsApp) can be passed in instead.
//
// Props:
//   href   — string, default "mailto:hello@fotographiya.com"
//   label  — string, default "Contact"

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 300;

export default function FloatingContactBtn({ href = "mailto:hello@fotographiya.com", label = "Contact" }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      className={[
        "fixed bottom-6 right-6 flex items-center gap-2 rounded-pill bg-ink-primary px-5 py-3 font-sans text-sm font-semibold text-ink-inverse transition-all duration-normal hover:bg-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink-primary",
        isVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
      ].join(" ")}
      style={{ zIndex: "var(--z-drawer)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 4h16v12H7l-3 3V4z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </a>
  );
}
