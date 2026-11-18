// La imagen al compartir un enlace (backlog S-19, DESIGN.md, Share card): qué lleva la
// tarjeta de cada página, su dirección y sus metadatos. Código puro; la pinta
// src/lib/seo/share-card-image.tsx.

import { shareStrings, type ShareCardKind } from './strings'

export type { ShareCardKind }

export interface ShareCard {
  kind: ShareCardKind
  title: string
  /** Lo que va detrás: el paisaje de la zona, bajo un velo, o el huevo del Dofus al lado. */
  art?: { kind: 'zone' | 'egg'; src: string } | null
}

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const

/**
 * Amakna oscuro, el tema por defecto (DESIGN.md, Tokens). Escritos aquí porque la tarjeta se
 * pinta fuera del CSS; tests/unit/share-card.test.ts los compara con theme.css.
 */
export const SHARE_CARD_COLORS = {
  bg: '#14110e',
  surface: '#1f1a16',
  ink: '#f6f2ea',
  ink2: '#d6cdc0',
  accent: '#b5e04a',
  line: '#3a332c',
} as const

/**
 * El velo plano de --color-bg sobre el paisaje. Más ligero que el de la página (88 %): el
 * texto de la tarjeta es grande y corto, y aun así pasa 4,5:1 sobre un mapa blanco.
 */
export const SHARE_CARD_VEIL = 0.74

/** El tamaño del título: el mayor que deja el título en tres líneas, o el mínimo y puntos. */
const TITLE_SIZES = [88, 76, 66, 56] as const
/** Lo que ocupa de media una letra de Rowdies en mayúsculas, en em. */
const ROWDIES_CAPS_EM = 0.66

export function shareTitleSize(title: string, width: number): number {
  for (const size of TITLE_SIZES) {
    const perLine = Math.floor(width / (size * ROWDIES_CAPS_EM))
    if (wrappedLines(title, perLine) <= 3) return size
  }
  return TITLE_SIZES.at(-1)!
}

/** Las líneas de un texto partido entre palabras con como mucho perLine letras por línea. */
function wrappedLines(text: string, perLine: number): number {
  let lines = 1
  let used = 0
  for (const word of text.trim().split(/\s+/)) {
    const length = word.length
    if (used === 0) used = length
    else if (used + 1 + length <= perLine) used += 1 + length
    else {
      lines += 1
      used = length
    }
    if (length > perLine) lines += Math.floor(length / perLine)
  }
  return lines
}

/** FNV-1a de 32 bits en base 36: corto, estable y sin dependencias. */
function hash(text: string): string {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value.toString(36)
}

/**
 * La versión de la tarjeta, en la URL de og:image: cambia cuando cambia lo que pinta o la fecha
 * del contenido, así WhatsApp y Discord, que guardan la imagen por su URL, piden la nueva.
 */
export function shareCardVersion(card: ShareCard, modified: string | null): string {
  return hash(JSON.stringify([card.kind, card.title, card.art?.kind, card.art?.src, modified]))
}

/** La ruta de la tarjeta de una página de /<slug>. */
export const shareCardPath = (slug: string) => `/${slug}/og`

/** La ruta de la tarjeta de la marca. */
export const BRAND_CARD_PATH = '/og'

export function shareCardAlt(card: Pick<ShareCard, 'kind' | 'title'>): string {
  return shareStrings.alt(shareStrings.kinds[card.kind], card.title)
}

/** El formato de la tarjeta: JPEG con el paisaje (una foto), PNG si es plana o con el huevo. */
export const shareCardType = (card: ShareCard) =>
  card.art?.kind === 'zone' ? 'image/jpeg' : 'image/png'

export interface ShareImage {
  url: string
  width: number
  height: number
  alt?: string
  type?: string
}

/** og:image de una página de /<slug>, relativa: metadataBase la hace absoluta. */
export function shareCardImage(slug: string, card: ShareCard, modified: string | null): ShareImage {
  return {
    url: `${shareCardPath(slug)}?v=${shareCardVersion(card, modified)}`,
    ...SHARE_CARD_SIZE,
    alt: shareCardAlt(card),
    type: shareCardType(card),
  }
}

/**
 * og:image de la portada y los índices: la imagen de «Ajustes del sitio» si Torre subió una;
 * si no, la tarjeta de la marca.
 */
export function siteShareImage(own: ShareImage | null, siteName: string): ShareImage {
  if (own) return own
  return { url: BRAND_CARD_PATH, ...SHARE_CARD_SIZE, alt: siteName, type: 'image/png' }
}
