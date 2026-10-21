import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.resolve('src/content');

const redundantPagesToDelete = [
  'actualites.md',
  'alubat-fabricant-installateur-de-menuisieries-aluminum-guadeloup.md',
  'boutique.md',
  'confidentialite.md',
  'contact.md',
  'glossary-2.md',
  'mentions-legales.md',
  'nos-produits.md',
  'nos-realisations.md',
  'photos.md',
];

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8230;/g, '…')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&times;/g, '×')
    .replace(/&#091;/g, '[')
    .replace(/&#093;/g, ']')
    .replace(/&quot;/g, '"');
}

function normalizeInternalUrl(url) {
  if (!url) return '';
  return url
    .replace(/https?:\/\/alubat971\.com\/produit\/(?:[a-zA-Z0-9_%-]+\/)*([a-zA-Z0-9_%-]+)\/?/g, '/produits/$1/')
    .replace(/https?:\/\/alubat971\.com\/realisations\/([a-zA-Z0-9_%-]+)\/?(?:\?[^)\s]*)?/g, '/realisations/$1/')
    .replace(/https?:\/\/alubat971\.com\/actualite\/([a-zA-Z0-9_%-]+)\/?/g, '/blog/$1/')
    .replace(/https?:\/\/alubat971\.com\/actualites\/?/g, '/blog/')
    .replace(/https?:\/\/alubat971\.com\/nos-produits\/?/g, '/produits/')
    .replace(/https?:\/\/alubat971\.com\/nos-realisations\/?/g, '/realisations/')
    .replace(/https?:\/\/alubat971\.com\/particulier\/?/g, '/particulier/')
    .replace(/https?:\/\/alubat971\.com\/professionnel\/?/g, '/professionnel/')
    .replace(/https?:\/\/alubat971\.com\/architectes\/?/g, '/architectes/')
    .replace(/https?:\/\/alubat971\.com\/contact\/?/g, '/contact/')
    .replace(/https?:\/\/alubat971\.com\/schueco\/?/g, '/schueco/')
    .replace(/https?:\/\/alubat971\.com\/biossun\/?/g, '/biossun/')
    .replace(/https?:\/\/alubat971\.com\/horizal\/?/g, '/horizal/')
    .replace(/https?:\/\/alubat971\.com\/dessol\/?/g, '/dessol/')
    .replace(/https?:\/\/alubat971\.com\/saint-gobain\/?/g, '/saint-gobain/')
    .replace(/https?:\/\/alubat971\.com\/portes-volma\/?/g, '/portes-volma/')
    .replace(/https?:\/\/alubat971\.com\/nos-engagements\/?/g, '/nos-engagements/')
    .replace(/https?:\/\/alubat971\.com\/nos-valeurs\/?/g, '/nos-valeurs/');
}

