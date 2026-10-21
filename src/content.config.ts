import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string().default('Actualités & Conseils'),
    lang: z.enum(['fr', 'en', 'es']).default('fr'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const produits = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/produits' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string().default('Menuiserie Aluminium'),
    brand: z.string().default('ALUBAT'),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['fr', 'en', 'es']).default('fr'),
    draft: z.boolean().default(false),
  }),
});

const realisations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/realisations' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string().default('Chantier Référence'),
    location: z.string().default('Guadeloupe'),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['fr', 'en', 'es']).default('fr'),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    heroImage: z.string().optional(),
    lang: z.enum(['fr', 'en', 'es']).default('fr'),
  }),
});

export const collections = { blog, produits, realisations, pages };
