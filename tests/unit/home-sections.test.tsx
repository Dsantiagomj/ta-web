import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { CHECKLISTS, section, social } from '@/components/site/nav'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const thin = '<span class="amount__th"> </span>'

describe('Qué vas a encontrar', () => {
  const markup = html(<Areas counts={{ guides: 1272, achievements: 214 }} />)
  const titles = [
    ...markup.matchAll(/<h3 class="area__t"><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/g),
  ]

  it('primero el cartel de las misiones y luego las cuatro tarjetas, con el título como enlace', () => {
    expect(markup).toMatch(/<h2[^>]*>Qué vas a encontrar<\/h2>/)
    expect(titles.map((m) => m[2])).toEqual([
      'Misiones y logros',
      'Guías de Dofus',
      'Checklists',
      'Clases',
      'Mazmorras',
    ])
  })

  it('enlaza adonde enlaza el menú', () => {
    expect(titles.map((m) => m[1])).toEqual(
      (['misiones', 'dofus', 'checklists', 'clases', 'mazmorras'] as const).map(
        (key) => section(key).href,
      ),
    )
  })

  it('las cifras del cartel salen del servidor, con el espacio fino de los miles', () => {
    expect(markup).toContain(`<span class="amount">1${thin}272</span>`)
    expect(markup).toContain('<span class="amount">214</span>')
    expect(markup).toContain(
      'logros. Búscalas por nombre, zona o historia, de Astrub al Selocalipsis.',
    )
  })

  it('con una sola guía o un solo logro, en singular', () => {
    const one = html(<Areas counts={{ guides: 1, achievements: 1 }} />)
    expect(one).toContain('</span></span> misión en <span class="fig">')
    expect(one).toContain('</span></span> logro. Búscalas')
  })

  it('cada enlace lleva su frase como descripción', () => {
    for (const id of markup.matchAll(/aria-describedby="([^"]+)"/g)) {
      expect(markup).toContain(`id="${id[1]}"`)
    }
    expect(markup.match(/aria-describedby=/g)).toHaveLength(5)
  })
})

describe('Una guía para cada misión', () => {
  const markup = html(<GuideTour />)

  it('cuatro puntos numerados y la guía de verdad con los mismos números', () => {
    expect(markup).toMatch(/<h2[^>]*>Una guía para cada misión<\/h2>/)
    expect(markup.match(/<li class="tour__step"/g)).toHaveLength(4)
    for (const n of [1, 2, 3, 4]) expect(markup).toContain(`data-part="${n}"`)
    expect(markup).toContain('Seis pies bajo tierra')
  })

  it('no carga los estilos de las guías: el chip de coordenadas es solo dibujo', () => {
    const source = readFileSync('src/components/home/GuideTour.tsx', 'utf8')
    expect(source).not.toMatch(/from '@\/components\/game\/(Coordinates|[A-Z]\w+)'/)
    expect(markup).toContain('[7,-19]')
  })

  it('los números de la guía son decorativos: el texto de los puntos lleva el sentido', () => {
    expect(markup).not.toMatch(/class="spec__mark[^"]*"(?![^>]*aria-hidden="true")/)
  })
})

describe('Checklists para ir a por tu Dofus', () => {
  const markup = html(<ChecklistsSection />)

  it('los tres checklists del menú con sus cifras', () => {
    for (const checklist of CHECKLISTS) expect(markup).toContain(`href="${checklist.href}"`)
    expect(markup).toContain('<b><span class="amount">100</span></b> pasos')
    expect(markup).toContain('<b><span class="amount">70</span></b> pasos')
    expect(markup).toContain('<b><span class="amount">337</span></b> almas')
  })
})

describe('Las guías son de Torre', () => {
  it('una sola invitación, al Discord, y los tres canales', () => {
    const markup = html(<Author live={{ live: false }} />)
    expect(markup.match(new RegExp(social('discord').href, 'g'))).toHaveLength(1)
    for (const key of ['twitch', 'kick', 'youtube'] as const) {
      expect(markup).toContain(`href="${social(key).href}"`)
    }
  })

  it('sin directo, un aviso pequeño; en directo, el titular', () => {
    expect(html(<Author live={{ live: false }} />)).toContain('Ahora no está en directo.')
    const live = html(<Author live={{ live: true }} />)
    expect(live).toContain('En directo ahora en Twitch')
    expect(live).not.toContain('Ahora no está en directo.')
  })
})
