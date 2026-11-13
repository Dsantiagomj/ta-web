import { describe, expect, it } from 'vitest'

import {
  achievementPageView,
  dungeonPicks,
  guideBreadcrumb,
  type AchievementPageData,
  type NoteItemDoc,
} from '@/lib/achievements/page'

// Una imagen de Media con su archivo, como la devuelve Payload con depth.
function media(id: number, name: string) {
  return { id, alt: name, url: `/api/media/file/${name}.webp`, width: 58, height: 58 }
}

const quest = (id: number, name: string, levelMin: number, extra = {}) => ({
  id,
  name,
  levelMin,
  startPositions: [{ npcId: id * 10 }],
  prerequisites: [],
  ...extra,
})

const archi = quest(1, 'Archi y sus principios', 15)
const aguas = quest(2, 'Esto hace aguas', 15, { prerequisites: [archi] })
const seis = quest(3, 'Seis pies bajo tierra', 20, { prerequisites: [aguas] })
const cazador = quest(4, 'El cazador cazado', 25)

const sibling = (id: number, name: string, slug: string, state: 'published' | 'preparing') => ({
  id,
  name,
  slug,
  state,
  achievement: { icon: media(id + 100, `logro-${id}`) },
  quests: [{ quests: [{ levelMin: 15 }] }, { quests: [{ levelMin: 30 }] }],
})

function data(overrides: Partial<AchievementPageData['page']> = {}): AchievementPageData {
  return {
    page: {
      id: 2,
      name: 'La ocasión hace al ladrón',
      slug: 'la-ocasion-hace-al-ladron',
      state: 'published',
      points: 10,
      quests: [
        { name: 'Esto hace aguas', quests: [aguas] },
        { name: 'Seis pies bajo tierra', quests: [seis] },
        { name: 'El cazador cazado', quests: [cazador] },
      ],
      rewards: {
        experience: 102_128,
        kamas: 1_105,
        items: [{ item: { id: 9, name: 'Piel pachucha', image: media(9, 'piel') }, quantity: 1 }],
      },
      achievement: {
        icon: media(1, 'logro-203'),
        countsFor: [
          { name: 'Periplo astrubiense', points: 20, achievements: 6, icon: media(2, 'logro-82') },
        ],
      },
      group: { name: 'Astrub', slug: 'metalogro-astrub' },
      ...overrides,
    },
    siblings: [
      sibling(1, 'Un ciudadano modelo', 'un-ciudadano-modelo', 'published'),
      sibling(2, 'La ocasión hace al ladrón', 'la-ocasion-hace-al-ladron', 'published'),
      sibling(3, 'La gran biblioteca', 'la-gran-biblioteca', 'preparing'),
    ],
    guides: [
      { questId: 1, slug: 'archi-y-sus-principios', needs: null },
      { questId: 2, slug: 'esto-hace-aguas', needs: { notes: '1 x Combate (solo).' } },
      {
        questId: 3,
        slug: 'seis-pies-bajo-tierra',
        needs: {
          notes: '1 x Combate (solo).\nPaciencia.',
          items: [{ item: { id: 5, name: 'Pico de tofu', image: media(5, 'pico') }, quantity: 2 }],
        },
      },
    ],
    givers: new Map([[30, { name: 'Hupe Esse', renderRight: media(30, 'hupe') }]]),
    noteItems: new Map(),
    dungeonBosses: new Map(),
    siteUrl: 'https://torrentearcano.com',
  }
}

