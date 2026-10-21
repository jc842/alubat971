import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'D:/projets/PBN/alubat971/src/content';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (full.endsWith('.md')) files.push(full);
  }
  return files;
}

function polishContent(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return;

  let frontmatter = fmMatch[1];
  let body = fmMatch[2];

  // 1. Broken heading links: #### [*Fiabilité et Sécurité](#319c2369a0f6aba76) -> #### Fiabilité et Sécurité
  body = body.replace(/^(#{1,6})\s+\[\s*\*+([^*\]]+)\*+\s*\]\([^)]*\)/gm, '$1 $2');
  body = body.replace(/^(#{1,6})\s+\[\s*([^\]]+)\s*\]\([^)]*\)/gm, '$1 $2');

  // 2. Headings with asterisks: ## *Titre -> ## Titre
  body = body.replace(/^(#{1,6})\s*\*+([^*\n]+?)\*+\s*$/gm, '$1 $2');
  body = body.replace(/^(#{1,6})\s*\*+([^*\n]+)$/gm, '$1 $2');
  body = body.replace(/^(#{1,6})\s+([^*\n]+?)\*+\s*$/gm, '$1 $2');

  // 3. Clean broken markdown in nos-valeurs:
  // e.g. "### *Nous sommes fabricant** et installateur de *### Menuiseries associées* **aluminium**..."
  body = body.replace(/\*###\s*Menuiseries associées\*\s*/gi, '');
  body = body.replace(/###\s*\*Nous sommes\s*f\*\*abricant\*\*\s*et installateur de\s*\*\*aluminium\*\*\s*\*\*en Guadeloupe depuis plus de 30 ans\.\*\*/gi, '### Fabricant et installateur de menuiseries aluminium en Guadeloupe depuis plus de 40 ans');

  // 4. Leading stray single asterisk on paragraphs: e.g. "*L’architecture..." -> "L’architecture..."
  body = body.replace(/^\*([A-Za-zÀ-ÿ0-9«"])/gm, '$1');

  // 5. Triple asterisks around lines: ***Texte*** -> **Texte**
  body = body.replace(/^\*{3}\s*([^*\n]+)\s*\*{3}$/gm, '### $1');

  // 6. Clean isolated social links text if any:
  body = body.replace(/^FACEBOOK\s*$/gm, '');
  body = body.replace(/^YOUTUBE\s*$/gm, '');

  // 7. Quadruple asterisks **** -> **
  body = body.replace(/\*{4,}/g, '**');

  // 8. Adjacent bold tags: **mot1** **mot2** -> **mot1 mot2**
  body = body.replace(/\*\*([^*\n]+)\*\*\s+\*\*([^*\n]+)\*\*/g, '**$1 $2**');

  // 9. Extra blank lines
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  const newContent = `---\n${frontmatter}\n---\n\n${body}\n`;
  fs.writeFileSync(filePath, newContent, 'utf8');
}

const files = walk(CONTENT_DIR);
for (const file of files) {
  polishContent(file);
}
console.log(`✓ Polished typography in ${files.length} files.`);
