/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#b8d6ea',
          300: '#85bbdc',
          400: '#4e9bca',
          500: '#2b7fb3',
          600: '#1e6492',
          700: '#1a5075',
          800: '#194361',
          900: '#183851',
          950: '#0f2435',
        },
        base: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      }
    },
  },
  plugins: [typography],
};