describe('achievementPageView', () => {
  const view = achievementPageView(data())

  it('la cabecera: icono, título y «3 misiones - Niveles 15 a 25 - 10 puntos»', () => {
    expect(view.title).toBe('La ocasión hace al ladrón')
    expect(view.icon?.src).toBe('/api/media/file/logro-203.webp')
    expect(view.meta).toEqual(['3 misiones', 'Niveles 15 a 25', '10 puntos'])
  })

  it('prerrequisitos: las misiones previas de fuera del logro, enlazadas a su guía', () => {
    expect(view.facts.prerequisites).toEqual([
      { label: 'Archi y sus principios', href: '/archi-y-sus-principios', quest: true },
    ])
  })

  it('necesitarás en total: suma lo que piden las guías publicadas, con cantidad', () => {
    expect(view.needs.tasks).toEqual([{ quantity: 2, label: 'Combate (solo)', kind: 'combat' }])
    expect(view.needs.others).toEqual([{ label: 'Paciencia' }])
    expect(view.needs.items.map(({ item, quantity }) => [item.name, quantity])).toEqual([
      ['Pico de tofu', 2],
    ])
  })

  it('necesitarás en total: una nota que nombra un objeto del total se suma a ese objeto', () => {
    // Una guía enlaza el objeto y otra lo escribe como nota: sale una vez, con todo sumado,
    // venga antes la nota o el objeto, y aunque cambien las mayúsculas o las tildes.
    const dragopavo = { id: 6, name: 'Dragopavo pelirrojo', image: media(6, 'dragopavo') }
    const intestino = { id: 7, name: 'Intestino de araknáusea' }
    const view = achievementPageView({
      ...data(),
      guides: [
        {
          questId: 2,
          slug: 'esto-hace-aguas',
          needs: {
            notes: '2 x Dragopavo pelirrojo.\n1 x Combate (solo).\n3 x intestino de araknausea.',
          },
        },
        {
          questId: 3,
          slug: 'seis-pies-bajo-tierra',
          needs: {
            items: [
              { item: dragopavo, quantity: 1 },
              { item: intestino, quantity: 1 },
            ],
          },
        },
        { questId: 4, slug: 'el-cazador-cazado', needs: { notes: '1 x  Dragopavo Pelirrojo ' } },
      ],
    })
    expect(view.needs.items.map(({ item, quantity }) => [item.name, quantity])).toEqual([
      ['Dragopavo pelirrojo', 4],
      ['Intestino de araknáusea', 4],
    ])
    expect(view.needs.tasks).toEqual([{ quantity: 1, label: 'Combate (solo)', kind: 'combat' }])
  })

  it('necesitarás en total: las notas sin cantidad también salen, tal como las escribió Torre', () => {
    // Favores encadenados: nada de lo que Torre escribe en Necesitarás se pierde en el total.
    const view = achievementPageView({
      ...data(),
      guides: [
        {
          questId: 2,
          slug: 'esto-hace-aguas',
          needs: {
            notes:
              'Algunos combates aleatorios contra monstruos de un nivel parecido al tuyo.\n1 kama\n3 x Combates realizables en grupo.',
          },
        },
        {
          questId: 3,
          slug: 'seis-pies-bajo-tierra',
          needs: { notes: 'Hechizo Captura de almas.\n1 kama' },
        },
      ],
    })
    expect(view.needs.tasks).toEqual([
      {
        label: 'Algunos combates aleatorios contra monstruos de un nivel parecido al tuyo',
        kind: 'combat',
      },
      { quantity: 3, label: 'Combates realizables en grupo', kind: 'combat' },
    ])
    expect(view.needs.others).toEqual([{ label: '1 kama' }, { label: 'Hechizo Captura de almas' }])
  })

  it('necesitarás en total: objetos, combates y mazmorras, y otros, sin perder nada', () => {
    // Favores encadenados: dos notas nombran objetos del juego tal cual; una mazmorra.
    const piedra = {
      id: 9,
      name: 'Piedra de alma mediana',
      image: media(9, 'piedra'),
    } as unknown as NoteItemDoc
    const view = achievementPageView({
      ...data(),
      guides: [
        {
          questId: 3,
          slug: 'seis-pies-bajo-tierra',
          needs: {
            notes: [
              '3 x Combates realizables en grupo.',
              '1 x Piedra de alma mediana.',
              '1 x Mazmorra Malefíscof',
              'Hechizo Captura de almas.',
              'Llave de la Fábrica de Malefíscof',
            ].join('\n'),
            items: [
              { item: { id: 5, name: 'Pico de tofu', image: media(5, 'pico') }, quantity: 2 },
            ],
          },
        },
      ],
      noteItems: new Map<string, NoteItemDoc>([
        ['Piedra de alma mediana', piedra],
        [
          'Llave de la Fábrica de Malefíscof',
          { id: 10, name: 'Llave de la Fábrica de Malefíscof' },
        ],
      ]),
    })
    expect(view.needs.items.map(({ item, quantity }) => [item.name, quantity])).toEqual([
      ['Pico de tofu', 2],
      ['Piedra de alma mediana', 1],
      ['Llave de la Fábrica de Malefíscof', undefined],
    ])
    expect(view.needs.items[1]?.item.icon?.src).toBe('/api/media/file/piedra.webp')
    expect(view.needs.tasks).toEqual([
      { quantity: 3, label: 'Combates realizables en grupo', kind: 'combat' },
      { quantity: 1, label: 'Mazmorra Malefíscof', kind: 'dungeon' },
    ])
    expect(view.needs.others).toEqual([{ label: 'Hechizo Captura de almas' }])
    // La cabecera ya no lleva Necesitarás: es su propia zona.
    expect(view.facts).not.toHaveProperty('needs')
  })

  it('necesitarás en total: cada mazmorra con su jefe; la que no se casa, con el icono genérico', () => {
    const view = achievementPageView({
      ...data(),
      guides: [
        {
          questId: 3,
          slug: 'seis-pies-bajo-tierra',
          needs: {
            // Con otra capitalización, la misma fila y el mismo jefe.
            notes: [
              '1 x Mazmorra Kumijo',
              '1 x MAZMORRA KUMIJO',
              '1 x Mazmorra de Grunob',
              'Mazmorras nivel 200',
              '1 x Combates solitarios',
            ].join('\n'),
          },
        },
      ],
      // Los jefes con imagen de las mazmorras casadas, por la clave de la nota
      // (readDungeonBosses). Grunob no está: su jefe no tiene imagen.
      dungeonBosses: new Map([['mazmorra kumijo', media(61, 'kumijo')]]),
    })
    expect(view.needs.tasks).toEqual([
      {
        quantity: 2,
        label: 'Mazmorra Kumijo',
        kind: 'dungeon',
        boss: expect.objectContaining({ src: '/api/media/file/kumijo.webp' }),
      },
      { quantity: 1, label: 'Mazmorra de Grunob', kind: 'dungeon' },
      { label: 'Mazmorras nivel 200', kind: 'dungeon' },
      { quantity: 1, label: 'Combates solitarios', kind: 'combat' },
    ])
  })

  describe('dungeonPicks: las mazmorras que Torre elige a mano para sus notas', () => {
    const guide = (
      notes: string,
      dungeons: { note: string; dungeon: number | { id: number } }[],
    ) => ({
      needs: { notes, dungeons },
    })

    it('por la clave de la nota, sin cantidad ni punto final ni mayúsculas', () => {
      const picks = dungeonPicks([
        guide('1 x Mazmorra Ben Ripata.', [{ note: '1 x Mazmorra Ben Ripata.', dungeon: 7 }]),
        guide('1 x Mazmorra Reina de Ladrones.', [
          { note: 'MAZMORRA reina de ladrones', dungeon: { id: 8 } },
        ]),
      ])
      expect(picks).toEqual(
        new Map([
          ['mazmorra ben ripata', 7],
          ['mazmorra reina de ladrones', 8],
        ]),
      )
    })

    it('dos guías que eligen lo mismo cuentan una vez; si eligen distinto, ninguna', () => {
      const same = guide('1 x Mazmorra Ben Ripata.', [{ note: 'Mazmorra Ben Ripata', dungeon: 7 }])
      const other = guide('Mazmorra Ben Ripata', [{ note: 'Mazmorra Ben Ripata', dungeon: 9 }])
      expect(dungeonPicks([same, same])).toEqual(new Map([['mazmorra ben ripata', 7]]))
      expect(dungeonPicks([same, other])).toEqual(new Map())
    })

    it('sin elecciones, nada', () => {
      expect(dungeonPicks([{ needs: { notes: '1 x Mazmorra Kumijo' } }, { needs: null }])).toEqual(
        new Map(),
      )
    })
  })

  describe('necesitarás en total: un objeto nombrado sin cantidad y con ella', () => {
    // Una guía nombra el objeto sin cantidad y otra pide una cantidad: la cantidad pedida
    // se queda, venga primero una u otra.
    const piedra = { id: 9, name: 'Piedra de alma mediana' } as unknown as NoteItemDoc
    const needs = (first: string, second: string) =>
      achievementPageView({
        ...data(),
        guides: [
          { questId: 2, slug: 'esto-hace-aguas', needs: { notes: first } },
          { questId: 3, slug: 'seis-pies-bajo-tierra', needs: { notes: second } },
        ],
        noteItems: new Map([['Piedra de alma mediana', piedra]]),
      }).needs.items.map(({ item, quantity }) => [item.name, quantity])

    it('primero sin cantidad, después con ella', () => {
      expect(needs('Piedra de alma mediana', '2 x Piedra de alma mediana')).toEqual([
        ['Piedra de alma mediana', 2],
      ])
    })

    it('primero con cantidad, después sin ella', () => {
      expect(needs('2 x Piedra de alma mediana', 'Piedra de alma mediana')).toEqual([
        ['Piedra de alma mediana', 2],
      ])
    })

    // Dos notas con cantidad que solo cambian en mayúsculas o tildes se suman en una fila;
    // si una escribe el nombre exacto, la fila es el objeto, sea la primera o la segunda.
    it('con cantidad y otra capitalización, en cualquier orden', () => {
      const expected = [['Piedra de alma mediana', 3]]
      expect(needs('1 x Piedra de alma mediana', '2 x piedra de alma mediana')).toEqual(expected)
      expect(needs('2 x piedra de alma mediana', '1 x Piedra de alma mediana')).toEqual(expected)
    })
  })

  it('recompensas del logro: XP de nivel 200, kamas y la bolsa', () => {
    expect(view.facts.rewards).toMatchObject({ xp: { max: 102_128 }, kamas: 1_105 })
    expect(view.facts.rewards.items.map(({ item }) => item.name)).toEqual(['Piel pachucha'])
  })

  it('las misiones en orden; sin guía publicada, sin enlace', () => {
    expect(view.quests.map((card) => [card.position, card.level, card.title, card.href])).toEqual([
      [1, 15, 'Esto hace aguas', '/esto-hace-aguas'],
      [2, 20, 'Seis pies bajo tierra', '/seis-pies-bajo-tierra'],
      [3, 25, 'El cazador cazado', undefined],
    ])
    expect(view.quests[1]!.giver?.src).toBe('/api/media/file/hupe.webp')
  })

  it('una fila con alternativas lleva su nombre, sin enlace y con el nivel más bajo', () => {
    const clase = achievementPageView(
      data({
        quests: [
          { name: 'Misión de clase', quests: [quest(7, 'Yopuka', 20), quest(8, 'Ocra', 18)] },
        ],
      }),
    )
    expect(clase.quests).toEqual([{ position: 1, level: 18, title: 'Misión de clase' }])
  })

  it('el metalogro: sus logros en orden, el actual marcado, los de En preparación apagados', () => {
    expect(view.group?.name).toBe('Astrub')
    expect(
      view.group?.items.map((item) => [item.name, item.href, item.current, item.disabled]),
    ).toEqual([
      ['Un ciudadano modelo', '/un-ciudadano-modelo', false, false],
      ['La ocasión hace al ladrón', undefined, true, false],
      ['La gran biblioteca', undefined, false, true],
    ])
    expect(view.group?.items[0]).toMatchObject({ quests: 2, levels: 'Niveles 15 a 30' })
  })

  it('el logro anterior y el siguiente; el siguiente, en preparación, va apagado', () => {
    expect(view.previous).toMatchObject({
      name: 'Un ciudadano modelo',
      href: '/un-ciudadano-modelo',
    })
    expect(view.next).toMatchObject({ name: 'La gran biblioteca', disabled: true })
    expect(view.next).not.toHaveProperty('href')
  })

  it('cuenta para: los logros del juego que lo piden', () => {
    expect(view.countsFor).toEqual([
      {
        name: 'Periplo astrubiense',
        points: 20,
        achievements: 6,
        icon: expect.objectContaining({ src: '/api/media/file/logro-82.webp' }),
      },
    ])
  })

  it('las migas: solo los padres, con la página actual en el JSON-LD', () => {
    expect(view.breadcrumb.parents).toEqual([
      { name: 'Metalogros', href: '/metalogros' },
      { name: 'Astrub', href: '/metalogros#astrub' },
    ])
    expect(view.breadcrumb.jsonLd.itemListElement.at(-1)).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'La ocasión hace al ladrón',
      item: 'https://torrentearcano.com/la-ocasion-hace-al-ladron',
    })
  })

  it('sin metalogro, las migas solo llevan el índice y no hay columna', () => {
    const alone = achievementPageView({ ...data({ group: null }), siblings: [] })
    expect(alone.breadcrumb.parents).toHaveLength(1)
    expect(alone.group).toBeNull()
    expect(alone.previous).toBeNull()
  })
})

