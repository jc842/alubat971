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

function cleanMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return;

  let frontmatter = fmMatch[1];
  let body = fmMatch[2];

  // 1. Purge Revolution Slider JS blocks
  body = body.replace(/setREVStartSize\s*\([\s\S]*?\);?/gi, '');
  body = body.replace(/if\s*\(window\.RS_MODULES[\s\S]*?checkMinimal\(\)[^}]*\}/gi, '');
  body = body.replace(/window\.revapi\d+\s*=\s*undefined;?/gi, '');

  // 2. Remove empty tab links and Avada gallery loops:
  // e.g. \t[\n\t* *\n](/produits/...) or [ * * ](...)
  body = body.replace(/\[\s*\*+\s*\*+\s*\]\([^)]*\)/gi, '');
  body = body.replace(/\t*\[\s*\r?\n\s*\*+\s*\*+\s*\r?\n\s*\]\([^)]*\)/gi, '');
  body = body.replace(/\t*\[\s*\*+\s*\]\([^)]*\)/gi, '');

  // 3. Remove stray asterisks lines
  body = body.replace(/^[\s\t]*\*+[\s\t*]*$/gm, '');

  // 4. Transform bold-italic title headers into clean H3:
  // e.g. ***Découvrez les produits Schüco:*** -> ### Découvrez les produits Schüco
  body = body.replace(/\*{3}\s*D[ée]couvrez les produits\s*([^:*]+)\s*:?\s*\*{3}/gi, '### Découvrez les produits $1');

  // 5. Clean header titles with stray asterisks: e.g. "## Schuco*" -> "## Schüco"
  body = body.replace(/^(\#{1,6}\s+[^*\n]+)\*+\s*$/gm, '$1');
  body = body.replace(/^(\#{1,6})\s+Schuco\b/gm, '$1 Schüco');

  // 6. Clean social hashtags in blog / content:
  body = body.replace(/\[ad_1\]\s*/gi, '');
  body = body.replace(/#alubatguadeloupe/gi, 'ALUBAT Guadeloupe');
  body = body.replace(/#menuiseriealu(?:minium)?/gi, 'menuiseries aluminium');
  body = body.replace(/#menuiserie\b/gi, 'menuiserie');
  body = body.replace(/#guadeloupe\b/gi, 'Guadeloupe');
  body = body.replace(/#baie-mahault\b/gi, 'Baie-Mahault');
  body = body.replace(/#biossun\b/gi, 'Biossun');
  body = body.replace(/#schuco\b/gi, 'Schüco');
  body = body.replace(/#schüco\b/gi, 'Schüco');
  body = body.replace(/#architecture\b/gi, 'architecture');

  // 7. Remove accidental tabs / 4-space indentations at beginning of lines outside code fences
  const lines = body.split('\n');
  let inCodeFence = false;
  const cleanedLines = [];

  for (let line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeFence = !inCodeFence;
      cleanedLines.push(line);
      continue;
    }
    if (!inCodeFence) {
      // Remove leading tabs
      line = line.replace(/^\t+/, '');
      // If line starts with 4+ spaces and is not a list item continuation or code
      if (/^ {4,}(?!\s*[-*+]|\s*\d+\.)/.test(line)) {
        line = line.trimStart();
      }
      // Remove trailing whitespace
      line = line.trimEnd();
    }
    cleanedLines.push(line);
  }
  body = cleanedLines.join('\n');

  // 8. Remove duplicate blank lines
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  const newContent = `---\n${frontmatter}\n---\n\n${body}\n`;
  fs.writeFileSync(filePath, newContent, 'utf8');
}

const files = walk(CONTENT_DIR);
console.log(`Processing ${files.length} markdown files...`);
for (const file of files) {
  cleanMarkdownFile(file);
}
console.log('✓ Bulk clean completed.');
