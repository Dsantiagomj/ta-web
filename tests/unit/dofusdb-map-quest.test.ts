import { describe, expect, it } from 'vitest'

import { indexLookups, mapQuest } from '@/lib/dofusdb/map-quest'
import type { RawQuest } from '@/lib/dofusdb/types'

import mapPositions from '../fixtures/dofusdb/map-positions.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'
import quests from '../fixtures/dofusdb/quests.json'

const lookups = indexLookups(npcs, mapPositions)
const noLookups = indexLookups([], [])

function quest(id: number): RawQuest {
  const found = (quests as RawQuest[]).find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
  return structuredClone(found)
}

describe('mapQuest', () => {
  it('copia los datos de la misión con el nombre en español', () => {
    expect(mapQuest(quest(878), lookups)).toEqual({
      dofusId: 878,
      name: 'Las estrellas de Nawidad',
      levelMin: 20,
      levelMax: 200,
      categoryId: 26,
      startCriterion: 'PL>19',
      startPositions: [{ npcId: 1545, npcName: 'Paco Dekarbón', mapId: 66062340, x: -30, y: -84 }],
      prerequisiteDofusIds: [],
      // Estos fixtures no traen etapas
      rewards: {
        experience: 0,
        kamas: 0,
        items: [],
        emoteIds: [],
        spellIds: [],
        titleIds: [],
        jobIds: [],
      },
      needs: { items: [], monsters: [], walksMaps: false },
    })
  })

  it('añade recompensas y requisitos desde las etapas', () => {
    const raw = (questsWithSteps as RawQuest[]).find((candidate) => candidate.id === 1977)!
    expect(mapQuest(raw, noLookups)).toMatchObject({
      rewards: { experience: 24_316, kamas: 552 },
      needs: { items: [{ dofusId: 19728, quantity: 1 }], monsters: [], walksMaps: false },
    })
  })

  it('usa el nombre en francés si falta el español', () => {
    const raw = quest(878)
    delete raw.name.es
    expect(mapQuest(raw, lookups).name).toBe('Les Étoiles de Nowel')
  })

  it('guarda todas las posiciones de inicio', () => {
    expect(mapQuest(quest(89), lookups).startPositions).toEqual([
      { npcId: 201, npcName: 'Larry Poller', mapId: 212730368, x: -34, y: -58 },
      { npcId: 6364, npcName: 'Danathor', mapId: 219153408, x: -36, y: -60 },
    ])
  })

  it('deja vacío lo que no está en las búsquedas, sin fallar', () => {
    expect(mapQuest(quest(89), noLookups).startPositions).toEqual([
      { npcId: 201, npcName: null, mapId: 212730368, x: null, y: null },
      { npcId: 6364, npcName: null, mapId: 219153408, x: null, y: null },
    ])
  })

  // Prerrequisito = misión que hay que haber terminado. Solo cuentan los Qf= obligatorios
  // del criterio; need.quests de DofusDB mezcla alternativas y misiones en curso (Qa=).
  describe('prerrequisitos', () => {
    it('toma los Qf= unidos con & y no need.quests ni Qa=', () => {
      // Qf=871&Qa=878, need.quests = [871, 878]: 878 solo tiene que estar en curso
      expect(mapQuest(quest(879), lookups).prerequisiteDofusIds).toEqual([871])
    })

    it('no cuenta las alternativas de un grupo con |', () => {
      // Ps=2&Pa=55&PL>129&(Qf=272|Qf=273|Qf=274): basta con una de las tres
      expect(mapQuest(quest(275), lookups).prerequisiteDofusIds).toEqual([])
    })

    it('cuenta el Qf= obligatorio junto a un grupo con |', () => {
      // PL>99&Qf=631&(PO=11195|PO=11197|DD>8,11198)&Sc=702
      expect(mapQuest(quest(674), lookups).prerequisiteDofusIds).toEqual([631])
    })

    it('trata un | sin paréntesis como alternativas', () => {
      const raw = quest(880)
      raw.startCriterion = 'Qf=879&Qa=878|Qf=877'
      expect(mapQuest(raw, lookups).prerequisiteDofusIds).toEqual([])
    })

    it('trata los grupos anidados como alternativas, sin fallar', () => {
      const raw = quest(880)
      raw.startCriterion = '((Qf=934&Pm=76284416)|(Qf=935&Pm=76286989))&Qf=10&(Qf=11&Qf=12)'
      expect(mapQuest(raw, lookups).prerequisiteDofusIds).toEqual([10, 11, 12])
      raw.startCriterion = 'Qf=1&((Qf=2|Qf=3)'
      expect(() => mapQuest(raw, lookups)).not.toThrow()
    })

    it('no repite ni se pone a sí misma como prerrequisito', () => {
      const raw = quest(880)
      raw.startCriterion = 'Qf=880&Qf=879&Qf=879&Qf!878'
      expect(mapQuest(raw, lookups).prerequisiteDofusIds).toEqual([879])
    })

    it('sin criterio no hay prerrequisitos', () => {
      const raw = quest(879)
      raw.startCriterion = null
      expect(mapQuest(raw, lookups)).toMatchObject({
        startCriterion: null,
        prerequisiteDofusIds: [],
      })
    })
  })
})
