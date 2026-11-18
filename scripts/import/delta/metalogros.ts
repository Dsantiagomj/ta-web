// La lista de un metalogro en Squarespace contra la del panel, para el informe de la
// importación delta. La importación no la cambia: los logros de un metalogro salen de DofusDB
// (su categoría) y las guías sueltas las elige Torre. Código puro.
import { SITE } from '../inventory/pages.ts'

/** Los slugs de este sitio que enlaza una página de Torre, en orden y sin repetir. */
export function linkedSlugs(links: string[]): string[] {
  const slugs = links.flatMap((href) => {
    const local = href.startsWith(SITE) ? href.slice(SITE.length) : href
    if (!local.startsWith('/') || local.startsWith('//')) return []
    const slug = local
      .split(/[?#]/)[0]!
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase()
    return slug && !slug.includes('/') ? [slug] : []
  })
  return [...new Set(slugs)]
}

export interface MetalogroPanel {
  /** El slug del metalogro (el ancla de su panel en /metalogros). */
  group: string
  /** Las páginas de logro de cada metalogro, por slug de página → slug de metalogro. */
  pageGroups: Map<string, string | null>
  /** Las guías sueltas del metalogro (su campo «Otras guías»). */
  guides: string[]
  /** Los slugs de las guías de misión del sitio. */
  questGuides: Set<string>
}

export interface MetalogroComparison {
  group: string
  /** Lo que Squarespace enlaza y el panel no tiene en este metalogro, con lo que es aquí. */
  onlySquarespace: { slug: string; note: string }[]
  /** Las páginas de logro y guías del metalogro en el panel que Squarespace no enlaza. */
  onlyPanel: string[]
}

export function compareMetalogro(linked: string[], panel: MetalogroPanel): MetalogroComparison {
  const members = new Set([
    ...[...panel.pageGroups].filter(([, group]) => group === panel.group).map(([slug]) => slug),
    ...panel.guides,
  ])
  const onlySquarespace = linked
    .filter((slug) => !members.has(slug))
    .flatMap((slug) => {
      if (panel.pageGroups.has(slug)) {
        const other = panel.pageGroups.get(slug)
        return [
          { slug, note: other ? `página de logro de ${other}` : 'página de logro sin metalogro' },
        ]
      }
      if (panel.questGuides.has(slug))
        return [{ slug, note: 'guía de misión, no está en «Otras guías»' }]
      // Los enlaces a otros metalogros, índices y páginas sueltas no son de la lista.
      return slug.startsWith('metalogro') ? [] : [{ slug, note: 'sin página aquí' }]
    })
  const onlyPanel = [...members].filter((slug) => !linked.includes(slug)).sort()
  return { group: panel.group, onlySquarespace, onlyPanel }
}
