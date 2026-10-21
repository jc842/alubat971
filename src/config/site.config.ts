export interface SiteConfig {
  name: string;
  siteName: string;
  domain: string;
  url: string;
  siteUrl: string;
  description: string;
  siteDescription: string;
  defaultAuthor: string;
  repo: string;
  contact: {
    phone: string;
    phoneFormatted: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    hours: string;
  };
  i18n: { defaultLocale: string; locales: string[]; prefixDefaultLocale: boolean; };
  theme: { style: string; fontFamily: string; colorScheme: string; };
  matomo: { url: string; siteId: string; containerId: string; };
  revive: { scriptUrl: string; affiliateId: number; zones: Record<string, { zoneId: number; format: string }>; };
  legal: { editor: string; address: string; contactEmail: string; hostName: string; hostAddress: string; };
  categories: Array<{ id: string; label: string }>;
}

export const siteConfig: SiteConfig = {
  name: "ALUBAT Guadeloupe — Fabricant & Installateur de Menuiseries Aluminium",
  siteName: "ALUBAT Guadeloupe",
  domain: "alubat971.com",
  url: "https://alubat971.com",
  siteUrl: "https://alubat971.com",
  description: "Fabricant et installateur de menuiseries aluminium en Guadeloupe. 3 000 m² d'ateliers à Jarry Baie-Mahault : baies coulissantes, pergolas bioclimatiques, fenêtres et volets paracycloniques, portes Volma et vérandas.",
  siteDescription: "Fabricant et installateur de menuiseries aluminium en Guadeloupe. 3 000 m² d'ateliers à Jarry Baie-Mahault : baies coulissantes, pergolas bioclimatiques, fenêtres et volets paracycloniques, portes Volma et vérandas.",
  defaultAuthor: "ALUBAT Guadeloupe",
  repo: "jc842/alubat971",

  contact: {
    phone: "0590266440",
    phoneFormatted: "0590 26 64 40",
    email: "contact@alubat971.com",
    address: "Immeuble ABA2000, Boulevard de Houëlbourg Nord, Z.I. Jarry",
    city: "Baie-Mahault",
    postalCode: "97122",
    hours: "Lundi au Vendredi : 8h00 – 16h00",
  },

  i18n: {
    defaultLocale: "fr",
    locales: ["fr"],
    prefixDefaultLocale: false,
  },

  theme: {
    style: "lexington-bastion",
    fontFamily: "Plus Jakarta Sans, Space Grotesk, sans-serif",
    colorScheme: "charcoal",
  },

  matomo: {
    url: "https://analytics.les4h.fr/",
    siteId: "3",
    containerId: "cuSJYKXJ",
  },

  revive: {
    scriptUrl: "//ads.les4h.fr/www/delivery/asyncjs.php",
    affiliateId: 132,
    zones: {
      mobileSticky: { zoneId: 784, format: "mobileBanner" },
      inContent: { zoneId: 785, format: "mediumRectangle" },
      header: { zoneId: 786, format: "leaderboard" },
      halfPage: { zoneId: 787, format: "halfPage" },
      largeRectangle: { zoneId: 788, format: "largeRectangle" },
      skyscraper: { zoneId: 789, format: "skyscraper" },
    },
  },

  legal: {
    editor: "Société ALUBAT (Directeur de la publication : M. Renaud DE LIGNY)",
    address: "Immeuble ABA2000, Boulevard de Houëlbourg Nord, Z.I. Jarry, 97122 Baie-Mahault, Guadeloupe",
    contactEmail: "contact@alubat971.com",
    hostName: "Cloudflare Pages",
    hostAddress: "Cloudflare, Inc. 101 Townsend St, San Francisco, CA 94107, USA",
  },

  categories: [
    { id: "baies-coulissantes", label: "Baies Coulissantes" },
    { id: "pergolas", label: "Pergolas Bioclimatiques" },
    { id: "fenetres", label: "Fenêtres & Châssis" },
    { id: "portes", label: "Portes d'Entrée & Blindées" },
    { id: "volets", label: "Volets & Protections Solaires" },
    { id: "portes-automatiques", label: "Portes Automatiques & SAS" },
    { id: "garde-corps", label: "Garde-Corps & Clôtures" },
    { id: "facades", label: "Façades Vitrées & Murs Rideaux" },
  ],
};
