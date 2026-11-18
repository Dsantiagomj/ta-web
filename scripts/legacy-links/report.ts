// El informe de pnpm links:legacy (scripts/links-legacy.ts): cada enlace que el sitio pintaría
// hacia la web de Squarespace, o hacia una ruta que responde 410, con dónde sale y qué
// responderá este sitio en esa ruta tras el cambio de dominio. Código puro.
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'
import {
  type LiveSlug,
  ownSitePath,
  servedPath,
  type ServedKind,
  siteLinkHref,
} from '@/lib/site/site-links'

/**
 * De dónde sale: el código (el menú, el pie), el contenido de Torre (sus textos y enlaces) o
 * el enlace de Squarespace de algo En preparación, que es Torre quien decide cuándo publica.
 */
export type LinkSource = 'code' | 'content' | 'preparing'

export interface LegacyLinkEntry {
  source: LinkSource
  where: string
  href: string
  /** Qué responde este sitio en esa ruta tras el cambio; null: nada, un 404. */
  served: ServedKind | null
  note?: string
}

/** Los enlaces de Torre que ya van a este sitio, por lo que responde su ruta. */
export type RelativeCounts = Record<Exclude<ServedKind, 'gone'>, number>

export interface ClassifiedLink {
  path: string
  served: ServedKind | null
  /** Lo que pinta el sitio (siteLinkHref): relativo si sirve la ruta. */
  rendered: string
}

/** Qué hace el sitio con un enlace a la web de Torre; null si lleva a otra web. */
export function classifyLink(href: string, live: LiveSlug): ClassifiedLink | null {
  const path = ownSitePath(href)
  if (path === null) return null
  return { path, served: servedPath(path, live), rendered: siteLinkHref(href, live) }
}

/** Si el enlace pinta hacia Squarespace o hacia una ruta que se fue (410): hay que resolverlo. */
export const needsAttention = (link: ClassifiedLink) =>
  link.served === null || link.served === 'gone'

const SERVED_TEXT: Record<ServedKind, string> = {
  page: 'página publicada',
  route: 'ruta propia',
  redirect: 'redirección',
  gone: '410 tras el cambio',
}

const servedText = (served: ServedKind | null) =>
  served ? SERVED_TEXT[served] : '404 tras el cambio'

const SECTIONS: { source: LinkSource; title: string }[] = [
  { source: 'code', title: 'Del código' },
  { source: 'content', title: 'Del contenido' },
  { source: 'preparing', title: 'En preparación, lo decide Torre' },
]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** El informe, línea a línea. La última es el resumen. */
export function reportLines(
  entries: readonly LegacyLinkEntry[],
  { relative }: { relative: RelativeCounts },
): string[] {
  const lines = [`Enlaces por resolver antes del cambio de dominio (${LEGACY_SITE_ORIGIN})`]
  const counts = SECTIONS.map(({ source, title }) => {
    const rows = entries.filter((entry) => entry.source === source)
    if (rows.length > 0) {
      lines.push('', `${title} (${rows.length})`)
      for (const row of rows) {
        const parts = [`${row.where} → ${row.href}`, servedText(row.served), row.note]
        lines.push(`  ${parts.filter(Boolean).join(' · ')}`)
      }
    }
    return rows.length
  })
  const [code, content, preparing] = counts as [number, number, number]
  const done = relative.page + relative.redirect + relative.route
  const doneParts = [
    relative.page ? plural(relative.page, 'página', 'páginas') : '',
    relative.redirect ? plural(relative.redirect, 'redirección', 'redirecciones') : '',
    relative.route ? plural(relative.route, 'ruta propia', 'rutas propias') : '',
  ].filter(Boolean)
  const doneText = `Ya van a este sitio: ${done}${doneParts.length ? ` (${doneParts.join(', ')})` : ''}.`
  const pending = entries.length
    ? `${entries.length} por resolver (${code} del código, ${content} del contenido, ${preparing} en preparación).`
    : 'nada por resolver.'
  lines.push('', `Resumen: ${pending} ${doneText}`)
  return lines
}
