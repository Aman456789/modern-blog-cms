# 📸 Fotographiya
### *Luxury Wedding Photography & Cinematic Storytelling*

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-black?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-≥20.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Local-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-Private-red?style=for-the-badge)

> **A full-stack blog and portfolio CMS purpose-built for luxury wedding photography studios.**
> Fotographiya marries a cinematic public editorial experience with a powerful, self-hosted admin CMS — all running entirely on local infrastructure, with zero cloud dependency.

</div>

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Tech Stack & Libraries](#-tech-stack--libraries)
3. [Folder & File Structure](#-folder--file-structure)
4. [Core Features & Advanced Implementations](#-core-features--advanced-implementations)
5. [Installation & Setup](#-installation--setup)
6. [Environment Variables](#-environment-variables)
7. [Available Scripts](#-available-scripts)
8. [API Architecture](#-api-architecture)
9. [Database Models](#-database-models)

---

## 🌟 Overview

**Fotographiya** is a production-ready, self-hosted content management system and editorial blog platform designed for luxury wedding photography studios. It provides:

- A **cinematic public-facing blog** with full SEO control, dynamic media galleries, and a rich reading experience.
- A **secure admin CMS** with a feature-complete post editor (TipTap), advanced media library management, analytics dashboard, and granular site settings.
- A **local-first backend** built on Node.js + Express + MongoDB — no cloud databases, no external storage buckets, no SaaS dependencies.

The platform is built to scale editorially — from a single photographer managing their own journal to a multi-author studio publishing regular cinematic stories.

---

## 🛠 Tech Stack & Libraries

### Frontend

| Technology | Package | Version | Purpose |
|---|---|---|---|
| ⚛️ **React** | `react` | ^18.3.1 | Core UI framework |
| 🧭 **React Router** | `react-router-dom` | ^6.23.1 | Client-side routing & navigation |
| ⚡ **Vite** | `vite` | ^5.2.13 | Build tool & dev server |
| 🎨 **Tailwind CSS** | `tailwindcss` | ^3.4.4 | Utility-first styling |
| 📝 **TipTap Editor** | `@tiptap/react` | ^2.4.0 | Rich text / WYSIWYG editor |
| 🔗 **TipTap Extensions** | `@tiptap/extension-*` | ^2.x | Link, Image, YouTube, Underline, Text Align, Character Count, Placeholder |
| 🔍 **React Helmet Async** | `react-helmet-async` | ^3.0.0 | Dynamic `<head>` SEO management |
| 🌐 **Axios** | `axios` | ^1.7.2 | HTTP client for API requests |
| 🐻 **Zustand** | `zustand` | ^4.5.2 | Lightweight global state management |
| 🔄 **TanStack Query** | `@tanstack/react-query` | ^5.40.0 | Server state, caching & data fetching |
| 📊 **Chart.js** | `chart.js` + `react-chartjs-2` | ^4.5.1 / ^5.3.1 | Admin dashboard analytics charts |
| 📈 **Recharts** | `recharts` | ^3.9.2 | Supplementary charting library |
| 🎞️ **Framer Motion** | `framer-motion` | ^12.42.2 | Declarative animations & transitions |
| 🟢 **GSAP** | `gsap` | ^3.12.5 | High-performance cinematic animations |
| 🖼️ **Browser Image Compression** | `browser-image-compression` | ^2.0.2 | Client-side image compression before upload |
| 🎯 **Lucide React** | `lucide-react` | ^1.24.0 | Icon library |
| 📐 **@tailwindcss/typography** | dev | ^0.5.20 | Rich prose styling for post content |

### Backend

| Technology | Package | Version | Purpose |
|---|---|---|---|
| 🟩 **Node.js** | runtime | >=20.0.0 | JavaScript server runtime |
| 🚂 **Express** | `express` | ^4.19.2 | HTTP server & routing framework |
| 🍃 **MongoDB** | local instance | — | Primary database (local) |
| 🦦 **Mongoose** | `mongoose` | ^8.5.1 | ODM, schema validation & indexing |
| 🔑 **JSON Web Token** | `jsonwebtoken` | ^9.0.2 | Stateless JWT authentication |
| 🔒 **bcrypt** | `bcrypt` | ^5.1.1 | Password hashing (cost factor: 12) |
| 🍪 **Cookie Parser** | `cookie-parser` | ^1.4.6 | HttpOnly auth cookie handling |
| 🧱 **Helmet** | `helmet` | ^8.2.0 | Security HTTP headers |
| 🚫 **CORS** | `cors` | ^2.8.5 | Cross-origin resource sharing |
| 🛡️ **Express Mongo Sanitize** | `express-mongo-sanitize` | ^2.2.0 | NoSQL injection prevention |
| 🔬 **DOMPurify** | `isomorphic-dompurify` | ^2.13.0 | HTML content sanitization |
| 📁 **Multer** | `multer` | ^1.4.5-lts.1 | Multipart file upload handling |
| ✂️ **Sharp** | `sharp` | ^0.33.4 | Server-side image processing & optimization |
| 📦 **Busboy** | `busboy` | ^1.6.0 | Streaming multipart parser |
| ⏰ **node-cron** | `node-cron` | ^3.0.3 | Scheduled tasks (trash auto-purge) |
| 🚦 **Rate Limiter Flexible** | `rate-limiter-flexible` | ^5.0.3 | API rate limiting |
| 🌱 **dotenv** | `dotenv` | ^16.4.5 | Environment variable management |
| 🔄 **Nodemon** | dev | ^3.1.4 | Auto-restart dev server on changes |

---

## 📁 Folder & File Structure

```
fotographiya-blog/
├── README.md                          # You are here
│
├── frontend/                          # React (Vite) SPA
│   ├── index.html                     # HTML entry point (Vite template)
│   ├── vite.config.js                 # Vite bundler config (proxy, aliases)
│   ├── tailwind.config.js             # Tailwind theme, custom fonts, plugins
│   ├── postcss.config.js              # PostCSS pipeline
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── .env                           # Local environment variables (gitignored)
│   ├── .env.example                   # Environment variable template
│   ├── dist/                          # Production build output
│   └── src/
│       ├── main.jsx                   # React DOM root mount, HelmetProvider
│       ├── App.jsx                    # Root router with all route definitions
│       ├── inject_security.js         # CSP / security header injection util
│       │
│       ├── assets/                    # Static assets (fonts, SVGs, images)
│       │
│       ├── layouts/                   # Top-level page wrappers
│       │   ├── RootLayout.jsx         # QueryClientProvider, ErrorBoundary, ScrollRestoration
│       │   ├── AdminLayout.jsx        # Admin shell with AdminSidebar + TopNav
│       │   └── PublicLayout.jsx       # Public shell with Navbar, Footer
│       │
│       ├── pages/
│       │   ├── auth/
│       │   │   └── Login.jsx          # Admin login page (JWT auth)
│       │   ├── admin/
│       │   │   ├── Dashboard.jsx      # Analytics overview (charts, stats cards)
│       │   │   ├── PostList.jsx       # Paginated post management table
│       │   │   ├── NewPost.jsx        # Full TipTap post creation editor
│       │   │   ├── EditPost.jsx       # Full TipTap post editing editor
│       │   │   ├── Trash.jsx          # Soft-deleted posts & media manager
│       │   │   ├── MediaGrid.jsx      # Admin media library grid view
│       │   │   ├── AdminPin.jsx       # PIN-based admin access verification
│       │   │   └── Settings.jsx       # Global site settings (SEO, branding)
│       │   └── public/
│       │       ├── BlogFeed.jsx       # Main paginated blog listing page
│       │       ├── SinglePost.jsx     # Individual post view (full article)
│       │       └── TagFeed.jsx        # Tag-filtered post listing
│       │
│       ├── components/
│       │   ├── admin/                 # Admin-only UI components
│       │   │   ├── AdminSidebar.jsx         # Admin navigation sidebar
│       │   │   ├── TopNav.jsx               # Admin top navigation bar
│       │   │   ├── DashboardStatsCard.jsx   # KPI stat cards
│       │   │   ├── PublishActivityChart.jsx  # Post publish activity chart
│       │   │   ├── RecentDraftsList.jsx     # Recent drafts quick access
│       │   │   ├── QuickActions.jsx         # Admin quick-action shortcuts
│       │   │   ├── PostListTable.jsx        # Sortable post data table
│       │   │   ├── PostFilterBar.jsx        # Post list filter/search controls
│       │   │   ├── BulkActionsToolbar.jsx   # Multi-select bulk operations
│       │   │   ├── MediaLibrary.jsx         # Full media library manager
│       │   │   ├── MediaFilterBar.jsx       # Media library filter controls
│       │   │   ├── MediaDetailPanel.jsx     # Media item detail & metadata editor
│       │   │   ├── MediaPreviewModal.jsx    # Lightbox preview for media items
│       │   │   ├── ConfirmActionModal.jsx   # Generic confirmation dialog
│       │   │   ├── ReAuthModal.jsx          # Re-authentication gate modal
│       │   │   ├── TrashWarningBanner.jsx   # Trash lifecycle warning banner
│       │   │   └── UndoToast.jsx            # Undo notification toast
│       │   │
│       │   ├── editor/                # Rich text editor components
│       │   │   ├── TiptapEditor.jsx         # Core TipTap editor instance
│       │   │   ├── Toolbar.jsx              # Editor formatting toolbar
│       │   │   ├── PostMetaSidebar.jsx      # Post metadata & SEO fields panel
│       │   │   ├── FeaturedImageUpload.jsx  # Cover image/video upload widget
│       │   │   ├── MediaLibraryModal.jsx    # In-editor media picker modal
│       │   │   ├── TagInput.jsx             # Tag input with autocomplete
│       │   │   ├── SmartSuggestions.jsx     # AI-assisted content suggestions
│       │   │   ├── AutoSave.jsx             # Auto-save draft indicator
│       │   │   ├── VideoEmbedDialog.jsx     # YouTube/video embed dialog
│       │   │   ├── UnsavedChangesGuard.jsx  # Navigation guard for unsaved edits
│       │   │   └── extensions/             # Custom TipTap extensions
│       │   │
│       │   ├── public/                # Public-facing UI components
│       │   │   ├── SEOMeta.jsx              # Dynamic <head> SEO meta engine
│       │   │   ├── BlogSidebar.jsx          # Autonomous sticky post index sidebar
│       │   │   ├── PublicNav.jsx            # Public navigation bar (smart scroll-hide)
│       │   │   ├── Footer.jsx               # Site footer
│       │   │   ├── PostCard.jsx             # Blog feed post card
│       │   │   ├── BlogHero.jsx             # Blog listing hero banner
│       │   │   ├── PostArticleBody.jsx      # Rendered article body (TipTap HTML)
│       │   │   ├── RelatedPosts.jsx         # Related posts recommendation block
│       │   │   ├── TableOfContents.jsx      # Auto-generated article TOC
│       │   │   ├── ShareButtons.jsx         # Social share buttons
│       │   │   ├── AuthorBlock.jsx          # Post author byline block
│       │   │   ├── MediaGrid.jsx            # Public photo/video gallery grid
│       │   │   ├── Lightbox.jsx             # Full-screen media lightbox
│       │   │   ├── FloatingContactBtn.jsx   # Floating contact CTA button
│       │   │   ├── LoadMoreButton.jsx       # Pagination load-more trigger
│       │   │   └── EmptyState.jsx           # Empty state placeholder UI
│       │   │
│       │   └── ui/                    # Reusable primitive UI components
│       │       ├── Button.jsx         # Base button (variants: primary, ghost, danger)
│       │       ├── OutlineButton.jsx  # Outlined button variant
│       │       ├── Input.jsx          # Styled text input
│       │       ├── Modal.jsx          # Generic modal wrapper
│       │       ├── Dropdown.jsx       # Dropdown select component
│       │       ├── Tabs.jsx           # Tab navigation component
│       │       ├── Badge.jsx          # Status badge chip
│       │       ├── Toast.jsx          # Notification toast
│       │       ├── Skeleton.jsx       # Loading skeleton placeholder
│       │       └── LoadingSpinner.jsx # Inline loading spinner
│       │
│       ├── services/
│       │   └── api.js                 # Axios instance with base URL & interceptors
│       │
│       └── stores/
│           └── editorStore.js         # Zustand store for TipTap editor global state
│
│
└── backend/                           # Node.js + Express API server
    ├── package.json                   # Backend dependencies & scripts
    ├── .env                           # Local environment variables (gitignored)
    ├── .env.example                   # Environment variable template
    ├── seed.mjs                       # Database seeding script
    ├── fix_media_kinds.js             # One-off data migration utility
    ├── uploads/                       # Local media file storage (served as static)
    └── src/
        ├── server.js                  # Express app entry point (mounts all routes)
        │
        ├── config/
        │   └── mongoose.js            # MongoDB connection setup (Mongoose)
        │
        ├── models/
        │   ├── Post.js                # Post schema (title, slug, content, SEO fields, tags, gallery)
        │   ├── Media.js               # Media schema (kind, filename, url, caption, trash lifecycle)
        │   ├── Tag.js                 # Tag schema (name, slug)
        │   ├── User.js                # User schema (username, hashed password)
        │   └── sharedSchema.js        # Shared trash lifecycle mixin (status, trashedAt)
        │
        ├── controllers/
        │   ├── adminPostController.js # Admin CRUD: create, update, trash, restore, purge posts
        │   ├── postController.js      # Public read: list, single post, tag feed
        │   ├── mediaController.js     # Media upload, list, update caption, trash, purge
        │   ├── authController.js      # Login, logout, JWT cookie issuance
        │   ├── settingsController.js  # Global site settings read/write
        │   ├── suggestionController.js # Smart content suggestion endpoint
        │   └── cronController.js      # Scheduled trash auto-purge logic
        │
        ├── routes/
        │   ├── publicRoutes.js        # GET /api/posts, /api/posts/:slug, /api/tags
        │   ├── adminRoutes.js         # Protected admin CRUD routes (requires auth)
        │   ├── mediaRoutes.js         # Media upload & management routes
        │   └── authRoutes.js          # POST /api/auth/login, /api/auth/logout
        │
        ├── middleware/
        │   ├── authMiddleware.js      # JWT cookie verification guard
        │   └── rateLimiter.js         # Rate-limiting rules (login, upload, API)
        │
        └── utils/
            ├── sanitize.js            # HTML sanitization (DOMPurify wrapper)
            └── schemaGenerator.js     # JSON-LD structured data schema generator
```

---

## ✨ Core Features & Advanced Implementations

### 1. 🔍 Custom SEO Engine

The `SEOMeta.jsx` component implements a **strict priority-ladder SEO system** powered by `react-helmet-async`, dynamically injecting `<title>`, `<meta>`, and `<link>` tags into the document `<head>` on every route change.

**Title Priority Ladder (Single Post View):**
```
seo_title (Custom) → post.title (Auto) → settings.metaTitle (Global) → "Fotographiya"
```

**Description Priority Ladder (Single Post View):**
```
seo_description (Custom) → post.excerpt → Auto-crop of content (155 chars) → settings.metaDescription
```

**Canonical URL Generation:**
```
https://www.fotographiya.com/blog/{post.slug}  ← Single Post
https://www.fotographiya.com                    ← Homepage / Listing
```

**`og:image` Fallback Chain:**
```
Cover Image (if not a video file)
  └─► Cover Video First-Frame Thumbnail (.jpg extension swap)
        └─► settings.defaultOgImage
              └─► https://fotographiya.com/og-default.jpg  (Hardcoded baseline)
```

The component fetches global settings via TanStack Query (`staleTime: 5 minutes`) and correctly handles both `isSinglePostView` and generic listing pages with distinct logic branches. All SEO fields (`seo_title`, `seo_description`, `seo_keywords`) are first-class fields on the Post Mongoose schema.

---

### 2. 📌 Autonomous Sticky Sidebar

`BlogSidebar.jsx` uses an **independent global fetch strategy** that completely sidesteps pagination — it calls `/api/posts?fetchAll=true` exactly once per mount, fully decoupled from the main feed's pagination state.

**Key behaviours:**

| Behaviour | Implementation |
|---|---|
| **No infinite loops** | `useEffect(() => {...}, [])` — empty dependency array guarantees a single fetch |
| **Null-safe array extraction** | Handles `res.data.posts`, `res.data.items`, `res.data.data`, `res.data`; falls back to `[]` |
| **SEO title display** | `seo_title` (non-empty string) → `post.title` |
| **Desktop layout** | Permanently visible, `sticky top-28`, `calc(100vh - 8rem)` height, glassmorphic dark card |
| **Mobile layout** | Hidden; revealed via floating trigger button with `fixed inset-0` solid overlay drawer |
| **Pinned post indicator** | Pin SVG icon badge visible on pinned posts (`isPinned: true`) |

---

### 3. 🎯 Smart Navigation

**Scroll-Hide Navbar (`PublicNav.jsx`):**

The public navigation bar uses a scroll-direction detection listener to hide itself when scrolling down (maximizing viewport real estate for content) and reappear instantly when scrolling up. This behaviour ensures readers enjoy an immersive, distraction-free article experience.

**Mobile Menu Solid Overlay:**

The mobile menu uses a `bg-black` (fully opaque) backdrop — not semi-transparent — to prevent rich background imagery and video from bleeding through the menu and creating visual noise. The overlay carries `z-[70]` to safely sit above all other stacked layers.

---

### 4. 🗂️ Advanced Media Management

The `MediaLibrary.jsx` component (admin) implements enterprise-grade file handling:

| Feature | Implementation |
|---|---|
| **Multi-file concurrent upload** | Multiple files selected simultaneously, all uploaded in parallel |
| **Duplicate file prevention** | Filename deduplication check before upload submission |
| **Null-pointer guards** | `filter(item => item !== null)` applied before every `.map()` call on media arrays |
| **Client-side image compression** | `browser-image-compression` reduces file size before hitting the network |
| **Server-side image processing** | `sharp` handles resize, format conversion, and optimization |
| **Streaming multipart parsing** | `busboy` handles concurrent multipart streams without buffering entire files |
| **Kind classification** | `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`, `PDF` enum on every Media document |
| **Soft delete / Trash** | Lifecycle: `PUBLISHED → TRASHED`; `trashedAt` timestamp; `node-cron` auto-purge |
| **Bulk operations** | `BulkActionsToolbar.jsx` enables select-all, bulk trash, bulk restore |

---

### 5. 📐 Bulletproof Responsive Layouts

All public-facing content components enforce strict overflow prevention to handle edge cases from long user-generated content strings:

| CSS Utility | Purpose |
|---|---|
| `break-words` | Breaks long words at container boundaries |
| `break-all` | Forces character-level breaks for extreme strings (URLs, hashes, tokens) |
| `line-clamp-{n}` | Limits multi-line text to N lines with ellipsis truncation |
| `max-w-[100vw]` | Hard cap on container width; prevents horizontal scroll on mobile |
| `overflow-x-hidden` | Applied at layout level to contain rogue child elements |
| `whitespace-normal` | Overrides whitespace-nowrap inheritance in sidebar items |
| `maxlength: 512` | Enforced at DB schema level and reflected in UI character limits |

---

### 6. 🧹 Sanitized API Payloads

Defense-in-depth sanitization is applied at multiple layers throughout the stack:

| Layer | Mechanism | Scope |
|---|---|---|
| **NoSQL Injection** | `express-mongo-sanitize` | All request bodies, query params |
| **HTML Sanitization** | `isomorphic-dompurify` | Post content HTML before DB write |
| **Custom Sanitizer** | `utils/sanitize.js` | DOMPurify wrapper for consistent API |
| **Null-item stripping** | `filter(Boolean)` / `filter(item => item !== null)` | Payload arrays before PATCH/POST |
| **Security Headers** | `helmet()` | Every HTTP response (HSTS, CSP, X-Frame-Options) |
| **Rate Limiting** | `rate-limiter-flexible` | Per-IP; stricter on login and upload routes |

Null stripping before PATCH/POST requests eliminates `400 Bad Request` errors caused by MongoDB ObjectId validation failures on `null` entries sneaking into array fields like `mediaGallery`.

---

## ⚙️ Installation & Setup

### Prerequisites

Ensure you have the following installed locally:

- **Node.js** `>= 20.0.0` — [nodejs.org](https://nodejs.org)
- **MongoDB** (local instance) — [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- **npm** `>= 10.x` (bundled with Node.js 20)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/fotographiya-blog.git
cd fotographiya-blog
```

---

### Step 2 — Configure Environment Variables

#### Backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your real values (see the Environment Variables section below).

#### Frontend

```bash
cp frontend/.env.example frontend/.env
```

The default value `VITE_API_URL=http://localhost:5000` works out of the box for local development. No changes are required unless you are deploying to a remote server.

---

### Step 3 — Install Dependencies

Install backend and frontend dependencies separately:

```bash
# Backend
cd backend
npm install

# Frontend (open a new terminal or navigate back)
cd ../frontend
npm install
```

---

### Step 4 — Start MongoDB

Ensure your local MongoDB instance is running before starting the backend:

```bash
# macOS / Linux (Homebrew)
brew services start mongodb-community

# Windows (if installed as a Windows Service)
net start MongoDB

# Or run the mongod daemon directly
mongod --dbpath /path/to/your/db/data
```

The backend connects to `mongodb://127.0.0.1:27017/fotographiya_blog` by default.

---

### Step 5 — Seed the Database *(Optional)*

To create an initial admin user account:

```bash
cd backend
node seed.mjs
```

---

### Step 6 — Start Development Servers

Open **two separate terminal windows** and start both servers simultaneously:

**Terminal 1 — Backend API Server:**
```bash
cd backend
npm run dev
# API server running at http://localhost:5000
```

**Terminal 2 — Frontend Dev Server:**
```bash
cd frontend
npm run dev
# Vite dev server running at http://localhost:5173
```

---

### Step 7 — Access the Application

| Interface | URL |
|---|---|
| 📖 Public Blog | `http://localhost:5173` |
| 🔐 Admin Login | `http://localhost:5173/admin/login` |
| 📊 Admin Dashboard | `http://localhost:5173/admin/dashboard` |
| 🔌 Backend API | `http://localhost:5000/api` |

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Default / Example | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/fotographiya_blog` | Local MongoDB connection string |
| `JWT_SECRET` | *(generate with crypto)* | Secret key for signing/verifying JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry duration |
| `BCRYPT_SALT_ROUNDS` | `12` | bcrypt hashing cost factor for admin passwords |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (must match Vite dev server exactly) |
| `UPLOAD_DIR` | `C:\fotographiya-blog\backend\uploads` | Absolute path for local media file storage |
| `CRON_SECRET` | *(generate with crypto)* | Shared secret for the scheduled trash auto-purge endpoint |
| `PORT` | `5000` | Express server listen port |
| `NODE_ENV` | `development` | Runtime environment flag |

> **Generate cryptographically secure secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### Frontend (`frontend/.env`)

| Variable | Default / Example | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend API base URL injected at build time |

---

## 📜 Available Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start backend API with Nodemon (auto-restarts on file changes) |
| `npm start` | Start backend in production mode (plain `node`) |
| `node seed.mjs` | Seed the database with an initial admin user |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with Hot Module Replacement |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Serve the production build locally for testing |
| `npm run lint` | Run ESLint across all `.js` and `.jsx` source files |

---

## 🌐 API Architecture

The Express backend exposes four route groups, all mounted at `/api/`:

| Route Group | Prefix | Auth Required | Description |
|---|---|---|---|
| **Public** | `/api/posts`, `/api/tags` | ❌ No | Read-only post listing, single post by slug, tag feeds |
| **Admin** | `/api/admin/posts/*` | ✅ JWT Cookie | Full CRUD for posts; trash, restore, permanent purge |
| **Media** | `/api/media/*` | ✅ JWT Cookie | Upload, list, caption update, trash, purge media |
| **Auth** | `/api/auth/*` | ❌ / ✅ | Login (issues HttpOnly JWT cookie); Logout |
| **Settings** | `/api/settings` | ✅ JWT (write) | Global site config: SEO defaults, branding, OG image |

**Security middleware applied globally:**

- `helmet()` — Injects secure HTTP response headers
- `express-mongo-sanitize()` — Strips NoSQL injection vectors from all inputs
- `rateLimiter` — Per-IP rate limiting (stricter thresholds on login & upload)
- `authMiddleware` — JWT cookie verification on every protected route

---

## 🗄️ Database Models

### `Post`

| Field | Type | Description |
|---|---|---|
| `title` | String (required) | Post title, max 512 chars |
| `slug` | String (unique) | URL-safe identifier, auto-indexed |
| `content` | String (required) | HTML body from TipTap (DOMPurify sanitized) |
| `excerpt` | String | Short summary, max 320 chars |
| `featuredImageUrl` | String | Cover image or cover video URL |
| `isPinned` | Boolean | Pinned posts appear at top of sidebar |
| `seo_title` | String | Custom SEO page title, max 255 chars |
| `seo_description` | String | Custom SEO meta description, max 300 chars |
| `seo_keywords` | String | Custom SEO keywords, max 255 chars |
| `metaTitle` | String | Legacy meta title field, max 512 chars |
| `metaDescription` | String | Legacy meta description, max 160 chars |
| `author` | Embedded Object | `{ authorName, authorAvatar }` |
| `authorId` | ObjectId (ref: User) | Author reference |
| `mediaGallery` | [ObjectId] (ref: Media) | Attached media items |
| `tags` | [String] | Post tags array |
| `publishedAt` | Date | Null if draft; ISO Date if published |
| `status` | Enum | `DRAFT`, `PUBLISHED`, `TRASHED` |
| `trashedAt` | Date | Timestamp when moved to trash |

**Compound Indexes:** `status + publishedAt`, `author + status + publishedAt`, `tags + status + publishedAt`, `status + trashedAt`. Full-text index on title, excerpt, metaTitle, metaDescription.

---

### `Media`

| Field | Type | Description |
|---|---|---|
| `kind` | Enum (required) | `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`, `PDF` |
| `filename` | String (unique) | Stored filename on disk |
| `originalName` | String | Original client-provided upload filename |
| `mimeType` | String | MIME type, e.g. `image/webp`, `video/mp4` |
| `sizeBytes` | Number | Final stored file size in bytes (max 500MB) |
| `url` | String (unique) | Publicly accessible static URL |
| `caption` | String | Optional media caption (editable post-upload) |
| `videoDurationInSeconds` | Number | Duration metadata for video files |
| `mediaCategory` | String | Category label (default: `"Wedding"`) |
| `postId` | ObjectId (ref: Post) | Associated post reference (nullable) |
| `uploadedBy` | ObjectId (ref: User) | Uploader user reference |
| `status` | Enum | `PUBLISHED` (default) or `TRASHED` |
| `trashedAt` | Date | Timestamp when trashed |

---

### `Tag`

Stores normalized tag slugs paired with display names. Indexed for fast tag-feed aggregation queries.

---

### `User`

Stores admin credentials: `username` (unique index) and `passwordHash` (bcrypt, cost factor 12). Authentication is stateless via an HttpOnly JWT cookie with a 7-day expiry. No session store is required.

---

### `sharedSchema` (Lifecycle Mixin)

A reusable Mongoose schema fragment injected into both `Post` and `Media` models via the spread operator:

| Field | Type | Description |
|---|---|---|
| `status` | Enum | `DRAFT`, `PUBLISHED`, or `TRASHED` |
| `trashedAt` | Date (default: null) | Set when a document is soft-deleted |

---

<div align="center">

---

*Fotographiya — where luxury meets cinematic storytelling.*
*© 2024 Fotographiya. All rights reserved. Private & Proprietary.*

</div>
