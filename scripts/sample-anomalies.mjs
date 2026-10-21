import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (full.endsWith('.md')) files.push(full);
  }
  return files;
}

const files = walk('D:/projets/PBN/alubat971/src/content');
let samples = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/^\t+[^\s]/m.test(content) && samples < 5) {
    samples++;
    console.log('\n--- TAB INDENT SAMPLE:', path.basename(file));
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\t+[^\s]/.test(lines[i])) {
        console.log(`L${i}: ${JSON.stringify(lines[i])}`);
      }
    }
  }
}
