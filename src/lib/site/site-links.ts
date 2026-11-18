// Los enlaces de Torre a su propia web (torrentearcano.com/<ruta>) en lo que escribe: el texto
// de las guías, los logros, las guías de Dofus, las páginas sueltas y las checklists, y los
// enlaces sueltos de una guía de Dofus. Cuando este sitio sirve esa ruta, el enlace pasa a ser
// relativo; si no, lleva a su página de Squarespace, nunca a un 404 de aquí. Lo usan las
// páginas, el importador (scripts/import/dofus-guides/site-links.ts) y el informe de enlaces a
// Squarespace (pnpm links:legacy). Código puro.
import { isReservedSlug } from '@/lib/guides/slug'
import { lookupLegacyUrl } from '@/lib/redirects/table'

import { LEGACY_SITE_ORIGIN } from './legacy'

/** Si /<slug> es una página que el sitio enseña (o una dirección cambiada que lleva a una). */
export type LiveSlug = (slug: string) => boolean

/**
 * Qué responde este sitio en una ruta: una página publicada, una ruta propia (la portada,
 * /metalogros, /buscar…), una URL antigua de la tabla de redirecciones que lleva a otra
 * página, o una que responde 410. null: nada, un 404.
 */
export type ServedKind = 'page' | 'route' | 'redirect' | 'gone'

const OWN_HOSTS = new Set(['torrentearcano.com', 'www.torrentearcano.com'])

/**
 * La ruta de la web de Torre a la que lleva un enlace («/emotes?x#y»): absoluto a
 * torrentearcano.com, con o sin www, o relativo. null si lleva a otra web, es un ancla o no
 * es una dirección.
 */
export function ownSitePath(href: string): string | null {
  const value = href.trim()
  if (value.startsWith('/')) return value.startsWith('//') ? null : value
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!OWN_HOSTS.has(url.hostname)) return null
  // Un «#» vacío al final no sale en url.hash, y es lo que marca un enlace sin destino.
  const hash = url.hash || (value.endsWith('#') ? '#' : '')
  return `${url.pathname}${url.search}${hash}`
}

/** Qué sirve este sitio en una ruta («/slug», con o sin consulta y ancla), o null. */
export function servedPath(path: string, live: LiveSlug): ServedKind | null {
  const pathname = path.split(/[?#]/u)[0]!.replace(/\/+$/u, '')
  if (pathname === '') return 'route'
  const slug = pathname.slice(1).toLowerCase()
  if (!pathname.startsWith('/') || slug.includes('/')) return null
  if (isReservedSlug(slug)) return 'route'
  const legacy = lookupLegacyUrl(pathname)
  if (legacy) return legacy.status === 410 ? 'gone' : 'redirect'
  return live(slug) ? 'page' : null
}

/**
 * El enlace que se pinta: relativo si lleva a la web de Torre y este sitio sirve esa ruta; si
 * no la sirve, a su página de Squarespace (un absoluto se queda tal cual, uno relativo lo
 * lleva allí). Una URL que aquí responde 410 también sigue en Squarespace, que aún la tiene:
 * el informe de pnpm links:legacy la lista para quitarla antes del cambio de dominio. Lo que
 * no es la web de Torre no cambia.
 */
export function siteLinkHref(href: string, live: LiveSlug): string {
  const path = ownSitePath(href)
  if (path === null) return href
  const served = servedPath(path, live)
  if (served !== null && served !== 'gone') return path
  return href.startsWith('/') ? `${LEGACY_SITE_ORIGIN}${path}` : href
}

/**
 * Squarespace dejó algunas coordenadas enlazadas a la propia guía con un «#» vacío: no llevan
 * a ninguna parte. Absolutas o ya pasadas a relativas.
 */
export function isPlaceholderHref(href: string): boolean {
  const path = ownSitePath(href)
  return path !== null && path.endsWith('#')
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Un nodo de enlace de Lexical con una URL escrita (no un enlace interno a un documento). */
function linkUrl(node: Json): string | null {
  if (node.type !== 'link' && node.type !== 'autolink') return null
  const fields = node.fields
  if (!isObject(fields) || fields.linkType === 'internal') return null
  return typeof fields.url === 'string' ? fields.url : null
}

/**
 * Los mismos datos con cada enlace de texto rico (nodos `link` y `autolink` de Lexical) pasado
 * por siteLinkHref, estén donde estén: el cuerpo, los pasos, los bloques. No toca el original
 * (puede venir de la caché) y devuelve el mismo objeto donde nada cambia.
 */
export function withSiteLinks<T>(value: T, live: LiveSlug): T {
  return rewrite(value, live) as T
}

function rewrite(value: unknown, live: LiveSlug): unknown {
  if (Array.isArray(value)) {
    let changed = false
    const out = value.map((item) => {
      const next = rewrite(item, live)
      if (next !== item) changed = true
      return next
    })
    return changed ? out : value
  }
  if (!isObject(value)) return value
  let out: Json | null = null
  const url = linkUrl(value)
  if (url !== null) {
    const href = siteLinkHref(url, live)
    if (href !== url) out = { ...value, fields: { ...(value.fields as Json), url: href } }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'fields' && out) continue
    const next = rewrite(child, live)
    if (next !== child) {
      out ??= { ...value }
      out[key] = next
    }
  }
  return out ?? value
}
