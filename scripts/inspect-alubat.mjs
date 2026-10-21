import https from 'node:https';
import fs from 'node:fs';

https.get('https://alubat971.com', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    fs.writeFileSync('D:/projets/PBN/alubat971/original-home.html', data);
    console.log('Homepage saved, length:', data.length);
    
    // Find logo
    const logoMatches = [...data.matchAll(/<img[^>]+(?:class|id|src)=["'][^"']*(?:logo|brand|header)[^"']*["'][^>]*>/gi)];
    console.log('\n--- LOGO MATCHES ---');
    for (const m of logoMatches) {
      console.log(m[0]);
    }

    // Find footer
    const footerMatch = data.match(/<footer[\s\S]*?<\/footer>/gi);
    if (footerMatch) {
      console.log('\n--- FOOTER SNIPPET ---');
      console.log(footerMatch[0].slice(0, 2000));
    }
  });
}).on('error', (err) => console.error(err));
