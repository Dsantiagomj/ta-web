import { describe, expect, it } from 'vitest'

import { metalogrosIndexView, type IndexData } from '@/lib/achievements/metalogros'
import type { Media } from '@/payload-types'

const media = (id: number, name: string) => ({
  id,
  alt: name,
  url: `/api/media/file/${name}.webp`,
  width: 80,
  height: 120,
})

const quest = (name: string, levelMin: number) => ({ name, levelMin })

function data(): IndexData {
  return {
    groups: [
      {
        id: 1,
        name: 'Sufokia',
        slug: 'metalogro-sufokia',
        section: 'zones',
        order: 34,
        state: 'published',
      },
      {
        id: 2,
        name: 'Astrub',
        slug: 'metalogro-astrub',
        section: 'zones',
        order: 13,
        state: 'published',
        representative: {
          relationTo: 'npcs',
          value: { name: 'Paula Sepe', renderRight: media(9, 'paula') },
        },
      },
      {
        id: 3,
        name: 'Misiones de templo',
        slug: 'metalogro-misiones-de-templo',
        section: 'stories',
        order: 2,
        state: 'preparing',
      },
      {
        id: 4,
        name: 'Misiones de Mundo',
        slug: 'metalogro-misiones-de-mundo',
        section: 'stories',
        order: 1,
        state: 'published',
      },
      {
        id: 5,
        name: 'Justicieros',
        slug: 'metalogro-justicieros',
        section: 'stories',
        order: 7,
        state: 'preparing',
      },
      {
        id: 6,
        name: 'Haluín',
        slug: 'metalogro-haluin',
        section: 'seasonal',
        order: 3,
        state: 'published',
      },
      {
        id: 7,
        name: 'Alineamiento',
        slug: 'metalogro-alineamiento',
        section: 'stories',
        order: 3,
        state: 'published',
        guides: [70, 71],
      },
    ],
    pages: [
      {
        id: 10,
        name: 'La ocasión hace al ladrón',
        slug: 'la-ocasion-hace-al-ladron',
        state: 'published',
        group: 2,
        achievement: { icon: media(20, 'logro-203') },
        quests: [
          { name: 'Esto hace aguas', quests: [quest('Esto hace aguas', 15)] },
          { name: 'Seis pies bajo tierra', quests: [quest('Seis pies bajo tierra', 20)] },
        ],
      },
      {
        id: 11,
        name: 'La gran biblioteca',
        slug: 'la-gran-biblioteca',
        state: 'preparing',
        group: 2,
        quests: [],
      },
      {
        id: 12,
        name: 'Capitán Amakna',
        slug: 'capitan-amakna',
        state: 'published',
        group: 5,
        quests: [],
      },
      {
        id: 13,
        name: 'Otro de Justicieros',
        slug: 'otro-justicieros',
        state: 'preparing',
        group: 5,
        quests: [],
      },
    ],
    guides: new Map([
      [70, { title: 'Entrenamiento con Tarche', slug: 'entrenamiento-con-tarche' }],
      [71, { title: 'Pan para los valientes', slug: 'pan-para-los-valientes' }],
    ]),
  }
}

