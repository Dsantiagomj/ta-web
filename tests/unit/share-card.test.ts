import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import {
  SHARE_CARD_COLORS,
  SHARE_CARD_SIZE,
  SHARE_CARD_VEIL,
  shareCardAlt,
  shareCardImage,
  shareCardPath,
  shareCardVersion,
  shareTitleSize,
  siteShareImage,
  type ShareCard,
} from '@/lib/seo/share-card'
import { readPalette } from '@/lib/theme/palette'

// La imagen al compartir (backlog S-19, DESIGN.md, Share card): 1200 × 630, el título, la
// clase de página, la marca y los colores de Amakna oscuro; detrás, el paisaje de la zona o el
// huevo del Dofus.

const quest: ShareCard = {
  kind: 'quest',
  title: 'La ocasión hace al ladrón',
  art: { kind: 'zone', src: '/api/media/file/astrub-1600.webp' },
}

describe('shareCardVersion', () => {
  it('es la misma para la misma tarjeta y la misma fecha', () => {
    expect(shareCardVersion(quest, '2026-11-18')).toBe(shareCardVersion({ ...quest }, '2026-11-18'))
  })

  it('cambia con el título, el fondo o la fecha del contenido', () => {
    const base = shareCardVersion(quest, '2026-11-18')
    expect(shareCardVersion({ ...quest, title: 'Otra' }, '2026-11-18')).not.toBe(base)
    expect(shareCardVersion({ ...quest, art: null }, '2026-11-18')).not.toBe(base)
    expect(shareCardVersion(quest, '2026-11-19')).not.toBe(base)
  })

  it('es corta y va bien en una URL', () => {
    expect(shareCardVersion(quest, null)).toMatch(/^[0-9a-z]{4,8}$/)
  })
})

describe('shareCardImage', () => {
  it('apunta a /<slug>/og con la versión, a 1200 × 630, con su texto alternativo', () => {
    expect(shareCardImage('la-ocasion', quest, '2026-11-18')).toEqual({
      url: `/la-ocasion/og?v=${shareCardVersion(quest, '2026-11-18')}`,
      width: 1200,
      height: 630,
      alt: 'Misión: La ocasión hace al ladrón. Torrente Arcano',
      type: 'image/jpeg',
    })
  })

  it('una tarjeta plana o con huevo es PNG; con paisaje, JPEG', () => {
    expect(shareCardImage('x', { kind: 'checklist', title: 'Rush' }, null).type).toBe('image/png')
    expect(
      shareCardImage(
        'x',
        { kind: 'dofus', title: 'Dofus Ocre', art: { kind: 'egg', src: '/e' } },
        null,
      ).type,
    ).toBe('image/png')
  })

  it('shareCardPath es la ruta sin versión', () => {
    expect(shareCardPath('la-ocasion')).toBe('/la-ocasion/og')
  })
})

describe('shareCardAlt', () => {
  it('nombra la clase de página y la marca', () => {
    expect(shareCardAlt({ kind: 'dofus', title: 'Dofus Ocre' })).toBe(
      'Guía de Dofus: Dofus Ocre. Torrente Arcano',
    )
    expect(shareCardAlt({ kind: 'achievement', title: 'Astrub' })).toBe(
      'Logro: Astrub. Torrente Arcano',
    )
    expect(shareCardAlt({ kind: 'checklist', title: 'Rush' })).toBe(
      'Checklist: Rush. Torrente Arcano',
    )
    expect(shareCardAlt({ kind: 'page', title: 'Emotes' })).toBe('Página: Emotes. Torrente Arcano')
  })
})

describe('siteShareImage', () => {
  it('la imagen de «Ajustes del sitio» gana a la tarjeta de la marca', () => {
    const own = { url: 'https://cdn.example/compartir.jpg', width: 1200, height: 630, alt: 'Torre' }
    expect(siteShareImage(own, 'Torrente Arcano')).toEqual(own)
  })

  it('sin ella, la tarjeta de la marca en /og', () => {
    expect(siteShareImage(null, 'Torrente Arcano')).toEqual({
      url: '/og',
      width: 1200,
      height: 630,
      alt: 'Torrente Arcano',
      type: 'image/png',
    })
  })
})

describe('shareTitleSize', () => {
  const width = SHARE_CARD_SIZE.width - 2 * 72

  it('un título corto va grande', () => {
    expect(shareTitleSize('Emotes', width)).toBe(88)
  })

  it('cuanto más largo, más pequeño, sin bajar del mínimo', () => {
    const sizes = [
      'La ocasión hace al ladrón',
      'Las misiones de la isla de Frigost y su segunda parte',
      'Un título larguísimo que no cabe en tres líneas ni con la letra más pequeña de la tarjeta, de ninguna manera',
    ].map((title) => shareTitleSize(title, width))
    expect(sizes[0]).toBeGreaterThanOrEqual(sizes[1]!)
    expect(sizes[1]).toBeGreaterThanOrEqual(sizes[2]!)
    expect(sizes[2]).toBe(56)
  })

  it('con menos ancho (el huevo al lado), antes baja', () => {
    expect(shareTitleSize('Las misiones de la isla de Frigost', 600)).toBeLessThan(
      shareTitleSize('Las misiones de la isla de Frigost', width),
    )
  })
})

describe('colores de la tarjeta', () => {
  const amakna = readPalette(readFileSync('src/styles/theme.css', 'utf8'))['amakna-dark']

  it('son los de Amakna oscuro, el tema por defecto', () => {
    expect(SHARE_CARD_COLORS).toEqual({
      bg: amakna.bg,
      surface: amakna.surface,
      ink: amakna.ink,
      ink2: amakna['ink-2'],
      accent: amakna.accent,
      line: amakna.line,
    })
  })

  // Sobre el paisaje, el texto va sobre la mezcla del velo y el mapa: blanco, gris o negro.
  const rgb = (hex: string) => [0, 2, 4].map((at) => parseInt(hex.slice(1 + at, 3 + at), 16))
  const over = (map: string) =>
    `#${rgb(SHARE_CARD_COLORS.bg)
      .map((channel, index) =>
        Math.round(channel * SHARE_CARD_VEIL + rgb(map)[index]! * (1 - SHARE_CARD_VEIL))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`

  it.each(['#ffffff', '#808080', '#000000'])(
    'el texto pasa 4,5:1 sobre el velo y un mapa %s',
    (map) => {
      const back = over(map)
      expect(contrastRatio(SHARE_CARD_COLORS.ink, back)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(SHARE_CARD_COLORS.ink2, back)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(SHARE_CARD_COLORS.accent, back)).toBeGreaterThanOrEqual(4.5)
    },
  )
})
