# 🚀 Starter Universel PBN Astro 5 + Keystatic + i18n

Modèle moderne, ultra-rapide et optimisé pour le référencement (SEO) conçu pour le réseau PBN multi-sites déployé sur Cloudflare Pages.

---

## 🌟 Points Forts

- ⚡ **Astro 5 SSG** : Génération statique pure, 0 JavaScript client superflu, scores Core Web Vitals optimaux (100/100).
- 📝 **Keystatic CMS Intégré** : Interface d'administration Markdown ergonomique accessible en local (`/keystatic`) et prête pour GitHub mode en production.
- 🌍 **Internationalisation Native (i18n)** :
  - `fr` (par défaut, sans préfixe d'URL : `/blog/[slug]`)
  - `en` (anglais sous `/en/[slug]`)
  - `es` (espagnol sous `/es/[slug]`)
  - Balises `hreflang` automatiques pour Google Search Console.
- 🔄 **Redirections Cloudflare 301 Automatisées** : Fichier `public/_redirects` préservant le jus SEO de l'ancien WordPress (anciennes URLs root WP redirigées vers `/blog/[slug]`).
- 🎨 **Anti-Footprint PBN** : Personnalisation instantanée via `src/config/site.config.ts` (palettes de couleurs `emerald`, `ocean`, `amber`, `stone`, `slate`, typographies, mise en page).
- 📊 **Matomo Analytics** : Tracking sans cookies conforme RGPD.
- 💰 **Revive Adserver** : Bannières monétisation (Sticky mobile 320x100, In-content 300x250, Leaderboard 728x90) avec auto-collapse si vide.

---

## 🛠️ Déploiement d'un nouveau site PBN en 3 étapes

Pour migrer n'importe quel site du réseau MainWP :

### 1. Cloner le template dans un nouveau dossier

```bash
git clone https://github.com/jc842/pbn-template.git mon-site-pbn
cd mon-site-pbn
npm install
```

### 2. Récupérer le contenu depuis MainWP

Exécutez le script d'extraction automatique avec l'ID du site dans MainWP :

```bash
# Exemple pour le site ID 166 (artguadeloupe.com)
node scripts/fetch-from-mainwp.mjs --site=166
```

Le script réalise automatiquement :
1. Connexion à l'API REST MainWP v2 (`https://dashboard.les4h.fr/wp-json/mainwp/v2/`).
2. Récupération des métadonnées du site (nom, URL, description) et mise à jour de `src/config/site.config.ts`.
3. Téléchargement de tous les articles et conversion du contenu HTML en Markdown propre dans `src/content/blog/`.
4. Téléchargement des pages statiques dans `src/content/pages/`.
5. Génération automatique du fichier `public/_redirects` avec toutes les règles 301.

### 3. Tester et Builder

```bash
# Lancer le serveur de développement avec Keystatic
npm run dev

# Tester le build de production Cloudflare
npm run build
```

---

## 📁 Structure du Projet

```text
├── public/
│   ├── _redirects            # Règles Cloudflare 301
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   └── fetch-from-mainwp.mjs # Script d'extraction MainWP v2
├── src/
│   ├── components/
│   │   ├── ads/              # Slots publicitaires Revive
│   │   └── analytics/        # Tag Matomo
│   ├── config/
│   │   └── site.config.ts    # Configuration du site (thème, analytics, adserver)
│   ├── content/
│   │   ├── blog/             # Articles Markdown (fr, en, es)
│   │   └── pages/            # Pages statiques (À propos, Contact, etc.)
│   ├── layouts/
│   │   └── Layout.astro      # Structure HTML globale (SEO, hreflang, header/footer)
│   └── pages/
│       ├── blog/             # Index et routes des articles FR
│       ├── en/               # Routes des articles EN
│       ├── es/               # Routes des articles ES
│       ├── index.astro       # Page d'accueil
│       └── [...slug].astro   # Route dynamique pour les pages de contenu
├── keystatic.config.ts       # Schéma du CMS Keystatic
├── astro.config.mjs          # Configuration Astro 5
└── tailwind.config.mjs       # Configuration TailwindCSS
```

---

## ✍️ Administration avec Keystatic

En local, lancez :
```bash
npm run dev
```
Rendez-vous sur [http://localhost:4321/keystatic](http://localhost:4321/keystatic) pour créer, éditer et traduire vos articles directement dans votre navigateur.
