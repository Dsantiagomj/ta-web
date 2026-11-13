import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { type ChecklistNavItem, section, social } from '@/components/site/nav'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const thin = '<span class="amount__th"> </span>'

describe('Qué vas a encontrar', () => {
  const markup = html(<Areas counts={{ guides: 1272, achievements: 214 }} />)
  const titles = [
    ...markup.matchAll(/<h3 class="area__t"><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/g),
  ]

  it('primero el cartel de las misiones y luego las cuatro tarjetas, con el título como enlace', () => {
    expect(markup).toMatch(/<h2[^>]*>Qué vas a encontrar<\/h2>/)
    expect(titles.map((m) => m[2])).toEqual(['Misiones y logros', 'Guías de Dofus', 'Checklists'])
  })

  it('enlaza adonde enlaza el menú', () => {
    expect(titles.map((m) => m[1])).toEqual(
      (['misiones', 'dofus', 'checklists'] as const).map((key) => section(key).href),
    )
  })

  it('Clases y Mazmorras son tarjetas apagadas, sin enlace, con «Próximamente»', () => {
    for (const title of ['Clases', 'Mazmorras']) {
      expect(markup).toContain(
        `<h3 class="area__t">${title} <span class="soon">Próximamente</span></h3>`,
      )
    }
    // Sin enlace no hay nada que desactivar: el «Próximamente» del título dice el estado.
    expect(markup.match(/<li class="area area--soon"/g)).toHaveLength(2)
    expect(markup).not.toContain(`href="${section('clases').href}"`)
    expect(markup).not.toContain(`href="${section('mazmorras').href}"`)
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
    expect(markup.match(/aria-describedby=/g)).toHaveLength(3)
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
  // Las mismas checklists que el menú (loadChecklistNav), en su orden.
  const checklists: ChecklistNavItem[] = [
    {
      name: 'Dofus Nebuloso',
      slug: 'checklist-nebuloso',
      href: '/checklist-nebuloso',
      description: 'Del Nebuloso, paso a paso.',
      image: { src: '/media/nebuloso.webp', size: 128 },
    },
    {
      name: 'Almas del Ocre',
      slug: 'lista-ocre',
      href: 'https://www.torrentearcano.com/lista-ocre',
      legacy: true,
      description: 'Las almas de la eterna cosecha, una a una.',
    },
    { name: 'Dofus Púrpura', slug: 'checklist-purpura' },
  ]
  const markup = html(<ChecklistsSection checklists={checklists} />)

  it('las checklists del menú, en su orden, con su frase y sin cifras', () => {
    const order = checklists.map((c) => markup.indexOf(`<span class="trio__t">${c.name}</span>`))
    expect(order.every((i) => i > 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(markup).toContain('href="/checklist-nebuloso"')
    expect(markup).toContain('Del Nebuloso, paso a paso.')
    expect(markup).not.toMatch(/\d+<\/span><\/b> (pasos|almas)/)
    expect(markup).not.toContain('class="amount"')
  })

  it('cada tarjeta lleva su slug como clave, no el nombre', () => {
    const section = ChecklistsSection({
      checklists: [
        { name: 'Dofus Ocre', slug: 'lista-ocre', href: '/lista-ocre' },
        { name: 'Dofus Ocre', slug: 'checklist-ocre', href: '/checklist-ocre' },
      ],
    })
    const keys: (string | null)[] = []
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (!node || typeof node !== 'object' || !('props' in node)) return
      const element = node as React.ReactElement<{ children?: unknown }>
      if (element.type === 'li') keys.push(element.key)
      walk(element.props.children)
    }
    walk(section)
    expect(keys).toEqual(['lista-ocre', 'checklist-ocre'])
  })

  it('una En preparación avisa de la web anterior; sin enlace, no es un enlace', () => {
    expect(markup).toContain('href="https://www.torrentearcano.com/lista-ocre"')
    expect(markup).toContain('(en preparación: se abre en la web anterior)')
    expect(markup).toMatch(/<div class="trio__off" aria-disabled="true">.*?Dofus Púrpura/)
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
