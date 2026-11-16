// Lo que la web pinta de los globales «Ajustes del sitio» y «Portada e índices»: lo que
// Torre escribió y, donde no escribió nada, el texto de siempre (defaults.ts).

import {
  type IndexTexts,
  indexTextDefaults,
  type SiteSettingsTexts,
  siteSettingsDefaults,
} from './defaults'
import { isWebUrl } from './link'

type Stored = Record<string, unknown>

export const asRecord = (value: unknown): Stored =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Stored) : {}

export const filled = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim()

/**
 * Los textos de siempre con lo guardado encima, campo a campo: un texto escrito gana, uno
 * vacío o en blanco vuelve al de siempre. Solo cuenta lo que está en los textos de siempre.
 */
export function withDefaults<T>(defaults: T, stored: unknown): T {
  if (typeof defaults === 'string') return (filled(stored) ? stored : defaults) as T
  const source = asRecord(stored)
  return Object.fromEntries(
    Object.entries(defaults as Stored).map(([key, value]) => [
      key,
      withDefaults(value, source[key]),
    ]),
  ) as T
}

/** Los campos vacíos de lo guardado, con su camino y su texto de siempre. */
export function copyFills(
  defaults: unknown,
  stored: unknown,
  prefix = '',
): { path: string; value: string }[] {
  if (typeof defaults === 'string') {
    return filled(stored) ? [] : [{ path: prefix, value: defaults }]
  }
  const source = asRecord(stored)
  return Object.entries(asRecord(defaults)).flatMap(([key, value]) =>
    copyFills(value, source[key], prefix ? `${prefix}.${key}` : key),
  )
}

export interface ShareImage {
  url: string
  width: number
  height: number
  alt?: string
}

export type SiteSettings = SiteSettingsTexts & { ogImage: ShareImage | null }

/**
 * La imagen al compartir: el archivo original que subió Torre, que los buscadores y las
 * redes leen mejor que el WebP de las variantes. Sin poblar o sin archivo, ninguna.
 */
function shareImage(value: unknown): ShareImage | null {
  const media = asRecord(value)
  const { url, width, height, alt } = media
  if (!filled(url) || typeof width !== 'number' || typeof height !== 'number') return null
  return { url, width, height, ...(filled(alt) && { alt }) }
}

export function resolveSiteSettings(stored: unknown): SiteSettings {
  const doc = asRecord(stored)
  const settings = withDefaults(siteSettingsDefaults, doc)
  // Un enlace que no es una dirección web (javascript:, un trozo de dirección) no sale.
  for (const [key, link] of Object.entries(settings.socials)) {
    const fallback = siteSettingsDefaults.socials[key as keyof typeof settings.socials].url
    if (!isWebUrl(link.url)) link.url = fallback
  }
  return { ...settings, ogImage: shareImage(doc.ogImage) }
}

export function resolveIndexTexts(stored: unknown): IndexTexts {
  return withDefaults(indexTextDefaults, stored)
}