describe('metalogrosIndexView', () => {
  const view = metalogrosIndexView(data())
  const zone = (name: string) =>
    view.sections.flatMap((section) => section.zones).find((z) => z.name === name)!

  it('tres grupos: historias por su orden, zonas de la A a la Z y los eventos de temporada', () => {
    expect(view.sections.map((section) => [section.key, section.zones.map((z) => z.name)])).toEqual(
      [
        ['stories', ['Misiones de Mundo', 'Misiones de templo', 'Alineamiento', 'Justicieros']],
        ['zones', ['Astrub', 'Sufokia']],
        ['seasonal', ['Haluín']],
      ],
    )
  })

  it('el ancla de cada zona es su slug sin «metalogro-»', () => {
    expect(zone('Astrub').anchor).toBe('astrub')
  })

  it('una zona sin nada publicado se ve apagada entera', () => {
    expect(zone('Misiones de templo')).toMatchObject({ off: true, preparing: true })
  })

  it('una en preparación con algún logro publicado se abre, con la etiqueta', () => {
    expect(zone('Justicieros')).toMatchObject({ off: false, preparing: true })
    expect(zone('Justicieros').achievements.map((a) => [a.name, a.href, a.off])).toEqual([
      ['Capitán Amakna', '/capitan-amakna', false],
      ['Otro de Justicieros', undefined, true],
    ])
  })

  it('los logros con su icono, «2 misiones · Niv. 15–20» y sin enlace los de En preparación', () => {
    const [ocasion, biblioteca] = zone('Astrub').achievements
    expect(ocasion).toMatchObject({
      href: '/la-ocasion-hace-al-ladron',
      meta: '2 misiones · Niv. 15–20',
    })
    expect(ocasion!.icon?.src).toBe('/api/media/file/logro-203.webp')
    expect(biblioteca).toMatchObject({ off: true })
    expect(biblioteca).not.toHaveProperty('href')
  })

  it('el arte de la ficha es el render del representante', () => {
    expect(zone('Astrub').art?.src).toBe('/api/media/file/paula.webp')
  })

  it('un recuento callado: sus logros, o sus guías si no tiene logros', () => {
    expect(zone('Astrub').count).toBe('2 logros')
    expect(zone('Alineamiento').count).toBe('2 misiones')
    expect(zone('Alineamiento').guides).toEqual([
      { name: 'Entrenamiento con Tarche', href: '/entrenamiento-con-tarche' },
      { name: 'Pan para los valientes', href: '/pan-para-los-valientes' },
    ])
  })

  it('los datos de la búsqueda: zonas, logros y misiones, con lo apagado marcado', () => {
    expect(view.search.z).toContainEqual(['Misiones de templo', 'misiones-de-templo', '', 1])
    expect(view.search.a).toContainEqual([
      'La gran biblioteca',
      'Astrub',
      '/la-gran-biblioteca',
      0,
      1,
    ])
    const ocasion = view.search.a.findIndex((a) => a[0] === 'La ocasión hace al ladrón')
    expect(view.search.q).toContainEqual(['Seis pies bajo tierra', 2, ocasion])
  })

  it('una misión se busca por el nombre que Torre dio a su fila; sin él, por el de DofusDB', () => {
    const input = data()
    input.pages[0]!.quests = [
      { name: 'El safari de almas jaras', quests: [quest('Trofeo de caza', 15)] },
      { name: '', quests: [quest('Seis pies bajo tierra', 20)] },
    ]
    const { search } = metalogrosIndexView(input)
    const ocasion = search.a.findIndex((a) => a[0] === 'La ocasión hace al ladrón')
    expect(search.q).toContainEqual(['El safari de almas jaras', 1, ocasion])
    expect(search.q).toContainEqual(['Seis pies bajo tierra', 2, ocasion])
    expect(search.q.map((row) => row[0])).not.toContain('Trofeo de caza')
  })
})

describe('la corrección de Torre en el índice de metalogros', () => {
  const torre = media(77, 'de-torre') as unknown as Media
  const zoneOf = (input: IndexData, name: string) =>
    metalogrosIndexView(input)
      .sections.flatMap((section) => section.zones)
      .find((z) => z.name === name)!

  it('el representante con la imagen de Torre; oculto, sin arte', () => {
    const fixed = data()
    const astrub = fixed.groups.find((group) => group.name === 'Astrub')!
    astrub.representative = {
      relationTo: 'npcs',
      value: { name: 'Paula Sepe', renderRight: media(9, 'paula'), correction: { image: torre } },
    }
    expect(zoneOf(fixed, 'Astrub').art?.src).toBe('/api/media/file/de-torre.webp')
    astrub.representative = {
      relationTo: 'npcs',
      value: { name: 'Paula Sepe', renderRight: media(9, 'paula'), correction: { hidden: true } },
    }
    expect(zoneOf(fixed, 'Astrub').art).toBeUndefined()
  })

  it('el icono y el nivel de cada logro, corregidos', () => {
    const fixed = data()
    const page = fixed.pages[0]!
    page.achievement = { icon: media(5, 'logro'), correction: { image: torre } }
    page.quests = [{ quests: [{ name: 'Una', levelMin: 10, correction: { level: 12 } }] }]
    const achievement = metalogrosIndexView(fixed)
      .sections.flatMap((section) => section.zones)
      .flatMap((z) => z.achievements)
      .find((a) => a.name === page.name)!
    expect(achievement.icon?.src).toBe('/api/media/file/de-torre.webp')
    expect(achievement.meta).toContain('12')
    page.quests = [{ quests: [{ name: 'Una', correction: { name: 'Una de Torre' } }] }]
    const names = metalogrosIndexView(fixed).search.q.map(([name]) => name)
    expect(names).toContain('Una de Torre')
  })
})
