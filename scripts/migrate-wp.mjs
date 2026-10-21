import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { XMLParser } from 'fast-xml-parser';

const XML_PATH = './input/export.xml';
const BLOG_OUTPUT = './src/content/blog';
const PAGES_OUTPUT = './src/content/pages';
const ASSETS_OUTPUT = './src/assets/images';

await fs.ensureDir(BLOG_OUTPUT);
await fs.ensureDir(PAGES_OUTPUT);
await fs.ensureDir(ASSETS_OUTPUT);

const xmlData = await fs.readFile(XML_PATH, 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
const json = parser.parse(xmlData);

const items = json?.rss?.channel?.item || [];

async function processImage(url, slug) {
  try {
    const filename = `${slug}-${path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9.-]/g, '_')}.webp`;
    const localPath = path.join(ASSETS_OUTPUT, filename);

    if (!await fs.pathExists(localPath)) {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
      // Rognage strict 4:5 ou 1:1 orienté mobile (800x1000 max), jamais de 16:9
      await sharp(response.data)
        .resize({
          width: 800,
          height: 1000,
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toFile(localPath);
    }
    return `../../assets/images/${filename}`;
  } catch (err) {
    console.warn(`[Image Skip] Erreur sur ${url}:`, err.message);
    return null;
  }
}

for (const item of items) {
  const postType = item['wp:post_type']?.__cdata || item['wp:post_type'];
  const status = item['wp:status']?.__cdata || item['wp:status'];
  if (status !== 'publish' || (postType !== 'post' && postType !== 'page')) continue;

  const title = (item.title?.__cdata || item.title || 'Sans titre').replace(/"/g, '\\"');
  const slug = item['wp:post_name']?.__cdata || item['wp:post_name'];
  const date = item['wp:post_date']?.__cdata || item['wp:post_date'];
  let rawContent = item['content:encoded']?.__cdata || item['content:encoded'] || '';

  // Extraction et remplacement des images de contenu
  const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(rawContent)) !== null) {
    const remoteUrl = match[1];
    const localImg = await processImage(remoteUrl, slug);
    if (localImg) {
      rawContent = rawContent.replace(remoteUrl, localImg);
    }
  }

  // Nettoyage des balises WP résiduelles
  const cleanContent = rawContent
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\/?caption[^\]]*\]/g, '')
    .trim();

  const frontmatter = `---
title: "${title}"
slug: "${slug}"
pubDate: "${date}"
type: "${postType}"
---

`;

  const destFolder = postType === 'post' ? BLOG_OUTPUT : PAGES_OUTPUT;
  await fs.writeFile(path.join(destFolder, `${slug}.md`), frontmatter + cleanContent);
  console.log(`[OK] ${postType} migré : ${slug}`);
}