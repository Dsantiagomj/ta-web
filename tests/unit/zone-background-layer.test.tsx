import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ZoneBackground } from '@/components/game/ZoneBackground'

const image = {
  src: '/media/fondo-1600.webp',
  width: 1600,
  height: 769,
  avif: '/media/fondo-1600.avif',
  srcSet: [
    { src: '/media/fondo-1200.webp', width: 1200 },
    { src: '/media/fondo-1600.webp', width: 1600 },
  ],
  avifSrcSet: [
    { src: '/media/fondo-1200.avif', width: 1200 },
    { src: '/media/fondo-1600.avif', width: 1600 },
  ],
}

describe('ZoneBackground', () => {
  const markup = renderToStaticMarkup(<ZoneBackground image={image} />)

  it('es una capa decorativa: oculta a los lectores de pantalla y sin texto alternativo', () => {
    expect(markup).toMatch(/^<div class="zone-bg" aria-hidden="true">/)
    expect(markup).toContain('alt=""')
  })

  it('nunca compite con el contenido: diferida y con prioridad baja', () => {
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain('fetchPriority="low"')
    expect(markup).not.toContain('fetchPriority="high"')
  })

  it('ofrece AVIF y WebP a lo ancho de la ventana', () => {
    expect(markup).toContain('type="image/avif"')
    expect(markup).toContain('/media/fondo-1200.avif 1200w, /media/fondo-1600.avif 1600w')
    expect(markup).toContain('/media/fondo-1200.webp 1200w, /media/fondo-1600.webp 1600w')
    expect(markup.match(/sizes="100vw"/g)).toHaveLength(2)
  })
})
