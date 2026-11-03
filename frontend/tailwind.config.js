// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      colors: {
        // DESIGN.md primary tokens
        'site-base': '#000000',
        'site-surface': '#111111',
        'site-text': '#ffffff',
        'site-muted': '#777777',
        'site-border': '#333333',

        // Legacy B&W tokens remapped for dark theme
        'surface-dark': '#000000',
        'surface-dark-elevated': '#111111',
        'surface-light': '#ffffff',
        'surface-mid': '#333333',
        'ink-primary': '#ffffff',
        'ink-inverse': '#000000',
        'ink-muted': '#777777',
      },

      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        md: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['48px', { lineHeight: '1.1' }],
        base: ['16px', { lineHeight: '1.6' }],
      },

      // DESIGN.md spacing scale — named with 'ds-' prefix so they don't
      // collide with Tailwind's built-in numeric space-1 through space-8.
      // Use ds-1 through ds-8 in new code; existing components using
      // p-5 / p-6 / p-8 etc. continue to use Tailwind's correct defaults.
      spacing: {
        'ds-1': '4px',
        'ds-2': '8px',
        'ds-3': '12px',
        'ds-4': '16px',
        'ds-5': '24px',
        'ds-6': '32px',
        'ds-7': '48px',
        'ds-8': '64px',
      },

      borderRadius: {
        sm: '2px',
        md: '4px',
        pill: '9999px',
      },

      transitionDuration: {
        instant: '200ms',
        fast: '250ms',
        normal: '350ms',
        slow: '700ms',
      },

      zIndex: {
        drawer: '1001',
        overlay: '999',
        toast: '1100',
      },

      maxWidth: {
        reading: '760px',
      },

      keyframes: {
        heroFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        heroFadeIn: 'heroFadeIn 0.7s ease-out',
        fadeIn: 'fadeIn 0.25s ease-out',
      },
    },
  },

  plugins: [require('@tailwindcss/typography'),],
};