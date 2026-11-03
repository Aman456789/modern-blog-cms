// frontend/src/components/admin/QuickActions.jsx
//
// Standalone version of the Quick Actions row Dashboard.jsx currently
// inlines directly. Self-contained — needs no props, since its three
// destinations are fixed app routes.

import { Link, useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => navigate("/admin/posts/new")}
        className="rounded-sm bg-ink-primary px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
      >
        New Post
      </button>
      <a
        href="/blog"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm border border-[#333333] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        View Blog
      </a>
    </div>
  );
}
