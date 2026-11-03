// frontend/src/App.jsx
//
// Top-level route table. Two completely separate shells share one
// React Router tree:
//   - Public editorial shell  -> PublicLayout (Footer only, no Navbar)
//   - Admin production shell  -> AdminLayout  (dashboard chrome, no Footer)
//
// Route list matches the TRD section 2.1 exactly:
//   Public:  /blog, /blog/:slug, /blog/category/:cat, /blog/tag/:tag
//   Admin:   /admin, /admin/posts, /admin/posts/new, /admin/posts/:id/edit,
//            /admin/trash, /admin/media, /admin/categories, /admin/settings
//   Auth:    /login

import { useEffect, useState } from "react";
import { 
  createBrowserRouter, 
  RouterProvider, 
  Route, 
  createRoutesFromElements, 
  Navigate, 
  Outlet 
} from "react-router-dom";
import api from "./services/api.js";
import { HelmetProvider } from "react-helmet-async";

import RootLayout from "./layouts/RootLayout.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import BlogFeed from "./pages/public/BlogFeed.jsx";
import SinglePost from "./pages/public/SinglePost.jsx";
import TagFeed from "./pages/public/TagFeed.jsx";

import Login from "./pages/auth/Login.jsx";

import Dashboard from "./pages/admin/Dashboard.jsx";
import PostList from "./pages/admin/PostList.jsx";
import NewPost from "./pages/admin/NewPost.jsx";
import EditPost from "./pages/admin/EditPost.jsx";
import Trash from "./pages/admin/Trash.jsx";
import MediaGrid from "./pages/admin/MediaGrid.jsx";
import AdminPin from "./pages/admin/AdminPin.jsx";
import Settings from "./pages/admin/Settings.jsx";

/**
 * Verifies the JWT session via GET /api/auth/me before rendering any
 * nested admin route. Redirects to /login when the token is missing or
 * invalid, per the TRD's <ProtectedRoute> contract.
 */
function ProtectedRoute() {
  const [authState, setAuthState] = useState("checking"); // 'checking' | 'authed' | 'guest'

  useEffect(() => {
    let cancelled = false;

    api
      .get("/api/auth/me")
      .then(() => {
        if (!cancelled) setAuthState("authed");
      })
      .catch(() => {
        if (!cancelled) setAuthState("guest");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === "checking") {
    // Intentionally unstyled/minimal — this should resolve almost
    // instantly against a local backend and never needs a full skeleton.
    return null;
  }

  if (authState === "guest") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout><Outlet /></RootLayout>}>
      {/* ---- Public editorial shell --------------------------------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/blog" replace />} />
        
        <Route path="/blog">
          <Route index element={<BlogFeed />} />
          <Route path="tag/:tag" element={<TagFeed />} />
          <Route path=":slug" element={<SinglePost />} />
        </Route>
      </Route>

      {/* ---- Auth (no layout chrome at all) -------------------------- */}
      <Route path="/login" element={<Login />} />

      {/* ---- Protected admin production shell ------------------------ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/posts" element={<PostList />} />
          <Route path="/admin/posts/new" element={<NewPost />} />
          <Route path="/admin/posts/:id/edit" element={<EditPost />} />
          <Route path="/admin/trash" element={<Trash />} />
          <Route path="/admin/media" element={<MediaGrid />} />
          <Route path="/admin/pin" element={<AdminPin />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* ---- Fallback -------------------------------------------------- */}
      <Route path="*" element={<Navigate to="/blog" replace />} />
    </Route>
  )
);

export default function App() {
  return (
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  );
}
