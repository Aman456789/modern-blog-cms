// frontend/vite.config.js
//
// Vite compilation configuration for the Fotographiya React SPA.
//
// Key decisions:
//   - Dev server on port 5173 (per TRD §1 stack table)
//   - Proxy /api/* and /uploads/* to the Express backend on :5000 so
//     the browser never needs CORS during local development. Credentials
//     are forwarded so the HttpOnly JWT cookie round-trips correctly.
//   - '@' alias resolves to /src for clean deep imports.
//   - Build output goes to /dist (default Vite convention).

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // ── React plugin (JSX transform + HMR) ────────────────────────────────
  plugins: [react()],

  // ── Path aliases ───────────────────────────────────────────────────────
  resolve: {
    alias: {
      // '@/components/Foo' → 'src/components/Foo'
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // ── Dev server ─────────────────────────────────────────────────────────
  server: {
    host: true,
    port: 5173,
    strictPort: true, // Fail hard if 5173 is occupied (avoids silent port drift)
    open: false,      // Don't auto-open browser — admin chooses when to preview

    proxy: {
      // All /api/* calls forwarded to the Express server.
      // changeOrigin rewrites the Host header so Express CORS rules pass.
      // Cookies (withCredentials) are preserved because secure is false
      // in dev (HTTP localhost).
      '/api': {
        target:       process.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com',
        changeOrigin: true,
        secure:       false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[vite proxy /api] proxy error:', err.message);
          });
        },
      },

      // Static uploads served by Express (`express.static`).
      // Proxied here so <img src="/uploads/…"> works without absolute URLs.
      '/uploads': {
        target:       process.env.VITE_API_URL || 'http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com',
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  // ── Preview server (vite preview) ─────────────────────────────────────
  preview: {
    host: true,
    port: 5173,
  },

  // ── Build ──────────────────────────────────────────────────────────────
  build: {
    outDir:     'dist',
    sourcemap:  true,       // Helps debugging production builds locally
    target:     'es2020',
    // Chunk strategy: keep vendor heavy hitters (TipTap, GSAP) in their
    // own named chunks so the main bundle stays lightweight.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':   ['@tanstack/react-query'],
          'vendor-tiptap':  [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-underline',
            '@tiptap/extension-image',
            '@tiptap/extension-link',
          ],
          'vendor-gsap':    ['gsap'],
        },
      },
    },
  },

  // ── CSS ────────────────────────────────────────────────────────────────
  css: {
    // devSourcemap gives accurate CSS line numbers in DevTools during dev.
    devSourcemap: true,
  },
});