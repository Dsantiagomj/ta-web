import { describe, expect, it } from 'vitest'

import {
  achievementExperience,
  achievementRewards,
  countsForIndex,
  mapAchievement,
  mapAchievementCategory,
  objectiveQuestIds,
} from '@/lib/dofusdb/map-achievement'
import type { RawAchievement, RawAchievementCategory } from '@/lib/dofusdb/types'

import categories from '../fixtures/dofusdb/achievement-categories.json'
import achievements from '../fixtures/dofusdb/achievements.json'

const ALL = achievements as RawAchievement[]

function achievement(id: number): RawAchievement {
  const found = ALL.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta el logro ${id} en los fixtures`)
  return structuredClone(found)
}

describe('objectiveQuestIds', () => {
  it('lee la misión de un objetivo «terminar la misión»', () => {
    expect(objectiveQuestIds('(Qf=1975)')).toEqual([1975])
    expect(objectiveQuestIds('Qf=2136')).toEqual([2136])
    expect(objectiveQuestIds('Qf=2439&SC=1')).toEqual([2439])
    expect(objectiveQuestIds('(QF>600,0)')).toEqual([600])
  })

  it('lee las alternativas de un objetivo: se hace una de ellas', () => {
    expect(objectiveQuestIds('(Qf=1841|Qf=1677|Qf=1615)')).toEqual([1841, 1677, 1615])
  })

  it('no lee misiones de otros objetivos: logros, niveles, monstruos, PNJ', () => {
    for (const criterion of ['(OA=1671)', 'PL>29', '(EM>147,0,d)', '(BI=1)', '', null]) {
      expect(objectiveQuestIds(criterion)).toEqual([])
    }
  })
})

describe('achievementExperience', () => {
  // La fórmula del cliente para un personaje de nivel 200 (30 % del nivel del logro y 70 %
  // del tope en 1,5 veces), más el 5 % que suman las páginas de Torre.
  it('da las cifras de las páginas de Torre', () => {
    expect(achievementExperience(30, 2)).toBe(143_592) // El hábitat urbano
    expect(achievementExperience(40, 2)).toBe(254_268) // La gran biblioteca
    expect(achievementExperience(100, 1)).toBe(1_023_750) // Pan Koko Mío
    expect(achievementExperience(25, 2)).toBe(102_128) // Una cuestión profunda
  })

  it('sin ratio, sin XP', () => {
    expect(achievementExperience(40, 0)).toBe(0)
  })
})

describe('achievementRewards', () => {
  it('suma XP, kamas y objetos de La ocasión hace al ladrón (1671)', () => {
    expect(achievementRewards(achievement(1671))).toEqual({
      experience: 102_128,
      kamas: 1_105,
      items: [
        { dofusId: 1681, quantity: 1 },
        { dofusId: 2467, quantity: 1 },
        { dofusId: 2574, quantity: 1 },
      ],
    })
  })

  it('con recompensas por tramos de nivel, solo cuenta el del nivel 200 (Sello de temporada)', () => {
    const rewards = achievementRewards(achievement(982))
    expect(rewards.items.map((item) => item.dofusId)).toEqual([
      12451, 12431, 12443, 12439, 12435, 12447,
    ])
  })
})

describe('mapAchievement', () => {
  const counts = countsForIndex(ALL)

  it('guarda una fila por objetivo de misión, en el orden del juego', () => {
    const mapped = mapAchievement(achievement(1671), counts)
    expect(mapped).toMatchObject({
      dofusId: 1671,
      name: 'La ocasión hace al ladrón',
      iconId: 203,
      points: 10,
      level: 25,
      order: 9,
      categoryDofusId: 45,
      quests: [
        { name: 'Esto hace aguas', questDofusIds: [1975] },
        { name: 'Seis pies bajo tierra', questDofusIds: [1976] },
        { name: 'El cazador cazado', questDofusIds: [1977] },
      ],
    })
  })

  it('cuenta las alternativas como una misión: Un ciudadano modelo tiene 6, no 24', () => {
    const mapped = mapAchievement(achievement(1678), counts)
    expect(mapped.quests).toHaveLength(6)
    expect(mapped.quests[3]).toEqual({
      name: 'Misión de clase',
      questDofusIds: expect.arrayContaining([1841, 1677, 2470]),
    })
    expect(mapped.quests[3]!.questDofusIds).toHaveLength(19)
  })

  it('un metalogro del juego no tiene misiones', () => {
    expect(mapAchievement(achievement(1677), counts).quests).toEqual([])
  })

  it('cuenta para los logros del juego que lo piden, también a través de otro', () => {
    expect(mapAchievement(achievement(1671), counts).countsFor).toEqual([
      { dofusId: 1677, name: 'Periplo astrubiense', points: 20, achievements: 6, iconId: 82 },
      { dofusId: 1679, name: 'De Incarnam a Astrub', points: 30, achievements: 4, iconId: 459 },
    ])
    expect(mapAchievement(achievement(1678), counts).countsFor.map((m) => m.dofusId)).toEqual([
      1679,
    ])
  })
})

describe('mapAchievementCategory', () => {
  it('guarda el nombre, la categoría madre y el orden', () => {
    const astrub = (categories as RawAchievementCategory[]).find((c) => c.id === 45)!
    expect(mapAchievementCategory(astrub)).toEqual({
      dofusId: 45,
      name: 'Astrub',
      parentDofusId: 8,
      order: 13,
    })
  })
})
