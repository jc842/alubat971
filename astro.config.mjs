import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import { siteConfig } from './src/config/site.config';

const isDev = process.env.NODE_ENV !== 'production' && !process.env.CI && !process.env.CF_PAGES;

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  i18n: {
    defaultLocale: siteConfig.i18n.defaultLocale || 'fr',
    locales: siteConfig.i18n.locales || ['fr', 'en', 'es'],
    routing: {
      prefixDefaultLocale: siteConfig.i18n.prefixDefaultLocale || false,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['@keystatic/astro', '@keystatic/core', 'astro:env/server'],
    },
  },
  integrations: [
    tailwind(),
    react(),
    ...(isDev || process.env.ENABLE_KEYSTATIC ? [keystatic()] : []),
  ],
});