describe('guideBreadcrumb', () => {
  const found = {
    page: { name: 'La ocasión hace al ladrón', slug: 'la-ocasion-hace-al-ladron', published: true },
    group: { name: 'Astrub', slug: 'metalogro-astrub' },
    position: 2,
    total: 3,
  }
  const guide = { title: 'Seis pies bajo tierra', slug: 'seis-pies-bajo-tierra' }

  it('los padres de la guía: el índice, el metalogro y su logro', () => {
    const crumbs = guideBreadcrumb(found, guide, 'https://torrentearcano.com')
    expect(crumbs!.parents).toEqual([
      { name: 'Metalogros', href: '/metalogros' },
      { name: 'Astrub', href: '/metalogros#astrub' },
      { name: 'La ocasión hace al ladrón', href: '/la-ocasion-hace-al-ladron' },
    ])
    expect(crumbs!.jsonLd.itemListElement.map((item) => item.item)).toEqual([
      'https://torrentearcano.com/metalogros',
      'https://torrentearcano.com/metalogros#astrub',
      'https://torrentearcano.com/la-ocasion-hace-al-ladron',
      'https://torrentearcano.com/seis-pies-bajo-tierra',
    ])
  })

  it('un logro En preparación no tiene página: las migas acaban en el metalogro', () => {
    const crumbs = guideBreadcrumb(
      { ...found, page: { ...found.page, published: false } },
      guide,
      'https://torrentearcano.com',
    )
    expect(crumbs!.parents.map((crumb) => crumb.name)).toEqual(['Metalogros', 'Astrub'])
  })

  it('sin logro, sin migas', () => {
    expect(guideBreadcrumb(null, guide, 'https://torrentearcano.com')).toBeNull()
  })
})
