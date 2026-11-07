import { describe, expect, it } from 'vitest'

import { achievementPageView, type AchievementPageData } from '@/lib/achievements/page'
import { legacyHref } from '@/lib/site/legacy'

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
        needs: { notes: '1 x Combate (solo).\nPaciencia.' },
      },
    ],
    givers: new Map([[30, { name: 'Hupe Esse', renderRight: media(30, 'hupe') }]]),
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

  it('necesitarás en total: suma las notas con cantidad de las guías publicadas', () => {
    expect(view.facts.needs.notes).toEqual([
      { quantity: 2, label: 'Combate (solo)', combat: true },
      { label: 'Paciencia', combat: false },
    ])
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
      { name: 'Metalogros', href: legacyHref('metalogros') },
      { name: 'Astrub', href: legacyHref('metalogro-astrub') },
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
