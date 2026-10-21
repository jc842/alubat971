import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = 'D:/projets/PBN/alubat971/public/images';
const PARTNERS_DIR = path.join(IMAGES_DIR, 'partners');

if (!fs.existsSync(PARTNERS_DIR)) {
  fs.mkdirSync(PARTNERS_DIR, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return download(redirectUrl, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed ${url}: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchAndSave(url, baseName, subfolder = '') {
  try {
    const buffer = await download(url);
    const targetDir = subfolder ? path.join(IMAGES_DIR, subfolder) : IMAGES_DIR;
    
    // If SVG, just save raw
    if (url.endsWith('.svg')) {
      const svgPath = path.join(targetDir, `${baseName}.svg`);
      fs.writeFileSync(svgPath, buffer);
      console.log(`✓ Saved SVG: ${svgPath}`);
      return;
    }

    // Save as webp and png
    const webpPath = path.join(targetDir, `${baseName}.webp`);
    const pngPath = path.join(targetDir, `${baseName}.png`);

    fs.writeFileSync(pngPath, buffer);
    await sharp(buffer).webp({ quality: 90 }).toFile(webpPath);
    console.log(`✓ Saved image: ${webpPath} & ${pngPath}`);
  } catch (err) {
    console.error(`❌ Error downloading ${url}:`, err.message);
  }
}

async function main() {
  console.log('Downloading official assets...');

  // 1. Logo ALUBAT
  await fetchAndSave('https://alubat971.com/wp-content/uploads/alubat_319_200.png', 'logo-alubat');

  // 2. Logo Europe FEDER
  await fetchAndSave('https://alubat971.com/wp-content/uploads/LOGO_FONDS_EUROPEEN_GUADELOUPE_FEDER_projetcofinance.png', 'logo-europe-feder-guadeloupe');

  // 3. Carte Groupe SVG
  await fetchAndSave('https://alubat971.com/wp-content/uploads/2016/03/map_irisv5.svg', 'map-groupe-cpg');

  // 4. Partner Logos
  await fetchAndSave('https://alubat971.com/wp-content/uploads/revslider/brands/logo_schuco_200.jpg', 'logo-schuco', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/biossun_logo.jpg', 'logo-biossun', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/revslider/brands/logo_horizal_200.jpg', 'logo-horizal', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/logo-volma.jpg', 'logo-volma', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/logo-dessol.jpg', 'logo-dessol', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/saintgobain-logo.png', 'logo-saintgobain', 'partners');
  await fetchAndSave('https://alubat971.com/wp-content/uploads/Logo_Qualimarine.png', 'logo-qualimarine', 'partners');

  console.log('🎉 Assets download complete.');
}

main().catch(console.error);
