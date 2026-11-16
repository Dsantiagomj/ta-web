import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { type ChecklistNavItem, section, social } from '@/components/site/nav'
import { resolveNavigation } from '@/lib/site-copy/navigation'
import { resolveIndexTexts, resolveSiteSettings } from '@/lib/site-copy/resolve'

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

  it('sigue la navegación de Torre: sin la sección oculta y con su «Próximamente»', () => {
    const { sections } = resolveNavigation({
      sections: [
        { key: 'dofus', visible: false },
        { key: 'clases', soon: false },
      ],
    })
    const custom = html(<Areas counts={{ guides: 2, achievements: 1 }} sections={sections} />)
    expect(custom).not.toContain('Guías de Dofus')
    expect(custom).toContain(`href="${section('clases').href}"`)
    expect(custom.match(/<li class="area area--soon"/g)).toHaveLength(1)
    expect(
      html(
        <Areas
          counts={{ guides: 2, achievements: 1 }}
          sections={resolveNavigation(null).sections}
        />,
      ),
    ).toBe(html(<Areas counts={{ guides: 2, achievements: 1 }} />))
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

// Portada e índices (src/globals/IndexTexts.ts): lo que Torre escribe en el panel sale en la portada.
describe('la portada con los textos de Torre', () => {
  const texts = resolveIndexTexts({
    home: {
      areas: { title: 'Lo que hay', questsText: 'Otra frase.', dofusText: 'Otra de Dofus.' },
      tour: { title: 'Así es', step2: { title: 'Copiar', text: 'Un clic.' }, more: 'Ir' },
      checklists: { title: 'Listas', lead: 'Otra entradilla.' },
      author: { title: 'De Torre', join: 'Ven al Discord', offlineTitle: 'Descansando.' },
    },
  })
  const settings = resolveSiteSettings({
    socials: { discord: { url: 'https://discord.gg/otro' }, kick: { handle: 'otro' } },
  })

  it('Qué vas a encontrar', () => {
    const markup = html(<Areas counts={{ guides: 2, achievements: 1 }} texts={texts.home.areas} />)
    expect(markup).toMatch(/<h2[^>]*>Lo que hay<\/h2>/)
    expect(markup).toContain(' logro. Otra frase.')
    expect(markup).toContain('Otra de Dofus.')
  })

  it('Una guía para cada misión', () => {
    const markup = html(<GuideTour texts={texts.home.tour} />)
    expect(markup).toMatch(/<h2[^>]*>Así es<\/h2>/)
    expect(markup).toContain('<h3>Copiar</h3><p>Un clic.</p>')
    expect(markup).toContain('<h3>Lo que hace falta, arriba del todo</h3>')
    expect(markup).toMatch(/>Ir<svg/)
  })

  it('las checklists', () => {
    const markup = html(
      <ChecklistsSection
        checklists={[{ name: 'Ocre', slug: 'ocre' }]}
        texts={texts.home.checklists}
      />,
    )
    expect(markup).toMatch(/<h2[^>]*>Listas<\/h2>/)
    expect(markup).toContain('Otra entradilla.')
  })

  it('Torre, con sus redes', () => {
    const markup = html(
      <Author live={{ live: false }} texts={texts.home.author} socials={settings.socials} />,
    )
    expect(markup).toMatch(/<h2[^>]*>De Torre<\/h2>/)
    expect(markup).toContain('Ven al Discord')
    expect(markup).toContain('<strong>Descansando.</strong> Emite en Twitch y en Kick')
    expect(markup).toContain('href="https://discord.gg/otro"')
    expect(markup).toContain('otro · directos')
  })

  it('sin textos guardados, la portada de siempre', () => {
    const plain = resolveIndexTexts(null).home
    expect(html(<GuideTour texts={plain.tour} />)).toBe(html(<GuideTour />))
    expect(html(<Author live={{ live: false }} texts={plain.author} />)).toBe(
      html(<Author live={{ live: false }} />),
    )
  })
})
