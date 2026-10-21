import fs from 'node:fs';

const html = fs.readFileSync('D:/projets/PBN/alubat971/original-home.html', 'utf8');

const clean = html
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  .replace(/<[^>]+>/g, '\n')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0);

fs.writeFileSync('D:/projets/PBN/alubat971/home-text.txt', clean.join('\n'));
console.log('Saved home-text.txt, lines:', clean.length);

for (let i = 0; i < clean.length; i++) {
  const line = clean[i];
  if (/groupe|martinique|guyane|carte|map|témoign|temoign|avis|architecte|partenaire|feder|europe/i.test(line)) {
    console.log(`[${i}] ${line}`);
  }
}
