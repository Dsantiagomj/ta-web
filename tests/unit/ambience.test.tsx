import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Ambience } from '@/components/site/Ambience'
import { AMBIENCE_PARTICLES, checklistAmbience } from '@/components/site/ambience-data'

// El ambiente del sitio (DESIGN.md, Ambience): unas partículas fijas, siempre las mismas, que
// el CSS anima. Sin azar, para que el servidor pinte lo mismo en cada visita.

describe('las partículas del ambiente', () => {
  it('son catorce, fijas, repartidas por todo el ancho', () => {
    expect(AMBIENCE_PARTICLES).toHaveLength(14)
    const xs = AMBIENCE_PARTICLES.map((p) => p.x)
    expect(new Set(xs).size).toBe(xs.length)
    expect(Math.min(...xs)).toBeLessThan(15)
    expect(Math.max(...xs)).toBeGreaterThan(85)
    for (const p of AMBIENCE_PARTICLES) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(100)
      expect(p.delay).toBeGreaterThanOrEqual(0)
      expect(p.duration).toBeGreaterThanOrEqual(10)
      // De 4 a 7 px: puntos, nunca manchas que tapen el texto.
      expect(p.size).toBeGreaterThanOrEqual(0.25)
      expect(p.size).toBeLessThanOrEqual(0.4375)
    }
  })

  it('la primera mitad sale antes que la segunda: en el móvil solo van las primeras', () => {
    const half = AMBIENCE_PARTICLES.length / 2
    const xs = AMBIENCE_PARTICLES.slice(0, half).map((p) => p.x)
    // Las que quedan en el móvil también cubren de un lado al otro.
    expect(Math.min(...xs)).toBeLessThan(20)
    expect(Math.max(...xs)).toBeGreaterThan(80)
  })
})

describe('<Ambience>', () => {
  const html = renderToStaticMarkup(<Ambience />)

  it('es decoración: oculta a los lectores de pantalla y sin texto', () => {
    expect(html).toMatch(/^<div class="amb" aria-hidden="true">/)
    expect(html.replace(/<[^>]+>/g, '')).toBe('')
  })

  it('pinta cada partícula con sus datos en variables CSS, en % , s y rem', () => {
    const particles = html.match(/<i [^>]*><\/i>/g) ?? []
    expect(particles).toHaveLength(14)
    expect(particles[0]).toBe('<i style="--x:6%;--d:0s;--t:11s;--s:0.375rem"></i>')
    for (const p of particles) expect(p).not.toMatch(/px/)
  })

  it('una página lo puede cambiar por el de su checklist', () => {
    expect(renderToStaticMarkup(<Ambience fx="snow" />)).toMatch(
      /^<div class="amb amb--page" aria-hidden="true" data-fx="snow">/,
    )
  })

  it('el catálogo lo enseña dentro de una caja, con el tema de su sección', () => {
    expect(renderToStaticMarkup(<Ambience demo />)).toMatch(
      /^<div class="amb amb--demo" aria-hidden="true">/,
    )
  })
})

describe('el ambiente de cada checklist', () => {
  it('el Hielos nieva y el Silvestre tiene las luciérnagas y hojas del hub antiguo', () => {
    expect(checklistAmbience('hielos:')).toBe('snow')
    expect(checklistAmbience('silvestre:')).toBe('forest')
  })

  it('las demás, con o sin id antiguo, llevan motas del color de su Dofus', () => {
    expect(checklistAmbience('nebuloso:')).toBe('egg')
    expect(checklistAmbience('ocre:')).toBe('egg')
    expect(checklistAmbience(null)).toBe('egg')
    expect(checklistAmbience(undefined)).toBe('egg')
    expect(checklistAmbience('')).toBe('egg')
  })
})
