import { LEGACY_SITE_ORIGIN } from './legacy'

/** El dominio de Torre: esta web y la de siempre en Squarespace, con o sin subdominio. */
const OWN_DOMAIN = new URL(LEGACY_SITE_ORIGIN).hostname.replace(/^www\./, '')

/**
 * Si un enlace lleva a otra web (Discord, Twitch, YouTube, Ko-fi…), que se abre en otra
 * pestaña (DESIGN.md, Accessibility). Las direcciones del sitio, sus anclas y la web de
 * siempre de Torre no lo son, ni lo que no es una web (mailto:, tel:).
 */
export function isExternalHref(href: string): boolean {
  let url: URL
  try {
    url = new URL(href, LEGACY_SITE_ORIGIN)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname
  return host !== OWN_DOMAIN && !host.endsWith(`.${OWN_DOMAIN}`)
}
