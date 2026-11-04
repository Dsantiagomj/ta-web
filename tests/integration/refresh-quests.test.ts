import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { QuestData } from '@/lib/dofusdb/fetch-quest-data'
import { refreshQuests } from '@/lib/dofusdb/refresh-quests'
import type { RawQuest } from '@/lib/dofusdb/types'

import mapPositions from '../fixtures/dofusdb/map-positions.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import quests from '../fixtures/dofusdb/quests.json'

import { startPayload } from './payload'

// Las misiones de los fixtures (878, 879, 880 y 89) y la 871, que aparece en la última
// prueba. 879 pide la 871 y 89 pide la 88, que no están: prerrequisitos que faltan.
const DOFUS_IDS = [878, 879, 880, 89, 871]

function fixtureData(): QuestData {
  return structuredClone({ quests: quests as RawQuest[], npcs, mapPositions })
}

describe('refresco de misiones desde DofusDB', () => {
  let payload: Payload

  async function questsByDofusId() {
    const found = await payload.find({
      collection: 'quests',
      where: { dofusId: { in: DOFUS_IDS } },
      pagination: false,
      depth: 0,
    })
    return new Map(found.docs.map((doc) => [doc.dofusId, doc]))
  }

  async function removeTestQuests() {
    await payload.delete({ collection: 'quests', where: { dofusId: { in: DOFUS_IDS } } })
  }

  beforeAll(async () => {
    payload = await startPayload()
    await removeTestQuests()
  })

  afterAll(async () => {
    await removeTestQuests()
    await payload.destroy()
  })

  const firstRun = new Date('2026-01-01T10:00:00.000Z')

  it('crea las misiones y enlaza los prerrequisitos por ID de Payload', async () => {
    const counts = await refreshQuests(payload, fixtureData(), { now: firstRun })

    expect(counts).toEqual({ created: 4, updated: 0, unchanged: 0, missingPrerequisites: 2 })

    const saved = await questsByDofusId()
    expect([...saved.keys()].sort((a, b) => a - b)).toEqual([89, 878, 879, 880])
    expect(saved.get(880)).toMatchObject({
      name: '¡M.O. Pardy!',
      startCriterion: 'Qf=879&Qa=878',
      prerequisites: [saved.get(879)?.id, saved.get(878)?.id],
      startPositions: [{ npcId: 1419, npcName: 'Balt Azaw', mapId: 66192898, x: -37, y: -86 }],
      refreshedAt: firstRun.toISOString(),
    })
    // 871 no existe todavía: se omite sin fallar
    expect(saved.get(879)?.prerequisites).toEqual([saved.get(878)?.id])
    expect(saved.get(89)?.prerequisites).toEqual([])
    expect(saved.get(89)?.startPositions).toHaveLength(2)
  })

  it('una segunda pasada con los mismos datos no duplica ni cambia nada', async () => {
    const counts = await refreshQuests(payload, fixtureData(), {
      now: new Date('2026-01-02T10:00:00.000Z'),
    })

    expect(counts).toEqual({ created: 0, updated: 0, unchanged: 4, missingPrerequisites: 2 })

    const saved = await questsByDofusId()
    expect(saved.size).toBe(4)
    for (const quest of saved.values()) {
      expect(quest.refreshedAt).toBe(firstRun.toISOString())
    }
  })

  it('actualiza solo las misiones que cambian, prerrequisitos incluidos', async () => {
    const data = fixtureData()
    const renamed = data.quests.find((quest) => quest.id === 878)!
    renamed.name.es = 'Las estrellas de Navidad'
    // Aparece la 871, que la 879 pedía y faltaba
    data.quests.push({ ...structuredClone(renamed), id: 871, name: { es: 'Misión 871' } })
    const thirdRun = new Date('2026-01-03T10:00:00.000Z')

    const counts = await refreshQuests(payload, data, { now: thirdRun })

    expect(counts).toEqual({ created: 1, updated: 2, unchanged: 2, missingPrerequisites: 1 })

    const saved = await questsByDofusId()
    expect(saved.get(878)).toMatchObject({
      name: 'Las estrellas de Navidad',
      refreshedAt: thirdRun.toISOString(),
    })
    expect(saved.get(879)).toMatchObject({
      prerequisites: [saved.get(871)?.id, saved.get(878)?.id],
      refreshedAt: thirdRun.toISOString(),
    })
    expect(saved.get(880)?.refreshedAt).toBe(firstRun.toISOString())
  })
})
