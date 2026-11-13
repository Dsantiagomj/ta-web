// La tabla de URL antiguas de Squarespace (AGENTS.md, Redirects): cada URL que ya no tiene
// página va a la que la sustituye (301, o 307 en una sección que aún cambia) o se da por
// desaparecida (410). Los datos viven en legacy-urls.json, por secciones; esto los valida al
// cargar y los deja en un Map, así que el proxy resuelve cada petición con una búsqueda, sin
// tocar la base. La puerta es tests/unit/redirect-table.test.ts: una fila mala que llegue
// a producción deja el sitio sin redirecciones, no caído.

import { isGuideSlug } from '@/lib/guides/slug'

import legacyUrls from './legacy-urls.json'

export type LegacyRule = { status: 301 | 307; to: string } | { status: 410 }

export interface LegacySection {
  /** De dónde salen sus URL: el punto del backlog y quién las mantiene. */
  description: string
  /**
   * false: sus redirecciones son 307, porque la sección cambia (la regenera un script) y un
   * 301 se guarda para siempre. Sin el campo, 301.
   */
  permanent?: boolean
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

const SITE = 'https://sitio.invalid'

/**
 * El destino es una ruta de este sitio. Sin barras invertidas ni espacios o controles: un
 * navegador lee «/\otro.com» como «//otro.com». Y resuelto contra el sitio, sigue en él.
 */
function checkTarget(target: string, source: string, section: string) {
  const plain = /^\/(?!\/)[^\\\s\p{Cc}]*$/u.test(target)
  if (!plain || new URL(target, SITE).origin !== SITE) {
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
    const status = section.permanent === false ? 307 : 301
    for (const [source, to] of Object.entries(section.moved ?? {})) {
      checkTarget(to, source, name)
      add(source, { status, to }, name)
    }
    for (const source of section.gone ?? []) add(source, { status: 410 }, name)
  }
  // Un destino que también está en la tabla haría dos saltos (o un 301 a un 410).
  for (const [source, rule] of table) {
    if (rule.status === 410) continue
    const target = legacyKey(rule.to.split('#')[0])
    if (target && table.has(target)) {
      throw new Error(`legacy-urls.json: «${source}» → «${rule.to}» haría una cadena`)
    }
  }
  return table
}

/**
 * La tabla para el proxy. Si los datos no valen, lo dice en el log y devuelve una tabla
 * vacía: sin redirecciones, pero con el sitio (y /api/health) en pie.
 */
export function loadLegacyTable(
  sections: LegacySections,
  log: (message: string) => void = console.error,
): Map<string, LegacyRule> {
  try {
    return buildLegacyTable(sections)
  } catch (error) {
    log(`Redirecciones desactivadas: ${error instanceof Error ? error.message : String(error)}`)
    return new Map()
  }
}

export const LEGACY_URLS = loadLegacyTable(legacyUrls as LegacySections)

/** Si /<slug> es una URL de la tabla: el proxy la responde y nunca llega a su página. */
export function isLegacySource(slug: string): boolean {
  return LEGACY_URLS.has(`/${slug.toLowerCase()}`)
}

/** La redirección o el 410 de una URL antigua, o null si la ruta no está en la tabla. */
export function lookupLegacyUrl(
  pathname: string,
  table: ReadonlyMap<string, LegacyRule> = LEGACY_URLS,
): LegacyRule | null {
  const key = legacyKey(pathname)
  return (key && table.get(key)) || null
}
