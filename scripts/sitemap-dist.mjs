// Génère dist/sitemap.xml à partir des pages réellement compilées (slash final garanti).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const config = fs.readFileSync(path.join(root, 'src', 'config', 'site.config.ts'), 'utf-8');
const siteUrl = (config.match(/\burl:\s*["'](https?:\/\/[^"']+)["']/) || [])[1]?.replace(/\/+$/, '');
if (!siteUrl) throw new Error('site url introuvable dans site.config.ts');

const urls = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!entry.name.startsWith('_')) walk(full); continue; }
    if (entry.name !== 'index.html') continue;
    const html = fs.readFileSync(full, 'utf-8');
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;
    const rel = path.relative(dist, path.dirname(full)).split(path.sep).join('/');
    urls.push(rel ? `/${rel}/` : '/');
  }
})(dist);

urls.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
const prio = (u) => (u === '/' ? '1.0' : /^\/(blog|fr|en|es)\/$/.test(u) ? '0.9' : /\/(blog|en|es|fr)\/[^/]+\/$/.test(u) ? '0.8' : '0.6');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${siteUrl}${encodeURI(u)}</loc><changefreq>weekly</changefreq><priority>${prio(u)}</priority></url>`)
  .join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), xml);
console.log(`sitemap.xml : ${urls.length} URLs (depuis dist/)`);
