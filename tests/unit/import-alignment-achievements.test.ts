import { describe, expect, it } from 'vitest'

import {
  alignmentLinks,
  matchAlignment,
  type AlignmentAchievement,
} from '../../scripts/import/achievements/alignment'
import type { PageBlock } from '../../scripts/import/squarespace/parse-page'

// Los bloques de /logros como los da parsePage: el título de cada metalogro en grande y,
// debajo, un bloque con un párrafo por logro, su enlace y la nota de Torre.
const heading = (text: string): PageBlock => ({
  type: 'text',
  elements: [
    {
      tag: 'p',
      html: `<p class="sqsrte-large"><strong>${text}</strong></p>`,
      text,
    },
  ],
})

const links = (...rows: [href: string, name: string, note: string][]): PageBlock => ({
  type: 'text',
  elements: rows.map(([href, name, note]) => ({
    tag: 'p',
    html: `<p><a href="${href}"><span>${name}</span></a><span> </span><span>${note}</span></p>`,
    text: `${name} ${note}`,
  })),
})

const blocks: PageBlock[] = [
  heading('Isla de Moon'),
  links(['/la-isla-de-moon', 'Una isla', '(misiones).']),
  heading('Alineamiento'),
  links(
    ['/en-guardia', 'En guardia', '(alineamiento 1 al 10).'],
    ['/logro-a-sus-ordenes', '¡A sus órdenes!', '(Orden 1: títulos).'],
  ),
  links([
    'https://www.torrentearcano.com/soy-el-capitan-de-la-nave-tengo-el-controool',
    'Soy el capitán de la nave tengo el controOol',
    '(alineamiento 61 al 70).',
  ]),
  heading('En busca y captura'),
  links(['/capturas-amakneanas', 'Capturas amakneanas', '.']),
]

describe('alignmentLinks: la lista «Alineamiento» del índice de logros de Torre', () => {
  it('lee los enlaces bajo su título hasta el siguiente título, con su slug y su nota', () => {
    expect(alignmentLinks(blocks)).toEqual([
      { name: 'En guardia', slug: 'en-guardia', note: '(alineamiento 1 al 10).' },
      { name: '¡A sus órdenes!', slug: 'logro-a-sus-ordenes', note: '(Orden 1: títulos).' },
      {
        name: 'Soy el capitán de la nave tengo el controOol',
        slug: 'soy-el-capitan-de-la-nave-tengo-el-controool',
        note: '(alineamiento 61 al 70).',
      },
    ])
  })

  it('sin el título «Alineamiento», nada', () => {
    expect(alignmentLinks(blocks.slice(0, 2))).toEqual([])
  })
})

describe('matchAlignment: cada logro de DofusDB con su página de Torre', () => {
  const achievement = (id: number, name: string): AlignmentAchievement => ({
    id,
    dofusId: 1000 + id,
    name,
  })
  const achievements = [
    achievement(1, 'En guardia'),
    achievement(2, '¡A sus órdenes!'),
    achievement(3, 'Soy el capitán de la nave tengo el controOol'),
    achievement(4, 'Servicio a la comunidad'),
  ]

  it('casa por el nombre, sin mirar mayúsculas, tildes ni signos', () => {
    const result = matchAlignment(achievements, [
      ...alignmentLinks(blocks),
      { name: 'Poner Orden', slug: 'poner-orden', note: '' },
    ])
    expect(result.matched.map(({ achievement, link }) => [achievement.id, link.slug])).toEqual([
      [1, 'en-guardia'],
      [2, 'logro-a-sus-ordenes'],
      [3, 'soy-el-capitan-de-la-nave-tengo-el-controool'],
    ])
    // Lo que no casa se dice, de los dos lados.
    expect(result.withoutTorrePage.map((row) => row.name)).toEqual(['Servicio a la comunidad'])
    expect(result.withoutAchievement.map((link) => link.slug)).toEqual(['poner-orden'])
  })

  it('un nombre repetido en la lista de Torre no casa dos veces el mismo logro', () => {
    const result = matchAlignment(achievements.slice(0, 1), [
      { name: 'En guardia', slug: 'en-guardia', note: '' },
      { name: 'En guardia', slug: 'en-guardia-2', note: '' },
    ])
    expect(result.matched).toHaveLength(1)
    expect(result.withoutAchievement.map((link) => link.slug)).toEqual(['en-guardia-2'])
  })
})