function cleanContent(raw, filePath, collection) {
  // 1. Separate frontmatter and body
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return raw;

  let frontmatter = fmMatch[1];
  let body = fmMatch[2];

  // Title extraction
  const titleMatch = frontmatter.match(/title:\s*["']?(.*?)["']?$/m);
  const title = titleMatch ? titleMatch[1].replace(/^["']|["']$/g, '').trim() : '';

  // Clean frontmatter description
  frontmatter = frontmatter.replace(/description:\s*["']?(.*?)["']?$/m, (match, desc) => {
    let d = desc.trim();
    if (!d || d === 'Nous Contacter' || d === 'Nous Contacter - ALUBAT Guadeloupe' || d === 'null' || d.length < 15) {
      if (collection === 'produits') {
        d = `${title} sur mesure en Guadeloupe : fabrication locale de haute précision par ALUBAT, garantie décennale et isolation renforcée.`;
      } else if (collection === 'realisations') {
        d = `Chantier d'exception réalisé par ALUBAT Guadeloupe : ${title}. Menuiseries aluminium haute performance adaptées au climat tropical.`;
      } else {
        d = `${title} - ALUBAT Guadeloupe, spécialiste de la menuiserie aluminium sur mesure.`;
      }
    } else {
      d = d.replace(/\s*[-–—]?\s*Nous Contacter\s*$/i, '');
      d = d.replace(/Nous Contacter\s*/gi, '');
      if (d.length < 15) {
        d = `${title} sur mesure par ALUBAT Guadeloupe : menuiseries aluminium certifiées et adaptées au climat caribéen.`;
      }
    }
    return `description: "${decodeEntities(d).replace(/"/g, '\\"')}"`;
  });

  // Decode entities in frontmatter title
  frontmatter = frontmatter.replace(/title:\s*["']?(.*?)["']?$/m, (match, t) => {
    return `title: "${decodeEntities(t).replace(/"/g, '\\"')}"`;
  });

  // 2. Decode entities in body
  body = decodeEntities(body);

  // 3. Remove CDATA, fpm_start, and pixel scripts
  body = body.replace(/\/\*\s*<!(?:\[CDATA\[|&#091;CDATA&#091;)[\s\S]*?(?:\]\]>|&#093;&#093;>)\s*\*\//gi, '');
  body = body.replace(/\/\*\s*<!\[CDATA\[\s*\*\/[\s\S]*?\/\*\s*\]\]>\s*\*\//gi, '');
  body = body.replace(/fpm_start\s*\([^\)]*\);?/gi, '');
  body = body.replace(/\/\*\s*<!\[CDATA\[\s*\*\//gi, '');
  body = body.replace(/\/\*\s*\]\]>\s*\*\//gi, '');

  // 4. Remove Avada CSS blocks
  for (let i = 0; i < 5; i++) {
    body = body.replace(/(?:#wrapper\s*)?(?:#(?:fusion-)?[a-zA-Z0-9_-]+|\.(?:fusion|nav-tabs|tab-pane|tab-link|button|widget|heading)[a-zA-Z0-9_.-]*)\s*\{[^{}]*\}/gi, '');
    body = body.replace(/(?:\.fusion-[a-zA-Z0-9_-]+|#fusion-[a-zA-Z0-9_-]+|\.widget|\.heading)[^{}]*\{[^{}]*\}/gi, '');
    body = body.replace(/#fusion-testimonials-[0-9]+\s+[a-z0-9_.:#\s,-]+\{[^{}]*\}/gi, '');
  }
  body = body.replace(/\.fusion-slider-[0-9]+\s+[^{}]*\{\}\s*Loading\.\.\./gi, '');

  // 5. Remove any leftover CSS selector lines (e.g. .fusion-tabs..., #wrapper..., .nav-tabs...)
  body = body.split('\n').filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('.fusion-tabs') || trimmed.startsWith('#wrapper .fusion') || trimmed.startsWith('.fusion-portfolio') || trimmed.startsWith('.fusion-widget') || trimmed.startsWith('.fusion-button')) {
      return false;
    }
    if (trimmed.includes('.nav-tabs') && trimmed.includes('.tab-content')) {
      return false;
    }
    if (trimmed === '/' || trimmed === '\\') {
      return false;
    }
    return true;
  }).join('\n');

  // 6. Clean Avada Sidebar "Actualité" widget embedded in body
  body = body.replace(/####\s*Actualité[\s\S]*?(?=\*Menuiseries\*|##|###|$)/gi, '');

  // 7. Clean Avada tabs in products & others
  body = body.replace(/-\s*\[\s*####?\s*\*?\*?([^\]]+?)\*?\*?\s*\]\(#tab-[^)]+\)\s*(?=-\s*\[\s*####?\s*\*?\*?[^\]]+?\*?\*?\s*\]\(#tab-[^)]+\))/gi, '');
  
  // Convert remaining tab anchors to clean h3 headings
  body = body.replace(/-\s*\[\s*####?\s*\*?\*?([^\]\n]+?)\*?\*?\s*\]\(#tab-[^)]+\)/gi, (match, tabTitle) => {
    const cleanTitle = tabTitle.trim().replace(/^\*\*|\*\*$/g, '');
    return `\n### ${cleanTitle}\n`;
  });
  body = body.replace(/\[\s*####?\s*\*?\*?([^\]\n]+?)\*?\*?\s*\]\(#tab-[^)]+\)/gi, (match, tabTitle) => {
    const cleanTitle = tabTitle.trim().replace(/^\*\*|\*\*$/g, '');
    return `\n### ${cleanTitle}\n`;
  });
  body = body.replace(/\[([^\]]+)\]\(#tab-[^)]+\)/gi, '$1');

  // 8. Clean Avada product widgets pattern:
  // In realisations and pages:
  // [ ProductName ](https://alubat971.com/produit/.../slug/)
  body = body.replace(/\[\s*([A-Za-z0-9À-ÿ\s–—\-+./]+?)\s*\]\((https?:\/\/alubat971\.com\/produit\/(?:[a-zA-Z0-9_%-]+\/)*([a-zA-Z0-9_%-]+)\/?)\)/gi, (match, name, fullUrl, slug) => {
    const cleanName = name.trim();
    if (cleanName === 'Details' || cleanName === 'Détails' || cleanName === '*' || cleanName === '' || cleanName === '* *') {
      return '';
    }
    return `\n- [**${cleanName}**](/produits/${slug}/)\n`;
  });

  // Remove standalone details link:
  body = body.replace(/\[\s*D[ée]tails\s*\]\([^)]+\)/gi, '');
  body = body.replace(/\[\s*Details\s*\]\([^)]+\)/gi, '');

  // 9. Remove Download Manager artifacts
  body = body.replace(/\*\s*\d+\s*fichier[·s]*\s*\*\*\s*[\d.]+\s*(?:KB|MB|Ko|Mo)/gi, '');
  body = body.replace(/\[\s*Télécharger\s*\]\(#[^)]*\)/gi, '');
  body = body.replace(/\[\s*Télécharger\s*\]\(https?:\/\/[^)]*\)/gi, '');

  // 10. Remove Avada button links:
  body = body.replace(/\[\s*Nous Contacter\s*\]\(#[^)]*\)/gi, '');
  body = body.replace(/\[\s*Nous Contacter\s*\]\(https?:\/\/[^)]*\)/gi, '');
  body = body.replace(/\[\s*PARTICULIERS\s*\]\([^)]*\)/gi, '');
  body = body.replace(/\[\s*PROFESSIONNELS\s*\]\([^)]*\)/gi, '');

  // 11. Clean author date stamps from old Avada loops
  body = body.replace(/\[admin001\]\(https?:\/\/alubat971\.com\/author\/admin001\/\)\d{4}-\d{2}-\d{2}T[^\s\n]+/gi, '');
  body = body.replace(/\[admin001\]\(https?:\/\/alubat971\.com\/author\/admin001\/\)/gi, '');

  // 12. Remove empty links / gallery items:
  body = body.replace(/-\s*\[\s*\*?\s*\]\(https?:\/\/alubat971\.com\/wp-content\/uploads\/[^\)]+\)/gi, '');
  body = body.replace(/\[\s*\*?\s*\]\(https?:\/\/alubat971\.com\/wp-content\/uploads\/[^\)]+\)/gi, '');
  body = body.replace(/-\s*\[\s*\*?\s*\]\([^\)]+\)/gi, '');
  body = body.replace(/\[\s*\*?\s*\]\([^\)]+\)/gi, '');

  // 13. Clean up broken headings with multi-line or empty bolds:
  body = body.replace(/(#{1,6})\s*\*\*([^\n*]+)\r?\n\r?\n\*\*/g, '$1 $2');
  body = body.replace(/(#{1,6})\s*\*\*([^\n*]+)\*\*/g, '$1 $2');

  // Remove empty headings:
  body = body.replace(/^#{1,6}\s*$/gm, '');
  body = body.replace(/^#{1,6}\s*\[\s*\]\([^)]*\)\s*$/gm, '');

  // Remove isolated list bullets and isolated asterisks:
  body = body.replace(/^[\s\t]*[-*][\s\t]*$/gm, '');

  // 14. Clean and normalize internal URLs
  body = normalizeInternalUrl(body);

  // 15. Clean *Menuiseries* header
  body = body.replace(/\*Menuiseries\*/gi, '### Menuiseries associées');

  // 16. Deduplicate multiple consecutive identical product links in realisations
  const lines = body.split('\n');
  const filteredLines = [];
  let lastProdLink = '';
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith('- [**') && trimmed.includes('/produits/')) {
      if (trimmed === lastProdLink) {
        continue;
      }
      lastProdLink = trimmed;
    } else {
      lastProdLink = '';
    }
    filteredLines.push(l);
  }
  body = filteredLines.join('\n');

  // 17. Whitespace and empty lines cleanup
  body = body.split('\n').map(l => l.replace(/\s+$/, '')).join('\n');
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

// Special clean templates for particulier, professionnel and architectes
function getParticulierContent() {
  return `---
title: "Menuiseries Aluminium pour Particuliers en Guadeloupe"
description: "Solutions sur mesure pour villas et maisons individuelles en Guadeloupe : baies coulissantes, volets roulants, pergolas bioclimatiques et fenêtres isolantes par ALUBAT."
heroImage: "/images/chantier-villa-marina.webp"
lang: "fr"
---

## Votre Projet d'Habitat avec ALUBAT Guadeloupe

Depuis plus de 20 ans, **ALUBAT Guadeloupe** accompagne les particuliers dans la construction neuve et la rénovation de villas, maisons traditionnelles et résidences de standing à travers toute la Guadeloupe.

Nos menuiseries aluminium sont fabriquées sur mesure dans nos ateliers de 3 000 m² à Baie-Mahault (Jarry), selon les normes anticycloniques les plus rigoureuses et avec les meilleurs labels de traitement de surface (**Qualimarine** et **Qualicoat**).

---

### Nos Solutions pour Votre Villa

- **Baies Vitrées et Coulissants Panoramiques** : Systèmes Schüco grande largeur (ASS 50, ASS 28) pour ouvrir vos pièces à vivre sur la terrasse et le jardin tout en garantissant une étanchéité parfaite.
- **Volets Roulants & Battants Anticycloniques** : Motorisés ou manuels, lames aluminium haute résistance pour sécuriser votre maison en toute saison.
- **Pergolas Bioclimatiques Biossun** : Lames orientables motorisées pour profiter pleinement de votre extérieur à l'abri du soleil tropical et des averses.
- **Portes d'Entrée & Portails Aluminium** : Modèles design Volma et Horizal alliant esthétique caribéenne, robustesse et sécurité renforcée.
- **Garde-Corps et Clôtures de Sécurité** : Gammes Horizal barreaudées ou vitrées pour terrasses, mezzanines et piscines conformes aux normes NF.

---

### Pourquoi Choisir ALUBAT ?

1. **Fabrication 100% Locale en Guadeloupe** : Réactivité, délais maîtrisés et adaptabilité totale à votre chantier.
2. **Conception Adaptée au Climat Tropical** : Traitements marins anticorrosion et résistance éprouvée aux cyclones et embruns salins.
3. **Bureau d'Études & Devis Gratuit** : Relevé de cotes in situ par nos techniciens-métreurs et accompagnement personnalisé de la conception à la pose.
4. **Garantie Décennale et Service Après-Vente** : Suivi rigoureux de vos installations par nos équipes de poseurs qualifiés.

[Consultez nos réalisations de villas d'exception](/realisations/) ou [contactez nos conseillers pour une étude personnalisée](/contact/).
`;
}

function getProfessionnelContent() {
  return `---
title: "Menuiseries Aluminium pour Professionnels & Collectivités en Guadeloupe"
description: "Partenaire de référence des maîtres d'œuvre, promoteurs et entreprises : façades rideaux, menuiseries tertiaires, portes automatiques et ERP par ALUBAT Guadeloupe."
heroImage: "/images/chantier-campus-sanitaire-social.webp"
lang: "fr"
---

## L'Expertise Industrielle au Service du Bâtiment Tertiaire et Public

Avec un outil de production de **3 000 m² d'ateliers à Jarry** et un bureau d'études techniques intégré, **ALUBAT Guadeloupe** est le partenaire industriel de référence des architectes, maîtres d'ouvrage publics et privés, promoteurs immobiliers et entreprises générales aux Antilles.

Nous concevons, fabriquons et installons des ouvrages complexes en aluminium répondant aux exigences techniques, thermiques, acoustiques et sécuritaires les plus strictes.

---

### Nos Domaines d'Intervention Tertiaire & Marchés Publics

- **Façades et Murs-Rideaux** : Systèmes Schüco FW 50+ pour immeubles de bureaux, sièges sociaux et centres commerciaux.
- **Portes Automatiques & Contrôle d'Accès** : Systèmes Record pour commerces, banques, cliniques et établissements recevant du public (ERP).
- **Menuiseries Coupe-Feu & Pare-Flammes** : Portes et châssis certifiés Schüco ADS 80 FR 30/60 conformes à la réglementation incendie.
- **Menuiseries Antieffraction & Pare-Balles** : Systèmes blindés Schüco AWS / ADS 90 BR pour sites sensibles et établissements bancaires.
- **Brise-Soleil et Protection Solaire Industrielle** : Lames aluminium fixes ou orientables (ailes d'avion ALB) pour optimiser l'efficacité énergétique des bâtiments tertiaires.
- **Garde-Corps ERP & Barreaudages** : Ouvrages certifiés conformes aux normes de charge et de sécurité des ERP.

---

### Références Chantiers Majeurs en Guadeloupe

- **Santé & Social** : Nouveau Centre Hospitalier Universitaire (CHU Guadeloupe), Pôle Social du Gosier, Campus Sanitaire & Social.
- **Bâtiments Publics & Institutionnels** : Siège Social de la CAF Guadeloupe, Camp Jacob, École Régionale de la 2e Chance.
- **Commerces & Bureaux** : Centre Commercial Colin, Antillopole Abymes, Immeuble de Bureaux Dothemare (GB Architecture).
- **Hôtellerie & Loisirs** : La Créole Beach Hôtel & Spa, Golf International de Saint-François, Aquarium de la Guadeloupe.

---

### Certifications & Engagements Professionnels

- **Partenaire Référence Schüco** : Accès direct aux profilés et avis techniques CSTB de pointe.
- **Certifications Qualibat & Labels Qualimarine / Qualicoat** : Garantie de process conformes aux DTU et normes caribéennes.
- **Assurances Décennale & Responsabilité Civile Professionnelle** : Couverture complète de l'ensemble de vos chantiers.

[Découvrez l'ensemble de nos chantiers de référence](/realisations/) ou [sollicitez notre bureau d'études pour vos appels d'offres](/contact/).
`;
}

function getArchitectesContent() {
  return `---
title: "Architectes & Maîtres d'Œuvre en Guadeloupe"
description: "Témoignages et collaborations entre ALUBAT Guadeloupe et les cabinets d'architecture de premier plan : GB Architecture, Benoit Architecte, Couleurs d'Architecture, AD Architecture."
heroImage: "/images/page-alubat-fabricant-installateur-de-menuisieries-aluminum-guadeloup.webp"
lang: "fr"
---

## Ils Nous Font Confiance

Depuis plus de deux décennies, les cabinets d'architecture et bureaux d'études de renom de Guadeloupe collaborent étroitement avec **ALUBAT** pour concevoir des ouvrages d'exception alliant audace architecturale, durabilité tropicale et précision technique.

Voici les retours d'expérience des architectes qui nous confient la réalisation de leurs projets résidentiels, tertiaires et hôteliers.

---

### Témoignages de Cabinets d'Architecture Partenaires

> « La société ALUBAT assure son activité dans les règles de l'art et dans le meilleur esprit professionnel, comme j'ai pu le vérifier notamment sur mes projets les plus récents : Hôtel La Toubana (Sainte-Anne), La Créole Beach Hôtel & Spa (Gosier), KFC Abymes et Gosier. »
>
> — **Guy Benoist**, *Benoit Architecte*

---

> « Tous les travaux effectués par l'entreprise de menuiseries aluminium ALUBAT / ALUPOSE nous ont donné jusqu'à ce jour entière satisfaction, aussi bien en fabrication qu'en pose. Nous avons notamment travaillé ensemble sur la construction de logements résidentiels et sociaux, la construction de villas d'exception, et la réalisation de bureaux et de bâtiments publics. »
>
> — **Céline Degoulet**, *Couleurs d'Architecture*

---

> « La société ALUBAT a exécuté sous ma direction de nombreux travaux de menuiserie aluminium sur des programmes immobiliers tertiaires et résidentiels. Cette entreprise m'a donné entière satisfaction pour toutes les prestations effectuées, dans le respect scrupuleux des normes et des délais. »
>
> — **Gérard Barbotteau**, *GB Architecture*

---

> « Tous les travaux effectués par l'entreprise de menuiserie aluminium ALUBAT nous ont donné entière satisfaction en termes de finition, d'étanchéité et de tenue dans le temps. Nous collaborons régulièrement sur des projets d'envergure : programmes de logements, villas contemporaines et équipements collectifs. »
>
> — **Véronique Hirth**, *SELARL d'Architecture AD*

---

### Vous Êtes Architecte ou Maître d'Œuvre ?

Notre bureau d'études met à votre disposition :
- Fiches techniques systèmes Schüco, Horizal, Volma et Biossun.
- Plans d'exécution, détails de réservations et coupes de principe (DWG / CAD).
- Avis techniques CSTB, procès-verbaux d'essais AEV et attestations de conformité paracyclonique.

[Contactez notre direction technique](/contact/) pour étudier vos projets en amont.
`;
}

async function processDirectory(dirPath, collection) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);

  let cleanedCount = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const fullPath = path.join(dirPath, file);

    // Check redundant pages to delete
    if (collection === 'pages' && redundantPagesToDelete.includes(file)) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[DELETED REDUNDANT] ${collection}/${file}`);
      }
      continue;
    }

    // Special templates for particulier, professionnel, architectes
    if (collection === 'pages') {
      if (file === 'particulier.md') {
        fs.writeFileSync(fullPath, getParticulierContent(), 'utf8');
        console.log(`[ENRICHED CLEAN] pages/particulier.md`);
        cleanedCount++;
        continue;
      }
      if (file === 'professionnel.md') {
        fs.writeFileSync(fullPath, getProfessionnelContent(), 'utf8');
        console.log(`[ENRICHED CLEAN] pages/professionnel.md`);
        cleanedCount++;
        continue;
      }
      if (file === 'architectes.md') {
        fs.writeFileSync(fullPath, getArchitectesContent(), 'utf8');
        console.log(`[ENRICHED CLEAN] pages/architectes.md`);
        cleanedCount++;
        continue;
      }
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const cleaned = cleanContent(content, fullPath, collection);

    if (cleaned !== content) {
      fs.writeFileSync(fullPath, cleaned, 'utf8');
      cleanedCount++;
      console.log(`[CLEANED] ${collection}/${file}`);
    }
  }
  console.log(`Summary for ${collection}: ${cleanedCount} files cleaned.`);
}

async function main() {
  console.log('--- Cleaning Avada Remnants in alubat971 content ---');
  await processDirectory(path.join(CONTENT_DIR, 'blog'), 'blog');
  await processDirectory(path.join(CONTENT_DIR, 'produits'), 'produits');
  await processDirectory(path.join(CONTENT_DIR, 'realisations'), 'realisations');
  await processDirectory(path.join(CONTENT_DIR, 'pages'), 'pages');
  console.log('--- Content Cleaning Complete ---');
}

main().catch(console.error);
