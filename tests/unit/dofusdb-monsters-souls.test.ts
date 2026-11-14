import { describe, expect, it } from 'vitest'

import { mapDungeon, mapMonster } from '@/lib/dofusdb/map-items-monsters'

// Lo que el Ocre («La eterna cosecha») necesita de cada monstruo y mazmorra de DofusDB: los
// niveles de sus grados, si es jefe o archimonstruo y la subzona donde vive; y el nivel de cada
// mazmorra, que acota el del jefe que se lucha en ella.

describe('mapMonster', () => {
  it('lleva los niveles de sus grados, si es jefe o archimonstruo y su primera subzona', () => {
    expect(
      mapMonster({
        id: 928,
        name: { es: 'Mob Lasponja' },
        gfxId: 513,
        isBoss: true,
        isMiniBoss: false,
        subareas: [336, 12],
        grades: [{ level: 20 }, { level: 22 }],
      }),
    ).toEqual({
      dofusId: 928,
      name: 'Mob Lasponja',
      iconId: 513,
      levels: [20, 22],
      boss: true,
      archmonster: false,
      subAreaId: 336,
    })
  })

  it('sin esos datos, vacíos: nada se inventa', () => {
    expect(mapMonster({ id: 1, name: { es: 'Arakne' } })).toEqual({
      dofusId: 1,
      name: 'Arakne',
      iconId: null,
      levels: [],
      boss: false,
      archmonster: false,
      subAreaId: null,
    })
  })
})

describe('mapDungeon', () => {
  it('lleva su nivel (optimalPlayerLevel)', () => {
    expect(
      mapDungeon(
        { id: 5, name: { es: 'Castillo de Arena' }, bosses: [928], optimalPlayerLevel: 30 },
        new Map([[928, 91]]),
      ).dungeon,
    ).toEqual({ dofusId: 5, name: 'Castillo de Arena', bosses: [91], level: 30 })
    expect(mapDungeon({ id: 6, bosses: [] }, new Map()).dungeon.level).toBeNull()
  })
})
