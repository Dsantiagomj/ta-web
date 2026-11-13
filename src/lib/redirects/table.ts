// La tabla de URL antiguas de Squarespace (AGENTS.md, Redirects): cada URL que ya no tiene
// página va a la que la sustituye (301) o se da por desaparecida (410). Los datos viven en
// legacy-urls.json, por secciones; esto los valida al cargar y los deja en un Map, así que
// el proxy resuelve cada petición con una búsqueda, sin tocar la base.

import { isGuideSlug } from '@/lib/guides/slug'

import legacyUrls from './legacy-urls.json'

export type LegacyRule = { status: 301; to: string } | { status: 410 }

export interface LegacySection {
  /** De dónde salen sus URL: el punto del backlog y quién las mantiene. */
  description: string
  /** URL antigua → página nueva. El destino es una ruta del sitio, con ancla si hace falta. */
  moved?: Record<string, string>
  /** URL sin sustituta: 410. */
  gone?: string[]
}

export type LegacySections = Record<string, LegacySection>

/** La clave de una ruta: «/slug» en minúsculas, sin barra final; null si tiene subruta. */
export function legacyKey(pathname: string): string | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '')
  const slug = path.slice(1)
  return path.startsWith('/') && slug && !slug.includes('/') ? path : null
}

function checkSource(source: string, section: string) {
  const slug = source.slice(1)
  if (!source.startsWith('/') || !isGuideSlug(slug)) {
    throw new Error(`legacy-urls.json, ${section}: «${source}» no es /<slug> o es una ruta propia`)
  }
}

function checkTarget(target: string, source: string, section: string) {
  if (!target.startsWith('/') || target.startsWith('//')) {
    throw new Error(`legacy-urls.json, ${section}: «${source}» apunta fuera del sitio`)
  }
}

/** Junta y valida las secciones: sin URL repetidas, sin cadenas, sin tapar rutas propias. */
export function buildLegacyTable(sections: LegacySections): Map<string, LegacyRule> {
  const table = new Map<string, LegacyRule>()
  const add = (source: string, rule: LegacyRule, section: string) => {
    checkSource(source, section)
    if (table.has(source)) {
      throw new Error(`legacy-urls.json, ${section}: «${source}» ya está en la tabla`)
    }
    table.set(source, rule)
  }
  for (const [name, section] of Object.entries(sections)) {
    for (const [source, to] of Object.entries(section.moved ?? {})) {
      checkTarget(to, source, name)
      add(source, { status: 301, to }, name)
    }
    for (const source of section.gone ?? []) add(source, { status: 410 }, name)
  }
  // Un destino que también está en la tabla haría dos saltos (o un 301 a un 410).
  for (const [source, rule] of table) {
    if (rule.status !== 301) continue
    const target = legacyKey(rule.to.split('#')[0])
    if (target && table.has(target)) {
      throw new Error(`legacy-urls.json: «${source}» → «${rule.to}» haría una cadena`)
    }
  }
  return table
}

export const LEGACY_URLS = buildLegacyTable(legacyUrls as LegacySections)

/** El 301 o el 410 de una URL antigua, o null si la ruta no está en la tabla. */
export function lookupLegacyUrl(
  pathname: string,
  table: ReadonlyMap<string, LegacyRule> = LEGACY_URLS,
): LegacyRule | null {
  const key = legacyKey(pathname)
  return (key && table.get(key)) || null
}
