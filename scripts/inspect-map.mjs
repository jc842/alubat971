import fs from 'node:fs';

const html = fs.readFileSync('D:/projets/PBN/alubat971/original-home.html', 'utf8');

const m = html.match(/id="mapplic-id1863"\s+data-mapdata="([^"]+)"/);
if (m) {
  const jsonStr = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const json = JSON.parse(jsonStr);
  fs.writeFileSync('D:/projets/PBN/alubat971/map-data.json', JSON.stringify(json, null, 2));
  console.log('Map data parsed successfully! Categories & Landmarks:');
  console.log('Categories:', json.categories);
  if (json.levels && json.levels[0]) {
    console.log('Map SVG url:', json.levels[0].map);
    console.log('Locations count:', (json.levels[0].locations || []).length);
    for (const loc of (json.levels[0].locations || [])) {
      console.log(`- ${loc.title} (${loc.category}): ${loc.description || ''} link: ${loc.link || ''}`);
    }
  }
} else {
  console.log('Map element not found');
}
