import { describe, expect, it } from 'vitest'

import { soulLevel, soulsView, type SoulsData } from '@/lib/checklists/souls'
import type { Checklist } from '@/payload-types'

// El Ocre: las almas que pide «La eterna cosecha», de los objetivos que guarda la misión y de
// sus monstruos. Lo que hace silvestre-checklist en .build/build_cosecha.py y
// src/tools/cosecha/souls.js, sin escribir ninguna fila a mano.

const bring = (monsterId: number | null) => ({
  dofusId: monsterId ?? 0,
  kind: 'bring' as const,
  monsterId,
  text: 'Lleva 1 alma(s)',
})

const data = (overrides: Partial<SoulsData> = {}): SoulsData => ({
  checklist: {
    id: 9,
    name: 'Almas del Ocre',
    slug: 'lista-ocre',
    description: 'Las almas de la eterna cosecha.',
    kind: 'souls',
    legacy: { prefix: 'cosecha:' },
    updatedAt: '2026-11-14T00:00:00.000Z',
    dofusGuide: {
      id: 1,
      name: 'Dofus Ocre',
      slug: 'dofus-ocre',
      state: 'published',
      color: '#d88a2f',
    },
  } as unknown as Checklist,
  stages: [
    { objectives: [bring(928), bring(147)] },
    {
      objectives: [
        bring(500),
        bring(501),
        { dofusId: 9, kind: 'npc', monsterId: null, text: 'Habla' },
      ],
    },
    { objectives: [bring(null)] },
  ],
  monsters: {
    928: { name: 'Mob Lasponja', levels: [20, 30], boss: true, archmonster: false, subAreaId: 1 },
    147: {
      name: 'Jalató Real',
      levels: [30, 40, 200],
      boss: true,
      archmonster: false,
      subAreaId: 2,
    },
    500: { name: 'Pikopi', levels: [55], boss: false, archmonster: true, subAreaId: 3 },
    501: { name: 'Arakna Maja', levels: [12, 13], boss: false, archmonster: true, subAreaId: 1 },
  },
  subareas: {
    1: { name: 'Castillo de Arena', areaName: 'Astrub' },
    2: { name: 'Corte del Jalató', areaName: 'Astrub' },
    3: { name: 'Bosque', areaName: 'Amakna' },
  },
  dungeons: [
    { name: 'Castillo de Arena', level: 25, bosses: [928] },
    { name: 'Corte del Jalató Real', level: 50, bosses: [147] },
  ],
  siteUrl: 'https://torrentearcano.com',
  ...overrides,
})

describe('soulLevel', () => {
  it('el grado más alto que cabe en su mazmorra; sin mazmorra, el más alto', () => {
    expect(soulLevel([20, 30], 25)).toBe(20)
    expect(soulLevel([30, 40, 200], 50)).toBe(40)
    expect(soulLevel([12, 13], null)).toBe(13)
    // Ninguno cabe: el último, como build_cosecha.py.
    expect(soulLevel([60, 70], 50)).toBe(70)
    expect(soulLevel([], null)).toBeNull()
  })
})

