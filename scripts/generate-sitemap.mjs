import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SITE_URL = 'https://alubat971.com'.replace(/\/+$/, '');
const BLOG_DIR = path.join(rootDir, 'src', 'content', 'blog');
const PRODUITS_DIR = path.join(rootDir, 'src', 'content', 'produits');
const REALISATIONS_DIR = path.join(rootDir, 'src', 'content', 'realisations');
const PAGES_DIR = path.join(rootDir, 'src', 'content', 'pages');
const OUTPUT_SITEMAP = path.join(rootDir, 'public', 'sitemap.xml');

// Helper to extract frontmatter field
function getField(content, field) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(field + ':')) {
      let val = trimmed.slice(field.length + 1).trim();
      val = val.replace(/^["'`]/, '').replace(/["'`]$/, '').trim();
      return val;
    }
  }
  return null;
}

async function generateSitemap() {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/produits/`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE_URL}/partenaires/`, priority: '0.85', changefreq: 'monthly' },
    { loc: `${SITE_URL}/realisations/`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE_URL}/blog/`, priority: '0.8', changefreq: 'daily' },
    { loc: `${SITE_URL}/contact/`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${SITE_URL}/mentions-legales/`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${SITE_URL}/politique-confidentialite/`, priority: '0.3', changefreq: 'monthly' },
  ];

  // 1. Gamme Produits
  if (fs.existsSync(PRODUITS_DIR)) {
    const prodFiles = await fsp.readdir(PRODUITS_DIR);
    for (const f of prodFiles) {
      if (!f.endsWith('.md')) continue;
      const slug = path.basename(f, '.md');
      urls.push({
        loc: `${SITE_URL}/produits/${slug}/`,
        priority: '0.85',
        changefreq: 'monthly'
      });
    }
  }

  // 2. Réalisations / Chantiers
  if (fs.existsSync(REALISATIONS_DIR)) {
    const realFiles = await fsp.readdir(REALISATIONS_DIR);
    for (const f of realFiles) {
      if (!f.endsWith('.md')) continue;
      const slug = path.basename(f, '.md');
      urls.push({
        loc: `${SITE_URL}/realisations/${slug}/`,
        priority: '0.8',
        changefreq: 'monthly'
      });
    }
  }

  // 3. Articles du blog
  if (fs.existsSync(BLOG_DIR)) {
    const blogFiles = await fsp.readdir(BLOG_DIR);
    for (const f of blogFiles) {
      if (!f.endsWith('.md')) continue;
      const content = await fsp.readFile(path.join(BLOG_DIR, f), 'utf-8');
      const draft = getField(content, 'draft') === 'true';
      if (draft) continue;

      const slug = path.basename(f, '.md');
      const lastmod = getField(content, 'updatedDate') || getField(content, 'pubDate') || null;

      urls.push({
        loc: `${SITE_URL}/blog/${slug}/`,
        lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : null,
        priority: '0.75',
        changefreq: 'weekly'
      });
    }
  }

  // 4. Pages institutionnelles
  if (fs.existsSync(PAGES_DIR)) {
    const pageFiles = await fsp.readdir(PAGES_DIR);
    for (const f of pageFiles) {
      if (!f.endsWith('.md')) continue;
      const slug = path.basename(f, '.md');
      urls.push({
        loc: `${SITE_URL}/${slug}/`,
        priority: '0.6',
        changefreq: 'monthly'
      });
    }
  }

  // Enlever les doublons éventuels
  const uniqueUrls = [];
  const seen = new Set();
  for (const item of urls) {
    if (!seen.has(item.loc)) {
      seen.add(item.loc);
      uniqueUrls.push(item);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  await fsp.writeFile(OUTPUT_SITEMAP, sitemapXml.trim() + '\n', 'utf-8');
  console.log(`✓ Sitemap XML généré avec succès : ${uniqueUrls.length} URLs écrites dans ${OUTPUT_SITEMAP}`);
}

generateSitemap().catch(err => {
  console.error('Erreur lors de la génération du sitemap :', err);
  process.exit(1);
});
