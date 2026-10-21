export * from './ads.config';

export const REVIVE_CONFIG = {
  id: 'ac119b122a644588953c74c4c1daee06',
  scriptUrl: '//ads.les4h.fr/www/delivery/asyncjs.php',
} as const;

export const AD_FORMATS = {
  halfPage: {
    id: 'half-page',
    name: 'Half Page (300x600)',
    width: 300,
    height: 600,
  },
  largeRectangle: {
    id: 'large-rectangle',
    name: 'Large Rectangle (336x280)',
    width: 336,
    height: 280,
  },
  leaderboard: {
    id: 'leaderboard',
    name: 'Leaderboard (728x90)',
    width: 728,
    height: 90,
  },
  mediumRectangle: {
    id: 'medium-rectangle',
    name: 'Medium Rectangle (300x250)',
    width: 300,
    height: 250,
  },
  mobileBanner: {
    id: 'mobile-banner',
    name: 'Mobile Banner (320x100)',
    width: 320,
    height: 100,
  },
  skyscraper: {
    id: 'skyscraper',
    name: 'Skyscraper (160x600)',
    width: 160,
    height: 600,
  },
} as const;

export type AdFormatKey = keyof typeof AD_FORMATS;
