import { siteConfig } from '../config/site.config';

const cats: Array<{ id: string; label: string }> = (siteConfig as any).categories ?? [];

/** Libellé lisible d'un identifiant de catégorie (taxonomie du site). */
export function catLabel(id?: string | null, fallback = ''): string {
  if (!id) return fallback;
  return cats.find((c) => c.id === id)?.label ?? (fallback || id);
}
