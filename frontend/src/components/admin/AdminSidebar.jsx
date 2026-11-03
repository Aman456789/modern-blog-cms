// frontend/src/components/admin/AdminSidebar.jsx
// Dark theme — #111111 elevated surface, white text, #333333 dividers.

import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin",            label: "Dashboard",  end: true },
  { to: "/admin/posts",      label: "Posts" },
  { to: "/admin/trash",      label: "Trash" },
  { to: "/admin/media",      label: "Media" },
  // Categories removed (deprecated)
  { to: "/admin/settings",   label: "Settings" },
];

export default function AdminSidebar() {
  return (
    <nav
      aria-label="Admin navigation"
      className="flex h-full min-h-screen w-60 flex-col justify-between bg-[#111111] text-white"
    >
      <div>
        {/* Brand */}
        <div className="px-6 py-8 border-b border-[#333333]">
          <p className="font-syne text-2xl font-bold leading-none text-white">
            Fotographiya
          </p>
          <p className="mt-1 font-sans text-xs uppercase tracking-widest" style={{ color: "#777777" }}>
            Admin
          </p>
        </div>

        {/* Nav links */}
        <ul className="flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "block rounded-sm px-3 py-2 font-sans text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    isActive
                      ? "border border-[#333333] bg-[#111111] text-white"
                      : "text-white hover:bg-[#000000]",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer link */}
      <div className="border-t border-[#333333] px-6 py-6">
        <a
          href="/blog"
          className="font-sans text-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
          style={{ color: "#777777" }}
        >
          View public blog &rarr;
        </a>
      </div>
    </nav>
  );
}
