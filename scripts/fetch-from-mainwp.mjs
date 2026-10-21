import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MAINWP_HOST = 'dashboard.les4h.fr';
const MAINWP_TOKEN = '117f531abf9398f8e8f71b3ce8ee1f23e6718d71==069b4897b86d1042824d8c6650563fac5f9be4e3';
const MATOMO_HOST = 'analytics.les4h.fr';
const MATOMO_TOKEN = '2ef383e8f4a26ceb890cc09879ff8cfb';

const BLOG_OUTPUT = path.join(rootDir, 'src', 'content', 'blog');
const PAGES_OUTPUT = path.join(rootDir, 'src', 'content', 'pages');
const IMAGES_OUTPUT = path.join(rootDir, 'public', 'images');
const REDIRECTS_FILE = path.join(rootDir, 'public', '_redirects');
const CONFIG_FILE = path.join(rootDir, 'src', 'config', 'site.config.ts');

function requestHttps(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function cleanHtmlToMarkdown(html = '') {
  if (!html) return '';
  let md = String(html);

  md = md.replace(/<!--\s*\/?wp:[^>]*-->/g, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');

  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?ul[^>]*>/gi, '\n');
  md = md.replace(/<\/?ol[^>]*>/gi, '\n');

  md = md.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, '');

  md = md.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ');

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function emptyDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {}
  await fs.mkdir(dir, { recursive: true });
}

