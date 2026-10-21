#!/usr/bin/env node
/**
 * Rédaction et publication d'un article pour ce site.
 *
 * - Choisit la catégorie du silo la moins alimentée récemment.
 * - Rédige l'article via l'API Claude (sortie JSON contrainte par schéma).
 * - Valide : frontmatter, slug unique, liens internes existants + slash final, langue, longueur.
 * - Produit l'image /images/<slug>-hero.webp à partir de la bibliothèque du site.
 * - Écrit src/content/blog/<slug>.md et met à jour editorial/journal.json.
 *
 * Options : --force (ignore l'intervalle), --mock (article factice, sans appel API), --dry (n'écrit rien).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const FORCE = ARGS.has('--force');
const MOCK = ARGS.has('--mock');
const DRY = ARGS.has('--dry');

const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'editorial', 'config.json'), 'utf-8'));
const JOURNAL_PATH = path.join(ROOT, 'editorial', 'journal.json');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const MIN_INTERVAL_HOURS = CONFIG.minIntervalHours ?? 40;

const log = (...a) => console.log('[editorial]', ...a);
const fail = (msg) => { console.error('[editorial] ÉCHEC :', msg); process.exit(1); };

// ---------------------------------------------------------------- utilitaires
const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 3));
const jaccard = (a, b) => { const A = tokens(a), B = tokens(b); const i = [...A].filter((x) => B.has(x)).length; return i / (A.size + B.size - i || 1); };
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
const rand = (seed) => { let h = crypto.createHash('sha256').update(seed).digest(); let i = 0; return () => h[(i++) % h.length] / 255; };

function readFrontmatter(file) {
  const txt = fs.readFileSync(file, 'utf-8');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1);
    fm[mm[1]] = v;
  }
  return fm;
}

function listPosts() {
  const out = [];
  const walk = (dir, prefix = '') => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { walk(path.join(dir, e.name), `${prefix}${e.name}/`); continue; }
      if (!e.name.endsWith('.md')) continue;
      const fm = readFrontmatter(path.join(dir, e.name));
      out.push({ id: `${prefix}${e.name.slice(0, -3)}`, slug: e.name.slice(0, -3), ...fm, words: fs.readFileSync(path.join(dir, e.name), 'utf-8').split(/\s+/).length });
    }
  };
  walk(BLOG_DIR);
  return out;
}

const postUrl = (p) => `${CONFIG.postUrlPrefix}${p.slug}/`;

// ---------------------------------------------------------------- 1. faut-il publier ?
if (!MOCK && !process.env.ANTHROPIC_API_KEY) {
  console.log('::warning::ANTHROPIC_API_KEY absent : publication ignorée (voir set-secrets.ps1).');
  process.exit(0);
}
const journal = fs.existsSync(JOURNAL_PATH) ? JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf-8')) : { published: [] };
const last = journal.published.at(-1);
if (last && !FORCE) {
  const hours = (Date.now() - new Date(last.at).getTime()) / 36e5;
  if (hours < MIN_INTERVAL_HOURS) { log(`dernier article il y a ${hours.toFixed(1)} h (< ${MIN_INTERVAL_HOURS} h) : rien à publier.`); process.exit(0); }
}

// ---------------------------------------------------------------- 2. choix de la catégorie et du sujet
const posts = listPosts().filter((p) => (p.lang || CONFIG.lang) === CONFIG.lang && p.draft !== 'true');
const cats = CONFIG.categories;
const counts = Object.fromEntries(cats.map((c) => [c.id, posts.filter((p) => p.category === c.id).length]));
const recentCats = journal.published.slice(-4).map((p) => p.category);
const pickCategory = () => {
  const scored = cats.map((c) => {
    const recency = recentCats.lastIndexOf(c.id); // -1 si pas récente
    return { c, score: counts[c.id] + (recency >= 0 ? (recency + 1) * 25 : 0) + Math.random() * 8 };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].c;
};
const category = pickCategory();
const siblings = posts.filter((p) => p.category === category.id).sort((a, b) => String(b.pubDate).localeCompare(String(a.pubDate)));
const pillar = [...siblings].sort((a, b) => b.words - a.words)[0];
const parentUrl = CONFIG.categoryUrlPattern ? CONFIG.categoryUrlPattern.replace('{id}', category.id) : (pillar ? postUrl(pillar) : CONFIG.postUrlPrefix);
const linkTargets = [
  ...(pillar ? [{ url: postUrl(pillar), title: pillar.title, role: 'pilier' }] : []),
  ...siblings.filter((p) => p !== pillar).slice(0, 12).map((p) => ({ url: postUrl(p), title: p.title, role: 'frere' })),
];
const allowedUrls = new Set([parentUrl, CONFIG.postUrlPrefix, ...linkTargets.map((l) => l.url)]);

const usedTopics = new Set(journal.published.map((p) => norm(p.seed || '')));
const seed = (CONFIG.backlog || []).find((b) => !usedTopics.has(norm(b.titre)) && b.category === category.id
  && !posts.some((p) => jaccard(p.title, b.titre) > 0.5));

log(`catégorie : ${category.id} (${counts[category.id]} articles) — sujet amorce : ${seed ? seed.titre : 'libre'}`);

// ---------------------------------------------------------------- 3. rédaction
const R = rand(`${CONFIG.site}-${new Date().toISOString().slice(0, 10)}`);
const style = CONFIG.style;
const targetWords = Math.round(style.minWords + R() * (style.maxWords - style.minWords));
const format = style.formats[Math.floor(R() * style.formats.length)];
const useFaq = R() < style.faqProbability;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'description', 'tags', 'body'],
  properties: {
    title: { type: 'string', description: 'Titre éditorial, 45 à 80 caractères, sans emoji.' },
    slug: { type: 'string', description: 'Slug en minuscules, lettres/chiffres/tirets uniquement, 3 à 9 mots, sans accents.' },
    description: { type: 'string', description: 'Méta-description de 140 à 160 caractères.' },
    tags: { type: 'array', items: { type: 'string' }, description: '3 à 5 mots-clés courts.' },
    body: { type: 'string', description: "Corps Markdown de l'article, sans titre H1." },
  },
};

const L = CONFIG.lang === 'en'
  ? { langName: 'English (natural, native)', none: 'none' }
  : { langName: 'français (naturel, idiomatique)', none: 'aucun' };

const system = [
  `You are the editor of ${CONFIG.domain}, an independent editorial website. Niche: ${CONFIG.niche}.`,
  `Editorial voice: ${style.voice}`,
  `Write exclusively in ${L.langName}.`,
  'You write genuinely useful, accurate, concrete articles for real readers. Prefer verifiable general knowledge; never invent statistics, prices, quotes, studies, laws, or named businesses. When a figure varies, say so and give an order of magnitude with context, or advise checking the official source.',
  `Forbidden: emojis, clickbait, filler phrases (e.g. "${style.bannedPhrases.join('", "')}"), generic conclusions, mentioning that the text was generated, and any external links.`,
  'Formatting: Markdown with ## and ### headings (never #), short paragraphs, lists or a table only where they genuinely help. Do not start with a heading: open with a hook paragraph.',
].join('\n');

const user = [
  `Write a new article for the category "${category.label}" (id: ${category.id}).`,
  `Category scope: ${category.scope || category.label}.`,
  seed ? `Suggested topic (adapt the angle if needed): "${seed.titre}" — main keyword: "${seed.mot_cle}"${seed.mots_cles_secondaires ? `; secondary keywords: ${seed.mots_cles_secondaires.join(', ')}` : ''}.`
       : 'Choose a precise, search-worthy topic that fits this category and is clearly different from the existing articles below.',
  `Existing articles in this category (do NOT duplicate their angle):\n${siblings.slice(0, 40).map((p) => `- ${p.title}`).join('\n') || L.none}`,
  `Article format: ${format}. Target length: about ${targetWords} words.${useFaq ? ' End with a short FAQ section of 3 questions (### per question).' : ''}`,
  'Internal linking (mandatory): include 2 to 4 contextual links in the body, using descriptive anchors (never "click here"), chosen ONLY from this list, with the URLs copied exactly:',
  ...[{ url: parentUrl, title: `${category.label} (category hub)`, role: 'parent' }, ...linkTargets].map((l) => `- ${l.url} — ${l.title}`),
  `At least one link must point to ${parentUrl}${pillar && parentUrl !== postUrl(pillar) ? '' : ''}. Do not use any other URL.`,
].join('\n\n');

async function generate() {
  if (MOCK) {
    const t = seed?.titre || `Article de test ${category.label} ${Date.now()}`;
    return {
      title: t.slice(0, 78), slug: norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 7).join('-'),
      description: `Description de test pour vérifier la chaîne de publication automatique du site ${CONFIG.domain} et sa validation complète.`.slice(0, 155),
      tags: ['test', category.id],
      body: `Paragraphe d'introduction de test.\n\n## Première partie\n\nTexte avec un [lien vers la rubrique](${parentUrl}) et ${linkTargets[0] ? `[un article frère](${linkTargets[0].url})` : 'aucun frère'}.\n\n## Deuxième partie\n\n${'Lorem de test. '.repeat(60)}`,
    };
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ maxRetries: 4 });
  const stream = client.beta.messages.stream({
    model: CONFIG.model || 'claude-opus-5-5',
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: CONFIG.effort || 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system,
    messages: [{ role: 'user', content: user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') fail(`refus du modèle (${msg.stop_details?.category ?? 'sans catégorie'})`);
  if (msg.stop_reason === 'max_tokens') fail('réponse tronquée (max_tokens)');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  log(`tokens : entrée ${msg.usage.input_tokens}, sortie ${msg.usage.output_tokens}`);
  return JSON.parse(text);
}

// ---------------------------------------------------------------- 4. validation
function validate(a) {
  const errors = [];
  a.title = String(a.title).replace(/"/g, "'").replace(/\s+/g, ' ').trim();
  a.description = String(a.description).replace(/"/g, "'").replace(/\s+/g, ' ').trim();
  a.slug = norm(a.slug).replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  a.body = String(a.body).replace(/^\s*#\s+[^\n]*\n+/, '').trim();
  if (EMOJI.test(a.title + a.description + a.body)) errors.push('emoji présent');
  if (a.title.length < 20 || a.title.length > 110) errors.push(`titre de longueur ${a.title.length}`);
  if (a.description.length < 110 || a.description.length > 175) errors.push(`description de longueur ${a.description.length}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+){1,11}$/.test(a.slug)) errors.push(`slug invalide : ${a.slug}`);
  if (fs.existsSync(path.join(BLOG_DIR, `${a.slug}.md`))) errors.push(`slug déjà utilisé : ${a.slug}`);
  const dup = posts.find((p) => jaccard(p.title, a.title) > 0.6);
  if (dup) errors.push(`titre trop proche de « ${dup.title} »`);
  const words = a.body.split(/\s+/).length;
  if (!MOCK && words < style.minWords * 0.75) errors.push(`article trop court (${words} mots)`);
  // liens : internes autorisés uniquement, slash final, aucun lien externe
  let internal = 0;
  a.body = a.body.replace(/(!?)\[([^\]]+)\]\(([^)\s]+)\)/g, (m, bang, text, url) => {
    if (bang) return text;
    const u = url.split('#')[0];
    const fixed = u.endsWith('/') ? u : `${u}/`;
    if (allowedUrls.has(fixed)) { internal++; return `[${text}](${fixed})`; }
    return text; // lien non autorisé : on garde l'ancre en texte
  });
  if (internal < (MOCK ? 1 : 2)) errors.push(`maillage insuffisant (${internal} lien(s) interne(s) valide(s))`);
  if (!a.body.includes(parentUrl)) errors.push('pas de lien vers la catégorie parente');
  a.tags = (a.tags || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  return errors;
}

// ---------------------------------------------------------------- 5. image
async function makeHero(slug, title) {
  const sharp = (await import('sharp')).default;
  const pool = fs.readdirSync(IMG_DIR).filter((f) => /\.(jpe?g|webp|png)$/i.test(f) && !/(^|-)(123alu|123fenetre|menuiserie|logo|favicon|og-image)/i.test(f) && fs.statSync(path.join(IMG_DIR, f)).size > 20000);
  if (!pool.length) fail('aucune image exploitable dans public/images');
  const used = new Map();
  for (const p of posts) { const b = path.basename(String(p.heroImage || '')); used.set(b, (used.get(b) || 0) + 1); }
  for (const p of journal.published) used.set(p.source, (used.get(p.source) || 0) + 3);
  const words = tokens(`${title} ${category.label} ${category.keywords || ''}`);
  const scored = pool.map((f) => ({ f, s: [...tokens(f.replace(/-hero|\.\w+$/g, ''))].filter((t) => words.has(t)).length * 2 - (used.get(f) || 0) * 0.7 + Math.random() }));
  scored.sort((a, b) => b.s - a.s);
  const source = scored[0].f;
  const r = rand(slug);
  const img = sharp(path.join(IMG_DIR, source)).rotate();
  const meta = await img.metadata();
  const zoom = 1.04 + r() * 0.14; // recadrage 4 à 18 %
  const w = Math.round(meta.width / zoom), h = Math.round(Math.min(meta.height, w * 9 / 16));
  const left = Math.round(r() * (meta.width - w)), top = Math.round(r() * Math.max(0, meta.height - h));
  const out = path.join(IMG_DIR, `${slug}-hero.webp`);
  if (!DRY) {
    let pipe = img.extract({ left, top, width: w, height: h }).resize(1600, 900, { fit: 'cover' })
      .modulate({ brightness: 0.96 + r() * 0.08, saturation: 0.92 + r() * 0.16, hue: Math.round(r() * 10 - 5) });
    if (r() > 0.5) pipe = pipe.flop();
    await pipe.webp({ quality: 78 + Math.round(r() * 8) }).toFile(out);
  }
  return { hero: `/images/${slug}-hero.webp`, source };
}

// ---------------------------------------------------------------- 6. écriture
function pubDateNow() {
  const d = new Date(Date.now() - Math.floor(Math.random() * 20) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: CONFIG.timeZone || 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const g = (t) => parts.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${p(d.getSeconds())}`;
}

let article, errors = [];
for (let attempt = 1; attempt <= 2; attempt++) {
  article = await generate();
  errors = validate(article);
  if (!errors.length) break;
  log(`tentative ${attempt} rejetée : ${errors.join(' ; ')}`);
  if (MOCK) break;
}
if (errors.length) fail(errors.join(' ; '));

const { hero, source } = await makeHero(article.slug, article.title);
const fm = [
  '---',
  `title: ${JSON.stringify(article.title)}`,
  `description: ${JSON.stringify(article.description)}`,
  `pubDate: ${JSON.stringify(pubDateNow())}`,
  `category: ${JSON.stringify(category.id)}`,
  `lang: ${JSON.stringify(CONFIG.lang)}`,
  `heroImage: ${JSON.stringify(hero)}`,
  `tags: ${JSON.stringify(article.tags)}`,
  'draft: false',
  '---',
  '',
].join('\n');
const file = path.join(BLOG_DIR, `${article.slug}.md`);
if (DRY) { log('--dry : aperçu\n' + fm + article.body.slice(0, 600)); process.exit(0); }
fs.writeFileSync(file, `${fm}\n${article.body}\n`, 'utf-8');
journal.published.push({ at: new Date().toISOString(), slug: article.slug, category: category.id, seed: seed?.titre || null, source, mock: MOCK || undefined });
fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf-8');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `published=${article.slug}\n`);
log(`publié : ${postUrl(article)} (${category.id})`);
