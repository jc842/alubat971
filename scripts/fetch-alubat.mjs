import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const WP_HOST = 'alubat971.com';
const BLOG_OUTPUT = path.join(rootDir, 'src', 'content', 'blog');
const PRODUITS_OUTPUT = path.join(rootDir, 'src', 'content', 'produits');
const REALISATIONS_OUTPUT = path.join(rootDir, 'src', 'content', 'realisations');
const PAGES_OUTPUT = path.join(rootDir, 'src', 'content', 'pages');
const IMAGES_OUTPUT = path.join(rootDir, 'public', 'images');
const REDIRECTS_FILE = path.join(rootDir, 'public', '_redirects');

function requestHttps(pathname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: WP_HOST,
      path: pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
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
    req.end();
  });
}

function cleanHtmlToMarkdown(html = '') {
  if (!html) return '';
  let md = String(html);

  // Fusion Builder & WordPress blocks cleaning
  md = md.replace(/\[\/?fusion_[^\]]*\]/gi, '');
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

  // Entities decode
  md = md.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '...')
    .replace(/&nbsp;/g, ' ');

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function cleanTitle(raw = '') {
  return raw
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/ALUBAT_PORTFOLIO_/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^((?:f0-9f|e2-[0-9a-f]{2}|d8-3c|d8-3d)(?:-[0-9a-f]{2}){1,3}-)+/i, '')
    .trim();
}

