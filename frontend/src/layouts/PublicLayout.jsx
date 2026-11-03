// frontend/src/layouts/PublicLayout.jsx
//
// Wraps every /blog route. Per the UI & UX brief, this layout mounts
// ONLY the custom Footer — there is no header or navbar anywhere in
// the public shell.
//
// Dark theme: bg-[#000000] (#000000), text-white (#ffffff).

import { Outlet } from "react-router-dom";
import Footer from "../components/public/Footer.jsx";
import PublicNav from "../components/public/PublicNav.jsx";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-white">
      <PublicNav />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
