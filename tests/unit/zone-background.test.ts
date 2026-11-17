import { describe, expect, it } from 'vitest'

import {
  achievementZoneQuest,
  pickBackgroundMap,
  questSubAreaId,
  watermarkCrop,
  zoneBackgroundAlt,
  ZONE_RENDER_URL,
} from '@/lib/zones/background'

describe('questSubAreaId', () => {
  it('es la subzona del primer mapa de inicio que la tiene', () => {
    expect(
      questSubAreaId({
        startPositions: [
          { mapId: 1, subAreaId: null },
          { mapId: 2, subAreaId: 95 },
        ],
        stages: [{ objectives: [{ subAreaId: 7 }] }],
      }),
    ).toBe(95)
  })

  it('sin mapa de inicio con subzona, la del primer objetivo que la tiene', () => {
    expect(
      questSubAreaId({
        startPositions: [{ mapId: 1 }],
        stages: [{ objectives: [{ subAreaId: null }] }, { objectives: [{ subAreaId: 820 }] }],
      }),
    ).toBe(820)
  })

  it('null sin misión o sin ninguna subzona', () => {
    expect(questSubAreaId(null)).toBeNull()
    expect(questSubAreaId(42)).toBeNull()
    expect(questSubAreaId({ startPositions: [], stages: [] })).toBeNull()
  })
})

describe('achievementZoneQuest', () => {
  it('es la primera misión de la primera fila que tiene una', () => {
    const first = { id: 3 }
    expect(
      achievementZoneQuest([
        { quests: [] },
        { quests: [first, { id: 4 }] },
        { quests: [{ id: 5 }] },
      ]),
    ).toBe(first)
  })

  it('ignora las misiones sin poblar y da null sin filas', () => {
    expect(achievementZoneQuest([{ quests: [12] }])).toBeNull()
    expect(achievementZoneQuest(null)).toBeNull()
  })
})

describe('pickBackgroundMap', () => {
  const maps = [
    { id: 10, outdoor: true, worldMap: 1, posX: 0, posY: 0 },
    { id: 11, outdoor: false, worldMap: -1, posX: 1, posY: 1 },
    { id: 12, outdoor: true, worldMap: 1, posX: 2, posY: 2 },
    { id: 13, outdoor: true, worldMap: 1, posX: 4, posY: 4 },
    { id: 14, outdoor: true, worldMap: 9, posX: 2, posY: 2 },
  ]

  it('respeta el mapa que pide Torre aunque sea de interior', () => {
    expect(pickBackgroundMap({ maps, requested: 11, preferred: [12] })).toBe(11)
  })

  it('prefiere el mapa de exterior donde empieza la misión de una guía publicada', () => {
    expect(pickBackgroundMap({ maps, preferred: [11, 13] })).toBe(13)
  })

  it('si no, el mapa de exterior del mundo principal más cercano al centro de la subzona', () => {
    // Centro de 10, 12 y 13: (2, 2). El 14 está en otro mapa del mundo.
    expect(pickBackgroundMap({ maps, preferred: [] })).toBe(12)
  })

  it('sin exteriores, el primer mapa; sin mapas, null', () => {
    expect(pickBackgroundMap({ maps: [maps[1]!], preferred: [] })).toBe(11)
    expect(pickBackgroundMap({ maps: [], preferred: [] })).toBeNull()
  })
})

describe('watermarkCrop', () => {
  it('recorta abajo y a la derecha la marca de DofusDB y deja el resto', () => {
    const box = watermarkCrop(1910, 970)
    expect(box.left).toBe(0)
    expect(box.top).toBe(0)
    // En un render de 1910 × 970 la marca va de 17 a 50 px del borde de abajo y de 23 a
    // 187 px del de la derecha: basta con quitar algo más de 50 px por abajo.
    expect(970 - box.height).toBeGreaterThanOrEqual(55)
    expect(1910 - box.width).toBeGreaterThan(0)
    // Lo bastante grande para un fondo de página entera.
    expect(box.width).toBeGreaterThanOrEqual(1800)
    expect(box.height).toBeGreaterThanOrEqual(880)
  })

  it('escala con renders más pequeños', () => {
    const box = watermarkCrop(955, 485)
    expect(box.width).toBeLessThan(955)
    expect(box.height).toBeLessThan(485)
    expect(box.width).toBeGreaterThan(800)
  })
})

describe('render y texto alternativo', () => {
  it('pide el render a escala 1 de DofusDB', () => {
    expect(ZONE_RENDER_URL(188746755)).toBe('https://api.dofusdb.fr/img/maps/1/188746755.jpg')
  })

  it('nombra la subzona y su área', () => {
    expect(zoneBackgroundAlt({ name: 'Ciudad de Astrub', areaName: 'Astrub' })).toBe(
      'Paisaje de Ciudad de Astrub, en Astrub',
    )
    expect(zoneBackgroundAlt({ name: 'Astrub', areaName: 'Astrub' })).toBe('Paisaje de Astrub')
    expect(zoneBackgroundAlt({ name: 'Anutropía', areaName: null })).toBe('Paisaje de Anutropía')
  })
})
