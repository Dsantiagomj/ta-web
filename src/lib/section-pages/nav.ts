// Las listas de clases y mazmorras del menú, en código puro: lo de siempre (los enlaces de
// src/components/site/nav.ts) con lo que Torre publica en sus colecciones encima. La lectura
// está en ./queries.ts.

import type { PageState } from '@/lib/achievements/strings'

/** Lo que el menú lee de una página de clase o de mazmorra publicada. */
export interface SectionNavDoc {
  title: string
  slug: string
  state?: PageState | null
  legacyHref?: string | null
  inMenu?: boolean | null
  menuName?: string | null
}

/** Un enlace del menú, con el slug de su página (su clave de fila). */
export interface SectionDefault<Image> {
  slug: string
  name: string
  href: string
  image?: Image
}

/** Adónde lleva: su página si está Publicada; si no, su enlace de Squarespace, si lo tiene. */
function hrefOf(doc: SectionNavDoc): string | undefined {
  if (doc.state === 'published') return `/${doc.slug}`
  return doc.legacyHref?.trim() || undefined
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es')

/**
 * La lista del menú: sin documentos, la de siempre tal cual. Con ellos, cada página de
 * siempre toma el nombre y el enlace de la suya (o desaparece si Torre la quitó del menú), las
 * nuevas que tienen adónde llevar se suman con su título, y todo va por nombre.
 */
export function sectionNavLinks<Image>(
  defaults: SectionDefault<Image>[],
  docs: SectionNavDoc[],
): SectionDefault<Image>[] {
  if (docs.length === 0) return defaults
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]))
  const known = new Set(defaults.map((link) => link.slug))
  const fromDefaults = defaults.flatMap((link): SectionDefault<Image>[] => {
    const doc = bySlug.get(link.slug)
    if (!doc) return [link]
    if (doc.inMenu === false) return []
    return [
      {
        ...link,
        name: doc.menuName?.trim() || link.name,
        href: hrefOf(doc) ?? link.href,
      },
    ]
  })
  const added = docs.flatMap((doc): SectionDefault<Image>[] => {
    const href = hrefOf(doc)
    if (known.has(doc.slug) || doc.inMenu === false || !href) return []
    return [{ slug: doc.slug, name: doc.menuName?.trim() || doc.title, href }]
  })
  return [...fromDefaults, ...added].sort(byName)
}
