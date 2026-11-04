import { describe, expect, it } from 'vitest'

import { indexLookups, mapQuest } from '@/lib/dofusdb/map-quest'
import type { RawQuest } from '@/lib/dofusdb/types'

import mapPositions from '../fixtures/dofusdb/map-positions.json'
import npcs from '../fixtures/dofusdb/npcs.json'
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

  describe('prerrequisitos', () => {
    it('une need.quests y cada Qf= del criterio, sin repetir', () => {
      // need.quests = [871, 878]; el criterio repite 871 (Qf=871&Qa=878)
      expect(mapQuest(quest(879), lookups).prerequisiteDofusIds).toEqual([871, 878])
    })

    it('lee los Qf= del criterio aunque need.quests esté vacío', () => {
      const raw = quest(880)
      raw.need = { quests: [] }
      raw.startCriterion = 'Qf=879&Qa=878|Qf=877'
      expect(mapQuest(raw, lookups).prerequisiteDofusIds).toEqual([879, 877])
    })

    it('no se pone a sí misma como prerrequisito', () => {
      const raw = quest(880)
      raw.startCriterion = 'Qf=880&Qf=879'
      expect(mapQuest(raw, lookups).prerequisiteDofusIds).toEqual([879, 878])
    })

    it('sin need ni criterio no hay prerrequisitos', () => {
      const raw = quest(878)
      delete raw.need
      raw.startCriterion = null
      expect(mapQuest(raw, lookups)).toMatchObject({
        startCriterion: null,
        prerequisiteDofusIds: [],
      })
    })
  })
})
