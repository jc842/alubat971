/**
 * Configuration publicitaire Revive Adserver pour le domaine 123alu.com
 * Source : Inventaire ads.les4h.fr (Affiliate ID 88)
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
  domain: '123alu.com',
  affiliateId: 88,
  reviveId: 'ac119b122a644588953c74c4c1daee06',
  scriptUrl: '//ads.les4h.fr/www/delivery/asyncjs.php',
  zones: {
    header: {
      zoneId: 479,
      format: 'leaderboard',
      width: 728,
      height: 90,
      name: 'Leaderboard 479',
    },
    inContent: {
      zoneId: 480,
      format: 'mediumRectangle',
      width: 300,
      height: 250,
      name: 'Medium Rectangle 480',
    },
    mobileSticky: {
      zoneId: 488,
      format: 'mobileBanner',
      width: 320,
      height: 100,
      name: 'Mobile Banner 488',
    },
    largeRectangle: {
      zoneId: 483,
      format: 'largeRectangle',
      width: 336,
      height: 280,
      name: 'Large Rectangle 483',
    },
    halfPage: {
      zoneId: 478,
      format: 'halfPage',
      width: 300,
      height: 600,
      name: 'Half Page 478',
    },
    skyscraper: {
      zoneId: 489,
      format: 'skyscraper',
      width: 160,
      height: 600,
      name: 'Skyscraper 489',
    },
  },
};

export default adsConfig;
