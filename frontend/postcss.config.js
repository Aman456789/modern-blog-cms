// frontend/postcss.config.js
//
// PostCSS processes Tailwind CSS directives (@tailwind base/components/utilities)
// and runs autoprefixer to add vendor prefixes for broader browser support.
// Vite picks this file up automatically — no extra configuration needed.

export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
  },
};