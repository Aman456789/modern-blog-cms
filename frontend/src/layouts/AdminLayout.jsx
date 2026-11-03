// frontend/src/layouts/AdminLayout.jsx
//
// Admin shell — dark theme (#000000 bg). Sidebar uses #111111 elevated
// surface. Public footer never mounts here.
//
// SEO SECURITY: Every admin route is blocked from indexing via
// <meta name="robots" content="noindex, nofollow, noarchive"> injected
// into <head> through react-helmet-async. No JSON-LD schema is emitted here.

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopNav from "../components/admin/TopNav.jsx";
import api from "../services/api.js";

// Converts a URL segment like "posts/new" → "Posts New"
function segmentToTitle(segment) {
  return segment
    .replace(/[/-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dashboard';
}

export default function AdminLayout() {
  const location = useLocation();

  // Derive a human-readable page name from the pathname
  // e.g. /admin/posts/new  →  "Posts New - Admin | Fotographiya"
  const segment = location.pathname.replace(/^\/admin\/?/, '') || 'dashboard';
  const pageName = `${segmentToTitle(segment)} — Admin | Fotographiya`;
  const SITE_URL  = "https://www.fotographiya.com";
  const pageUrl   = `${SITE_URL}${location.pathname}`;

  const webPageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    "url": pageUrl,
    "name": pageName,
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "inLanguage": "en-US"
  });

  useEffect(() => {
    // Scale up the entire UI by 25%
    document.documentElement.style.fontSize = '135%';
    
    // Cleanup: Revert to default when leaving the admin panel
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans overflow-x-hidden w-full max-w-[100%]">
      {/* ── STRICT ADMIN HEAD BLOCK ─────────────────────────────────────────
          1. noindex + nofollow MUST appear first — they are the primary
             crawl gate. Even if Googlebot reads the WebPage schema below,
             the robots directives instruct it to discard and not index.
          2. WebPage JSON-LD provides internal schema consistency without
             exposing any sensitive post/user data.
      ─────────────────────────────────────────────────────────────────── */}
      <Helmet>
        {/* Crawl block — takes precedence over any public-site meta */}
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />

        {/* Dynamic page title */}
        <title>{pageName}</title>

        {/* Minimal WebPage schema for internal consistency */}
        <script type="application/ld+json">{webPageSchema}</script>
      </Helmet>

      <TopNav onLogout={handleLogout} />

      <main className="flex-1 px-6 pt-16 pb-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
