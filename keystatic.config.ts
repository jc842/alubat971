import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    blog: collection({
      label: 'Articles du Blog',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        description: fields.text({ label: 'Description SEO', multiline: true }),
        pubDate: fields.date({ label: 'Date de publication', defaultValue: { kind: 'today' } }),
        heroImage: fields.text({ label: 'Image de couverture' }),
        category: fields.text({ label: 'Catégorie', defaultValue: 'Général' }),
        lang: fields.select({
          label: 'Langue',
          options: [
            { label: 'Français (FR)', value: 'fr' },
            { label: 'English (EN)', value: 'en' },
            { label: 'Español (ES)', value: 'es' },
          ],
          defaultValue: 'fr',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags / Mots-clés',
          itemLabel: (props) => props.value || 'Tag',
        }),
        draft: fields.checkbox({ label: 'Brouillon', defaultValue: false }),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
    pages: collection({
      label: 'Pages Statiques',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        description: fields.text({ label: 'Description SEO', multiline: true }),
        pubDate: fields.date({ label: 'Date de publication' }),
        heroImage: fields.text({ label: 'Image de couverture' }),
        lang: fields.select({
          label: 'Langue',
          options: [
            { label: 'Français (FR)', value: 'fr' },
            { label: 'English (EN)', value: 'en' },
            { label: 'Español (ES)', value: 'es' },
          ],
          defaultValue: 'fr',
        }),
        draft: fields.checkbox({ label: 'Brouillon', defaultValue: false }),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
  },
});