describe('soulsView', () => {
  it('cada alma con su nivel, su tipo, su mazmorra, su subzona, su región y su etapa', () => {
    const view = soulsView(data())
    expect(view.souls).toEqual([
      {
        id: 928,
        name: 'Mob Lasponja',
        level: 20,
        type: 'boss',
        dungeon: 'Castillo de Arena',
        zone: 'Castillo de Arena',
        region: 'Astrub',
        stage: 1,
        search: 'mob lasponja castillo de arena castillo de arena astrub',
      },
      expect.objectContaining({
        id: 147,
        level: 40,
        type: 'boss',
        dungeon: 'Corte del Jalató Real',
        stage: 1,
      }),
      expect.objectContaining({
        id: 500,
        level: 55,
        type: 'archi',
        dungeon: null,
        region: 'Amakna',
        stage: 2,
      }),
      expect.objectContaining({
        id: 501,
        level: 13,
        type: 'archi',
        zone: 'Castillo de Arena',
        stage: 2,
      }),
    ])
  })

  it('por etapas, en el orden de la misión, y por regiones, de la que más almas tiene a la que menos', () => {
    const view = soulsView(data())
    expect(view.stages.map((group) => [group.label, group.souls])).toEqual([
      ['Etapa 1 · Jefes', [928, 147]],
      ['Etapa 2 · Archis', [500, 501]],
    ])
    // Lo que dice el panel de las etapas: su número y si son jefes o archis.
    expect(view.stages.map((group) => [group.key, group.kind])).toEqual([
      ['1', 'Jefes'],
      ['2', 'Archis'],
    ])
    expect(view.regions.map((group) => [group.label, group.souls])).toEqual([
      ['Astrub', [928, 147, 501]],
      ['Amakna', [500]],
    ])
    expect(view.counts).toEqual({ total: 4, boss: 2, archi: 2 })
  })

  it('cada región, por mazmorra (los jefes) y por subzona (los archis), de la A a la Z', () => {
    const view = soulsView(data())
    expect(
      view.regions.map((group) => [
        group.label,
        group.subgroups?.map((sub) => [sub.key, sub.label, sub.souls]),
      ]),
    ).toEqual([
      [
        'Astrub',
        [
          ['boss:Castillo de Arena', 'Castillo de Arena', [928]],
          ['boss:Corte del Jalató Real', 'Corte del Jalató Real', [147]],
          ['archi:Castillo de Arena', 'Castillo de Arena', [501]],
        ],
      ],
      ['Amakna', [['archi:Bosque', 'Bosque', [500]]]],
    ])
    // Las etapas no se parten: se enseñan enteras.
    expect(view.stages.every((group) => group.subgroups === undefined)).toBe(true)
  })

  it('un alma sin mazmorra ni subzona va a «Sin zona», al final de su región', () => {
    const view = soulsView(
      data({ monsters: { ...data().monsters, 500: { ...data().monsters[500], subAreaId: null } } }),
    )
    const none = view.regions.find((group) => group.key === 'Sin región')
    expect(none?.subgroups).toEqual([{ key: 'archi:Sin zona', label: 'Sin zona', souls: [500] }])
  })

  it('la corrección de Torre: nombre, nivel e imagen del monstruo; uno oculto no es alma', () => {
    const base = data()
    const view = soulsView({
      ...base,
      monsters: {
        ...base.monsters,
        928: { ...base.monsters[928]!, correction: { name: "Mob L'Éponge", level: 24 } },
        500: { ...base.monsters[500]!, correction: { hidden: true } },
      },
    })
    const souls = view.souls
    expect(souls.find((soul) => soul.id === 928)).toMatchObject({ name: "Mob L'Éponge", level: 24 })
    expect(souls.map((soul) => soul.id)).not.toContain(500)
    // Oculta no es lo mismo que sin datos: no cuenta como que falta.
    expect(view.missing).not.toContain(500)
  })

  it('el huevo de la cabecera con la imagen que corrigió Torre', () => {
    const base = data()
    const egg = { id: 1, url: '/media/huevo-de-torre.png', width: 64, height: 64 }
    const checklist = {
      ...base.checklist,
      dofusGuide: {
        ...(base.checklist.dofusGuide as object),
        dofus: { id: 3, name: 'Dofus Ocre', image: null, correction: { image: egg } },
      },
    } as unknown as Checklist
    expect(soulsView({ ...base, checklist }).egg?.src).toContain('huevo-de-torre')
  })

  it('lo que Torre corrige del alma en esta lista: mazmorra, subzona, región u ocultarla', () => {
    const base = data()
    const checklist = {
      ...base.checklist,
      soulOverrides: [
        {
          monster: { id: 1, dofusId: 147 },
          dungeon: 'Guarida del Jalató',
          zone: ' ',
          region: 'Amakna',
        },
        { monster: { id: 2, dofusId: 501 }, hidden: true },
        // Sin poblar no se sabe de qué alma es: no cambia nada.
        { monster: 3, dungeon: 'Ninguna' },
      ],
    } as unknown as Checklist
    const view = soulsView({ ...base, checklist })
    expect(view.souls.find((soul) => soul.id === 147)).toMatchObject({
      dungeon: 'Guarida del Jalató',
      // En blanco: la de DofusDB.
      zone: 'Corte del Jalató',
      region: 'Amakna',
    })
    expect(view.souls.map((soul) => soul.id)).not.toContain(501)
    expect(view.missing).not.toContain(501)
    expect(view.souls.find((soul) => soul.id === 147)?.search).toContain('guarida')
  })

  it('un monstruo que no está en la base no se adivina: su alma queda fuera y se cuenta', () => {
    const view = soulsView(data({ monsters: { 928: data().monsters[928] } }))
    expect(view.souls.map((soul) => soul.id)).toEqual([928])
    expect(view.missing).toEqual([147, 500, 501])
  })

  it('un monstruo que la misión pide dos veces es una sola alma, en la primera etapa que lo pide', () => {
    const view = soulsView(
      data({
        stages: [
          { objectives: [bring(928), bring(147), bring(928)] },
          { objectives: [bring(500), bring(147), bring(501)] },
        ],
      }),
    )
    expect(view.souls.map((soul) => [soul.id, soul.stage])).toEqual([
      [928, 1],
      [147, 1],
      [500, 2],
      [501, 2],
    ])
    expect(view.stages.map((group) => group.souls)).toEqual([
      [928, 147],
      [500, 501],
    ])
    expect(view.counts).toEqual({ total: 4, boss: 2, archi: 2 })
    expect(view.island.souls).toEqual([928, 147, 500, 501])
    // Uno que falta, aunque se pida dos veces, se cuenta una.
    expect(soulsView(data({ stages: [{ objectives: [bring(1), bring(1)] }] })).missing).toEqual([1])
  })

  it('un jefe de dos mazmorras no elige ninguna', () => {
    const view = soulsView(
      data({ dungeons: [...data().dungeons, { name: 'Otra mazmorra', level: 90, bosses: [928] }] }),
    )
    expect(view.souls[0]).toMatchObject({ id: 928, dungeon: null, level: 30, type: 'boss' })
  })

  it('la isla solo lleva las almas y lo que necesita la migración', () => {
    expect(soulsView(data()).island).toEqual({
      checklistId: 9,
      slug: 'lista-ocre',
      version: '2026-11-14T00:00:00.000Z',
      legacy: { prefix: 'cosecha:' },
      souls: [928, 147, 500, 501],
    })
  })

  it('la cabecera como las demás checklists: título, descripción, color y migas', () => {
    const view = soulsView(data())
    expect(view).toMatchObject({
      title: 'Almas del Ocre',
      description: 'Las almas de la eterna cosecha.',
      color: '#d88a2f',
    })
    expect(view.breadcrumb.parents.at(-1)).toEqual({ name: 'Dofus Ocre', href: '/dofus-ocre' })
  })
})