async function downloadAndOptimizeImage(url, targetFilenameBase) {
  if (!url || !url.startsWith('http')) return null;
  const filename = `${targetFilenameBase}.webp`;
  const localPath = path.join(IMAGES_OUTPUT, filename);

  if (fsSync.existsSync(localPath)) {
    return `/images/${filename}`;
  }

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await sharp(buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(localPath);
          resolve(`/images/${filename}`);
        } catch (err) {
          // If sharp fails (e.g. unsupported format), write raw if possible
          console.warn(`    ⚠️ Échec conversion sharp pour ${url}: ${err.message}`);
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function emptyDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {}
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  console.log('🚀 Début de l\'extraction complète pour alubat971.com...');

  await emptyDir(BLOG_OUTPUT);
  await emptyDir(PRODUITS_OUTPUT);
  await emptyDir(REALISATIONS_OUTPUT);
  await emptyDir(PAGES_OUTPUT);
  await fs.mkdir(IMAGES_OUTPUT, { recursive: true });

  const redirects = new Set();

  // 1. Récupération des taxonomies
  console.log('📦 Récupération des catégories et tags...');
  const catRes = await requestHttps('/wp-json/wp/v2/categories?per_page=100');
  const prodCatRes = await requestHttps('/wp-json/wp/v2/product_cat?per_page=100');
  const tagRes = await requestHttps('/wp-json/wp/v2/tags?per_page=100');

  const categoriesMap = new Map((catRes.data || []).map(c => [c.id, cleanTitle(c.name)]));
  const productCatMap = new Map((prodCatRes.data || []).map(c => [c.id, cleanTitle(c.name)]));
  const tagsMap = new Map((tagRes.data || []).map(t => [t.id, cleanTitle(t.name)]));

  // 2. Extraction des ARTICLES (Blog)
  console.log('\n📝 Extraction des articles de blog...');
  const postsRes = await requestHttps('/wp-json/wp/v2/posts?per_page=100&_embed');
  const posts = postsRes.data || [];
  console.log(`  Trouvé ${posts.length} articles.`);

  for (const post of posts) {
    const title = cleanTitle(post.title?.rendered || 'Article');
    const slug = post.slug || `post-${post.id}`;
    const pubDate = post.date || new Date().toISOString();
    const catId = post.categories?.[0];
    const category = categoriesMap.get(catId) || 'Actualités & Conseils';
    const postTags = (post.tags || []).map(id => tagsMap.get(id)).filter(Boolean);

    let featuredImageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let heroImage = '';
    if (featuredImageUrl) {
      const local = await downloadAndOptimizeImage(featuredImageUrl, `${slug}-hero`);
      if (local) heroImage = local;
    }

    const mdContent = cleanHtmlToMarkdown(post.content?.rendered || '');
    const desc = cleanHtmlToMarkdown(post.excerpt?.rendered || '').slice(0, 160).replace(/\n/g, ' ') || `${title} - ALUBAT Guadeloupe`;

    const md = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
pubDate: "${pubDate}"
category: "${category}"
heroImage: "${heroImage || '/og-image.jpg'}"
tags: ${JSON.stringify(postTags)}
lang: "fr"
draft: false
---

${mdContent}
`;

    await fs.writeFile(path.join(BLOG_OUTPUT, `${slug}.md`), md, 'utf-8');

    // Redirections WordPress -> Astro
    redirects.add(`/${slug} /blog/${slug}/ 301`);
    redirects.add(`/${slug}/ /blog/${slug}/ 301`);
    redirects.add(`/actualite/${slug} /blog/${slug}/ 301`);
    redirects.add(`/actualite/${slug}/ /blog/${slug}/ 301`);
  }

  // 3. Extraction des PRODUITS (Gamme / Services)
  console.log('\n🚪 Extraction des produits (Gamme Aluminium)...');
  const prodRes = await requestHttps('/wp-json/wp/v2/product?per_page=100&_embed');
  const products = prodRes.data || [];
  console.log(`  Trouvé ${products.length} produits.`);

  for (const prod of products) {
    const title = cleanTitle(prod.title?.rendered || 'Produit');
    const slug = prod.slug || `produit-${prod.id}`;
    const pubDate = prod.date || new Date().toISOString();
    const catId = prod.product_cat?.[0];
    const category = productCatMap.get(catId) || 'Menuiserie Aluminium';
    const prodTags = (prod.product_tag || []).map(id => tagsMap.get(id)).filter(Boolean);

    let featuredImageUrl = prod._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let heroImage = '';
    if (featuredImageUrl) {
      const local = await downloadAndOptimizeImage(featuredImageUrl, `produit-${slug}`);
      if (local) heroImage = local;
    }

    const mdContent = cleanHtmlToMarkdown(prod.content?.rendered || '');
    const desc = cleanHtmlToMarkdown(prod.excerpt?.rendered || '').slice(0, 160).replace(/\n/g, ' ') || `${title} - Menuiserie aluminium sur-mesure ALUBAT Guadeloupe.`;

    // Detect partner brand
    let brand = 'ALUBAT';
    if (/schüco|schuco/i.test(title + ' ' + mdContent)) brand = 'Schüco';
    else if (/biossun/i.test(title + ' ' + mdContent)) brand = 'Biossun';
    else if (/volma/i.test(title + ' ' + mdContent)) brand = 'Volma';
    else if (/horizal/i.test(title + ' ' + mdContent)) brand = 'Horizal';
    else if (/dessol/i.test(title + ' ' + mdContent)) brand = 'Dessol';
    else if (/record/i.test(title + ' ' + mdContent)) brand = 'Record';

    const md = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
pubDate: "${pubDate}"
category: "${category}"
brand: "${brand}"
heroImage: "${heroImage || '/og-image.jpg'}"
tags: ${JSON.stringify(prodTags)}
lang: "fr"
draft: false
---

${mdContent}
`;

    await fs.writeFile(path.join(PRODUITS_OUTPUT, `${slug}.md`), md, 'utf-8');

    // Redirections pour les produits
    redirects.add(`/produit/*/${slug} /produits/${slug}/ 301`);
    redirects.add(`/produit/*/${slug}/ /produits/${slug}/ 301`);
    redirects.add(`/produit/${slug} /produits/${slug}/ 301`);
    redirects.add(`/produit/${slug}/ /produits/${slug}/ 301`);
  }

  // 4. Extraction des RÉALISATIONS (Portfolio Avada)
  console.log('\n🏗️ Extraction des réalisations (Chantiers)...');
  const portRes = await requestHttps('/wp-json/wp/v2/avada_portfolio?per_page=100&_embed');
  const portfolios = portRes.data || [];
  console.log(`  Trouvé ${portfolios.length} chantiers / réalisations.`);

  for (const port of portfolios) {
    let title = cleanTitle(port.title?.rendered || 'Réalisation');
    // Nettoyer les suffixes répétés
    title = title.replace(/\s*–\s*ALUBAT_PORTFOLIO_\s*/gi, ' – ');
    const slug = port.slug || `realisation-${port.id}`;
    const pubDate = port.date || new Date().toISOString();

    let featuredImageUrl = port._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let heroImage = '';
    if (featuredImageUrl) {
      const local = await downloadAndOptimizeImage(featuredImageUrl, `chantier-${slug}`);
      if (local) heroImage = local;
    }

    const mdContent = cleanHtmlToMarkdown(port.content?.rendered || '');
    const desc = cleanHtmlToMarkdown(port.excerpt?.rendered || '').slice(0, 160).replace(/\n/g, ' ') || `Chantier d'exception réalisé par ALUBAT Guadeloupe : ${title}.`;

    const md = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
pubDate: "${pubDate}"
heroImage: "${heroImage || '/og-image.jpg'}"
category: "Chantier Référence"
location: "Guadeloupe"
lang: "fr"
draft: false
---

${mdContent}
`;

    await fs.writeFile(path.join(REALISATIONS_OUTPUT, `${slug}.md`), md, 'utf-8');

    redirects.add(`/realisations/${slug} /realisations/${slug}/ 301`);
    redirects.add(`/realisations/${slug}/ /realisations/${slug}/ 301`);
  }

  // 5. Extraction des PAGES CORPORATE
  console.log('\n📄 Extraction des pages institutionnelles...');
  const pagesRes = await requestHttps('/wp-json/wp/v2/pages?per_page=100&_embed');
  const pages = pagesRes.data || [];
  console.log(`  Trouvé ${pages.length} pages.`);

  const ignoredPages = ['glossary', 'merci', 'envoyer-vos-photos'];

  for (const page of pages) {
    const slug = page.slug;
    if (!slug || ignoredPages.includes(slug)) continue;

    const title = cleanTitle(page.title?.rendered || 'Page');
    let featuredImageUrl = page._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    let heroImage = '';
    if (featuredImageUrl) {
      const local = await downloadAndOptimizeImage(featuredImageUrl, `page-${slug}`);
      if (local) heroImage = local;
    }

    const mdContent = cleanHtmlToMarkdown(page.content?.rendered || '');
    const desc = `${title} - ALUBAT Guadeloupe, spécialiste de la menuiserie aluminium.`;

    const md = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
heroImage: "${heroImage || '/og-image.jpg'}"
lang: "fr"
---

${mdContent}
`;

    await fs.writeFile(path.join(PAGES_OUTPUT, `${slug}.md`), md, 'utf-8');
  }

  // 6. Ajout des redirections globales
  console.log('\n🔀 Génération des redirections canoniques (_redirects)...');
  const redirectsList = [
    '# Redirections structurelles WordPress -> Astro 5 Bastion',
    '/nos-realisations /realisations/ 301',
    '/nos-realisations/ /realisations/ 301',
    '/portfolio /realisations/ 301',
    '/portfolio/ /realisations/ 301',
    '/nos-produits /produits/ 301',
    '/nos-produits/ /produits/ 301',
    '/gamme /produits/ 301',
    '/gamme/ /produits/ 301',
    '/actualites /blog/ 301',
    '/actualites/ /blog/ 301',
    '/actualite /blog/ 301',
    '/actualite/ /blog/ 301',
    ...Array.from(redirects),
    '',
    '# Règle anti-boucle et slash final systématique',
    '/:slug   /blog/:slug/   301',
    '/:slug/  /blog/:slug/   301',
  ];

  await fs.writeFile(REDIRECTS_FILE, redirectsList.join('\n'), 'utf-8');
  console.log(`✓ ${redirectsList.length} lignes écrites dans public/_redirects.`);
  console.log('🎉 Extraction terminée avec succès !');
}

main().catch(console.error);