async function processImage(url, slug) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const filename = `${slug}-hero.webp`;
    const localPath = path.join(IMAGES_OUTPUT, filename);

    if (!fsSync.existsSync(localPath)) {
      const u = new URL(url);
      const res = await new Promise((resolve, reject) => {
        https.get({
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res) => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      });

      try {
        const sharp = (await import('sharp')).default;
        await sharp(res)
          .resize(800, 1000, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(localPath);
      } catch (err) {
        // Fallback sans sharp si non encore installé
        await fs.writeFile(localPath.replace('.webp', '.jpg'), res);
        return `/images/${slug}-hero.jpg`;
      }
    }
    return `/images/${filename}`;
  } catch (err) {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const siteArg = args.find(a => a.startsWith('--site=') || a.startsWith('--site-id='));
  const isList = args.includes('--list');

  console.log('📡 Connexion à l\'API MainWP v2 (dashboard.les4h.fr)...');

  // 1. Récupération des sites
  const sitesRes = await requestHttps({
    hostname: MAINWP_HOST,
    path: '/wp-json/mainwp/v2/sites?per_page=100',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Authorization': `Bearer ${MAINWP_TOKEN}`,
      'Accept': 'application/json'
    }
  });

  const allSites = sitesRes.data?.data || [];
  const pbnSites = allSites.filter(s => {
    const tags = Object.values(s.tags || {}).map(t => String(t).toUpperCase());
    return tags.includes('PBN');
  });

  if (isList || !siteArg) {
    console.log(`\n📋 ${pbnSites.length} sites PBN disponibles dans MainWP :`);
    pbnSites.forEach(s => {
      console.log(`  --site=${s.id}  ->  ${s.name.padEnd(35)} (${s.url})`);
    });
    console.log('\n💡 Utilisation : node scripts/fetch-from-mainwp.mjs --site=<ID>');
    return;
  }

  const targetId = siteArg.split('=')[1];
  const targetSite = pbnSites.find(s => String(s.id) === targetId || s.url.includes(targetId));

  if (!targetSite) {
    console.error(`❌ Aucun site PBN trouvé avec l'identifiant "${targetId}".`);
    return;
  }

  console.log(`\n🎯 Extraction ciblée pour le site [${targetSite.id}] : ${targetSite.name}`);
  console.log(`   URL WordPress d'origine : ${targetSite.url}`);

  await ensureDir(BLOG_OUTPUT);
  await ensureDir(PAGES_OUTPUT);
  await ensureDir(IMAGES_OUTPUT);

  // Nettoyage sécurisé du dossier contenu pour garantir l'isolation stricte
  await emptyDir(BLOG_OUTPUT);
  await emptyDir(PAGES_OUTPUT);

  // 2. Récupérer les articles
  console.log('  -> Récupération des articles via MainWP...');
  const postsRes = await requestHttps({
    hostname: MAINWP_HOST,
    path: `/wp-json/mainwp/v2/posts?websites=${targetSite.id}&maximum=200&status=publish`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': `Bearer ${MAINWP_TOKEN}`,
      'Accept': 'application/json'
    }
  });

  const rawPostsMap = postsRes.data?.data || {};
  let posts = [];
  for (const urlKey in rawPostsMap) {
    if (Array.isArray(rawPostsMap[urlKey])) {
      posts = posts.concat(rawPostsMap[urlKey]);
    }
  }

  console.log(`  ✅ ${posts.length} articles trouvés.`);

  // 3. Récupérer les pages
  console.log('  -> Récupération des pages via MainWP...');
  const pagesRes = await requestHttps({
    hostname: MAINWP_HOST,
    path: `/wp-json/mainwp/v2/pages?websites=${targetSite.id}&maximum=100&status=publish`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': `Bearer ${MAINWP_TOKEN}`,
      'Accept': 'application/json'
    }
  });

  const rawPagesMap = pagesRes.data?.data || {};
  let pages = [];
  for (const urlKey in rawPagesMap) {
    if (Array.isArray(rawPagesMap[urlKey])) {
      pages = pages.concat(rawPagesMap[urlKey]);
    }
  }
  console.log(`  ✅ ${pages.length} pages trouvées.`);

  // 4. Extraction et conversion des articles avec leur contenu complet
  console.log('  -> Téléchargement du contenu complet des articles...');
  const redirects = [];

  // Traitement par lots de 5 requêtes simultanées
  const BATCH_SIZE = 5;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const chunk = posts.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (p) => {
      try {
        const fullPostRes = await requestHttps({
          hostname: MAINWP_HOST,
          path: `/wp-json/mainwp/v2/posts/${targetSite.id}/${p.id}`,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Authorization': `Bearer ${MAINWP_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        const postData = fullPostRes.data?.data || {};
        let rawTitle = postData.post_title || p.title || 'Sans titre';
        const title = rawTitle
          .replace(/[\p{Extended_Pictographic}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
          .replace(/^EN IMAGES\s*\]\s*/i, '')
          .replace(/^[\s\[\]\-—:]+|[\s\[\]\-—:]+$/g, '')
          .replace(/\[\s*\]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        let rawSlug = (postData.post_name || p.title || `post-${p.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        // Nettoyage des prefixes hexadecimaux d'emojis (ex: f0-9f-aa-9f-, e2-9c-88-ef-b8-8f-, etc.)
        const slug = rawSlug
          .replace(/^((?:f0-9f|e2-[0-9a-f]{2}|d8-3c|d8-3d)(?:-[0-9a-f]{2}){1,3}-)+/i, '')
          .replace(/(^-|-$)/g, '');|-$)/g, '');

        const mdContent = cleanHtmlToMarkdown(rawContent);
        const desc = mdContent.slice(0, 160).replace(/\n/g, ' ') + '...';

        let lang = 'fr';
        if (slug.startsWith('en-') || slug.includes('-en-') || slug.endsWith('-en')) lang = 'en';
        if (slug.startsWith('es-') || slug.includes('-es-') || slug.endsWith('-es')) lang = 'es';

        const imageUrl = postData.post_featured_image || null;
        const heroImage = await processImage(imageUrl, slug);

        const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
pubDate: "${postData.post_date || p.dts || new Date().toISOString()}"
category: "${postData.post_category || p.post_category || 'Actualité'}"
lang: "${lang}"
${heroImage ? `heroImage: "${heroImage}"` : ''}
tags: []
draft: false
---

${mdContent}
`;

        await fs.writeFile(path.join(BLOG_OUTPUT, `${slug}.md`), frontmatter, 'utf8');

        redirects.push(`/${slug}  /blog/${slug}/  301`);
        redirects.push(`/${slug}/  /blog/${slug}/  301`);

      } catch (err) {
        // En cas d'erreur ponctuelle sur un post
      }
    }));
    process.stdout.write(`    [${Math.min(i + BATCH_SIZE, posts.length)}/${posts.length}] articles traités...\r`);
  }
  console.log('\n  ✅ Articles complets extraits avec succès.');

  // 5. Extraction et conversion des pages
  console.log('  -> Téléchargement du contenu complet des pages...');
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const chunk = pages.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (pg) => {
      try {
        const fullPageRes = await requestHttps({
          hostname: MAINWP_HOST,
          path: `/wp-json/mainwp/v2/pages/${targetSite.id}/${pg.id}`,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Authorization': `Bearer ${MAINWP_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        const pageData = fullPageRes.data?.data || {};
        const title = pageData.post_title || pg.title || 'Page';
        const rawContent = pageData.post_content || '';
        const slug = (pageData.post_name || pg.title || `page-${pg.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const mdContent = cleanHtmlToMarkdown(rawContent);
        const desc = mdContent.slice(0, 160).replace(/\n/g, ' ') + '...';

        const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
pubDate: "${pageData.post_date || pg.dts || new Date().toISOString()}"
lang: "fr"
draft: false
---

${mdContent}
`;

        await fs.writeFile(path.join(PAGES_OUTPUT, `${slug}.md`), frontmatter, 'utf8');
      } catch (err) {}
    }));
  }

  // 6. Écriture du fichier public/_redirects propre au site
  const redirectsContent = `# Redirections Cloudflare 301 pour ${targetSite.name}\n` + redirects.join('\n') + '\n';
  await fs.writeFile(REDIRECTS_FILE, redirectsContent, 'utf8');
  console.log(`  ✅ Fichier public/_redirects généré (${redirects.length} règles 301).`);

  // 7. Recherche de l'ID Matomo correspondant
  console.log('  -> Détection du tracking Matomo...');
  const postData = new URLSearchParams({
    module: 'API',
    method: 'SitesManager.getAllSites',
    format: 'JSON',
    token_auth: MATOMO_TOKEN
  }).toString();

  const matomoRes = await requestHttps({
    hostname: MATOMO_HOST,
    path: '/index.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0'
    }
  }, postData);

  let matomoSiteId = '1';
  if (Array.isArray(matomoRes.data)) {
    const domainMatch = targetSite.url.replace(/https?:\/\//, '').replace(/\/.*$/, '');
    const found = matomoRes.data.find(s => (s.main_url && s.main_url.includes(domainMatch)) || (s.name && s.name.toLowerCase().includes(domainMatch)));
    if (found) {
      matomoSiteId = String(found.idsite);
      console.log(`  ✅ ID Matomo trouvé automatiquement : ${matomoSiteId} (${found.name})`);
    }
  }

  // 8. Mise à jour de site.config.ts
  const domain = targetSite.url.replace(/https?:\/\//, '').replace(/\/.*$/, '');
  const configContent = `export interface SiteConfig {
  name: string;
  domain: string;
  url: string;
  description: string;
  repo: string;
  i18n: { defaultLocale: string; locales: string[]; prefixDefaultLocale: boolean; };
  theme: { style: string; fontFamily: string; colorScheme: string; };
  matomo: { url: string; siteId: string; };
  revive: { reviveId: string; scriptUrl: string; zones: Record<string, { zoneId: number; format: string }>; };
  legal: { editor: string; address: string; contactEmail: string; hostName: string; hostAddress: string; };
}

export const siteConfig: SiteConfig = {
  name: "${targetSite.name.replace(/"/g, '\\"')}",
  domain: "${domain}",
  url: "https://${domain}",
  description: "Actualités, guides et dossiers complets sur ${targetSite.name}.",
  repo: "jc842/${domain.replace(/[^a-z0-9]/g, '-')}",

  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en", "es"],
    prefixDefaultLocale: false,
  },

  theme: {
    style: "minimal-editorial",
    fontFamily: "sans",
    colorScheme: "stone",
  },

  matomo: {
    url: "https://${MATOMO_HOST}/",
    siteId: "${matomoSiteId}",
  },

  revive: {
    reviveId: "ac119b122a644588953c74c4c1daee06",
    scriptUrl: "//ads.les4h.fr/www/delivery/asyncjs.php",
    zones: {
      mobileSticky: { zoneId: 623, format: "mobileBanner" },
      inContent: { zoneId: 627, format: "mediumRectangle" },
      header: { zoneId: 626, format: "leaderboard" },
    },
  },

  legal: {
    editor: "Éditeur indépendant",
    address: "Guadeloupe / France",
    contactEmail: "contact@${domain}",
    hostName: "Cloudflare Pages & Hetzner",
    hostAddress: "Union Européenne",
  },
};
`;

  await fs.writeFile(CONFIG_FILE, configContent, 'utf8');
  console.log(`  ✅ Fichier src/config/site.config.ts mis à jour pour ${domain}.`);
  console.log(`\n✨ Site ${targetSite.name} migré avec succès ! Vous pouvez lancer 'npm run dev' ou 'npm run build'.`);
}

main().catch(console.error);
