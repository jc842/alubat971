/**
 * Configuration publicitaire Revive Adserver pour le domaine alubat971.com
 * Source : Inventaire ads.les4h.fr (Affiliate ID 132 - PBN_alubat971.com)
 */

export interface AdZoneConfig {
  zoneId: number;
  format: 'leaderboard' | 'mediumRectangle' | 'mobileBanner' | 'largeRectangle' | 'halfPage' | 'skyscraper';
  width: number;
  height: number;
  name: string;
}

export type AdSlotKey =
  | 'header'
  | 'inContent'
  | 'mobileSticky'
  | 'largeRectangle'
  | 'halfPage'
  | 'skyscraper';

export interface DomainAdsConfig {
  domain: string;
  affiliateId: number;
  reviveId: string;
  scriptUrl: string;
  zones: Record<AdSlotKey, AdZoneConfig>;
}

export const adsConfig: DomainAdsConfig = {
  domain: 'alubat971.com',
  affiliateId: 132,
  reviveId: 'ac119b122a644588953c74c4c1daee06',
  scriptUrl: '//ads.les4h.fr/www/delivery/asyncjs.php',
  zones: {
    header: {
      zoneId: 786,
      format: 'leaderboard',
      width: 728,
      height: 90,
      name: 'Leaderboard 786',
    },
    inContent: {
      zoneId: 785,
      format: 'mediumRectangle',
      width: 300,
      height: 250,
      name: 'Medium Rectangle 785',
    },
    mobileSticky: {
      zoneId: 784,
      format: 'mobileBanner',
      width: 320,
      height: 100,
      name: 'Mobile Banner 784',
    },
    largeRectangle: {
      zoneId: 788,
      format: 'largeRectangle',
      width: 336,
      height: 280,
      name: 'Large Rectangle 788',
    },
    halfPage: {
      zoneId: 787,
      format: 'halfPage',
      width: 300,
      height: 600,
      name: 'Half Page 787',
    },
    skyscraper: {
      zoneId: 789,
      format: 'skyscraper',
      width: 160,
      height: 600,
      name: 'Skyscraper 789',
    },
  },
};
