import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Emblem } from '@/components/brand/Emblem'
import { emblemSvg, faviconSvg } from '@/components/brand/emblem-art'
import { readPalette } from '@/lib/theme/palette'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const css = readFileSync('src/styles/theme.css', 'utf8')
const palette = readPalette(css)

describe('readPalette', () => {
  it('lee los valores crudos de cada tema y modo de theme.css', () => {
    expect(Object.keys(palette)).toHaveLength(10)
    expect(palette['arcano-dark']).toMatchObject({
      bg: '#0f0d1a',
      accent: '#6fe3ff',
      ink: '#ece9ff',
    })
    expect(palette['ocre-light'].bg).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('Emblem', () => {
  it('es decorativo: aria-hidden, sin foco y sin título', () => {
    const markup = html(<Emblem />)
    expect(markup).toMatch(/^<svg [^>]*aria-hidden="true"/)
    expect(markup).toContain('focusable="false"')
    expect(markup).toContain('viewBox="0 0 64 64"')
    expect(markup).not.toContain('<title')
  })

  it('reserva su tamaño con width y height', () => {
    const markup = html(<Emblem size={36} />)
    expect(markup).toContain('width="36"')
    expect(markup).toContain('height="36"')
  })

  it('se pinta a su tamaño en rem, para crecer con la fuente raíz', () => {
    const markup = html(<Emblem size={36} />)
    expect(markup).toMatch(/^<svg [^>]*class="[^"]*size-\(--emblem\)/)
    expect(markup).toContain('style="--emblem:2.25rem"')
  })

  it('toma los colores del tema: sombrero en accent, glifo en bg y cara en ink', () => {
    const markup = html(<Emblem />)
    expect(markup).toContain('data-part="hat" class="fill-accent"')
    expect(markup).toMatch(/data-part="glyph" class="stroke-bg"/)
    expect(markup).toMatch(/data-part="eyes" class="stroke-ink"/)
    expect(markup).toContain('data-part="grin" class="fill-ink"')
    expect(markup).not.toMatch(/#[0-9a-f]{6}/i)
  })

  it('la versión simplificada solo lleva el sombrero y la sonrisa', () => {
    const markup = html(<Emblem variant="simple" />)
    expect(markup).toContain('data-part="hat"')
    expect(markup).toContain('data-part="grin"')
    expect(markup).not.toContain('data-part="glyph"')
    expect(markup).not.toContain('data-part="eyes"')
    expect(markup).toContain('data-variant="simple"')
  })

  it('suma la clase que se le pasa', () => {
    expect(html(<Emblem className="size-9" />)).toMatch(/^<svg [^>]*class="[^"]*size-9/)
  })
})

describe('emblemSvg', () => {
  const colors = { hat: '#6fe3ff', glyph: '#0f0d1a', face: '#ece9ff' }

  it('es un SVG suelto con los colores escritos y transparente sin fondo', () => {
    const svg = emblemSvg({ colors, size: 128 })
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).toContain('width="128" height="128"')
    expect(svg).toContain('fill="#6fe3ff"')
    expect(svg).toContain('stroke="#0f0d1a"')
    expect(svg).toContain('fill="#ece9ff"')
    expect(svg).not.toContain('<rect')
    expect(svg).not.toContain('<circle')
  })

  it('pone el emblema sobre una placa o un disco del color que se le da', () => {
    const tile = emblemSvg({ colors, backdrop: { shape: 'tile', color: '#0f0d1a', radius: 14 } })
    expect(tile).toContain('<rect width="64" height="64" rx="14" fill="#0f0d1a"/>')
    const disc = emblemSvg({ colors, backdrop: { shape: 'disc', color: '#0f0d1a' }, padding: 0.1 })
    expect(disc).toContain('<circle cx="32" cy="32" r="32" fill="#0f0d1a"/>')
    // El relleno encoge el emblema hacia el centro.
    expect(disc).toContain('transform="translate(6.4 6.4) scale(0.8)"')
  })

  it('la versión simplificada no lleva glifo ni ojos', () => {
    const svg = emblemSvg({ colors, variant: 'simple' })
    expect(svg).not.toContain('stroke=')
  })
})

describe('favicon', () => {
  it('es la versión simplificada sobre una placa de Arcano oscuro, y claro con el esquema claro', () => {
    const svg = faviconSvg(palette)
    const dark = palette['arcano-dark']
    const light = palette['arcano-light']
    expect(svg).toContain(`.t{fill:${dark.bg}}.h{fill:${dark.accent}}.f{fill:${dark.ink}}`)
    expect(svg).toContain(
      `@media (prefers-color-scheme:light){.t{fill:${light.bg}}.h{fill:${light.accent}}.f{fill:${light.ink}}}`,
    )
    expect(svg).toContain('<rect class="t" width="64" height="64" rx="14"/>')
    expect(svg).not.toContain('stroke')
  })

  it('el icon2.svg del repo es el que genera scripts/build-icons.ts con theme.css', () => {
    expect(readFileSync('src/app/(frontend)/icon2.svg', 'utf8')).toBe(faviconSvg(palette))
  })
})
