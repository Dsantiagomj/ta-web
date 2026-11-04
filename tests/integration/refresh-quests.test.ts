import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { QuestData } from '@/lib/dofusdb/fetch-quest-data'
import { refreshQuests } from '@/lib/dofusdb/refresh-quests'
import type { RawQuest } from '@/lib/dofusdb/types'
import type { Item, Monster, Quest } from '@/payload-types'

import unreferencedItems from '../fixtures/dofusdb/items-unreferenced.json'
import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'
import quests from '../fixtures/dofusdb/quests.json'

import { startPayload } from './payload'

// Las misiones de los fixtures (878, 879, 880, 89, 275 y 674) y la 871, que aparece en la
// última prueba. 879 pide la 871, 89 la 88 y 674 la 631, que no están: prerrequisitos que
// faltan. 275 solo tiene alternativas, así que no tiene prerrequisitos.
const DOFUS_IDS = [878, 879, 880, 89, 275, 674, 871]

function fixtureData(): QuestData {
  return structuredClone({
    quests: quests as RawQuest[],
    npcs,
    mapPositions,
    items: [],
    monsters: [],
  })
}

// Un solo Payload para todo el archivo: getPayload lo guarda en caché y, tras destroy,
// devolvería el mismo ya cerrado.
let payload: Payload

beforeAll(async () => {
  payload = await startPayload()
})

afterAll(async () => {
  await payload.destroy()
})

describe('refresco de misiones desde DofusDB', () => {
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
    await removeTestQuests()
  })

  afterAll(async () => {
    await removeTestQuests()
  })

  const firstRun = new Date('2026-01-01T10:00:00.000Z')

  it('crea las misiones y enlaza los prerrequisitos por ID de Payload', async () => {
    const counts = await refreshQuests(payload, fixtureData(), { now: firstRun })

    expect(counts).toEqual({
      quests: { created: 6, updated: 0, unchanged: 0 },
      items: { created: 0, updated: 0, unchanged: 0 },
      monsters: { created: 0, updated: 0, unchanged: 0 },
      missingPrerequisites: 3,
      // Los objetos de need.items de 879, 89, 275 y 674, que estos datos no traen
      missingItems: 6,
      missingMonsters: 0,
    })

    const saved = await questsByDofusId()
    expect([...saved.keys()].sort((a, b) => a - b)).toEqual([89, 275, 674, 878, 879, 880])
    expect(saved.get(880)).toMatchObject({
      name: '¡M.O. Pardy!',
      startCriterion: 'Qf=879&Qa=878',
      // Qa=878 pide la 878 en curso, no terminada
      prerequisites: [saved.get(879)?.id],
      startPositions: [{ npcId: 1419, npcName: 'Balt Azaw', mapId: 66192898, x: -37, y: -86 }],
      refreshedAt: firstRun.toISOString(),
    })
    // 871 no existe todavía: se omite sin fallar
    expect(saved.get(879)?.prerequisites).toEqual([])
    expect(saved.get(89)?.prerequisites).toEqual([])
    expect(saved.get(275)?.prerequisites).toEqual([])
    expect(saved.get(89)?.startPositions).toHaveLength(2)
  })

  it('una segunda pasada con los mismos datos no duplica ni cambia nada', async () => {
    const counts = await refreshQuests(payload, fixtureData(), {
      now: new Date('2026-01-02T10:00:00.000Z'),
    })

    expect(counts).toMatchObject({
      quests: { created: 0, updated: 0, unchanged: 6 },
      missingPrerequisites: 3,
    })

    const saved = await questsByDofusId()
    expect(saved.size).toBe(6)
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

    expect(counts).toMatchObject({
      quests: { created: 1, updated: 2, unchanged: 4 },
      missingPrerequisites: 2,
    })

    const saved = await questsByDofusId()
    expect(saved.get(878)).toMatchObject({
      name: 'Las estrellas de Navidad',
      refreshedAt: thirdRun.toISOString(),
    })
    expect(saved.get(879)).toMatchObject({
      prerequisites: [saved.get(871)?.id],
      refreshedAt: thirdRun.toISOString(),
    })
    expect(saved.get(880)?.refreshedAt).toBe(firstRun.toISOString())
  })
})

// Misiones con etapas: El cazador cazado (1977), Seis pies bajo tierra (1976), El rey
// Estitch (332), Intoxicación profunda (1433), Entretanto, un renacer (2420), De Safari con
// Cocodrail Dandi (241), ¡M.O. Pardy! (880), La sombra del reino (1665) y La hoz maldita
// (245), con los objetos y monstruos que nombran.
describe('recompensas y requisitos desde DofusDB', () => {
  const questIds = (questsWithSteps as RawQuest[]).map((quest) => quest.id)
  const itemIds = items.map((item) => item.id)
  const monsterIds = monsters.map((monster) => monster.id)

  function stepData(): QuestData {
    return structuredClone({
      quests: questsWithSteps as RawQuest[],
      npcs: [],
      mapPositions: [],
      items,
      monsters,
    })
  }

  async function byDofusId<T extends { dofusId: number }>(
    collection: 'quests' | 'items' | 'monsters',
    ids: number[],
  ): Promise<Map<number, T>> {
    const found = await payload.find({
      collection,
      where: { dofusId: { in: ids } },
      pagination: false,
      depth: 0,
    })
    return new Map((found.docs as unknown as T[]).map((doc) => [doc.dofusId, doc]))
  }

  async function removeTestData() {
    await payload.delete({ collection: 'quests', where: { dofusId: { in: questIds } } })
    await payload.delete({ collection: 'items', where: { dofusId: { in: itemIds } } })
    await payload.delete({ collection: 'monsters', where: { dofusId: { in: monsterIds } } })
  }

  beforeAll(async () => {
    await removeTestData()
  })

  afterAll(async () => {
    await removeTestData()
  })

  const firstRun = new Date('2026-02-01T10:00:00.000Z')

  it('crea los objetos y monstruos y enlaza recompensas y requisitos por ID de Payload', async () => {
    const counts = await refreshQuests(payload, stepData(), { now: firstRun })

    expect(counts).toMatchObject({
      quests: { created: 9, updated: 0, unchanged: 0 },
      items: { created: 24, updated: 0, unchanged: 0 },
      monsters: { created: 34, updated: 0, unchanged: 0 },
      missingItems: 0,
      missingMonsters: 0,
    })

    const savedItems = await byDofusId<Item>('items', itemIds)
    const savedMonsters = await byDofusId<Monster>('monsters', monsterIds)
    const saved = await byDofusId<Quest>('quests', questIds)
    const item = (dofusId: number) => savedItems.get(dofusId)!.id

    expect(savedItems.get(2322)).toMatchObject({
      name: 'Colmillos de ratas',
      level: 26,
      typeId: 47,
      superTypeId: 9,
      iconId: 47464,
      refreshedAt: firstRun.toISOString(),
    })
    expect(savedMonsters.get(4246)).toMatchObject({
      name: 'Rob Mirbelec',
      iconId: 1339,
      refreshedAt: firstRun.toISOString(),
    })

    expect(saved.get(1977)).toMatchObject({
      rewards: {
        experience: 24_316,
        kamas: 552,
        items: [
          { item: item(2322), quantity: 2 },
          { item: item(304), quantity: 2 },
        ],
        emoteIds: [],
        titleIds: [],
      },
      needs: {
        items: [{ item: item(19728), quantity: 1 }],
        monsters: [],
        walksMaps: false,
      },
    })
    expect(saved.get(332)).toMatchObject({
      rewards: { experience: 5_571_168, kamas: 0 },
      needs: {
        items: [
          { item: item(10424), quantity: 1 },
          { item: item(9264), quantity: 1 },
        ],
        monsters: [{ monster: savedMonsters.get(4246)!.id, quantity: 1 }],
        walksMaps: true,
      },
    })
    expect(saved.get(880)?.rewards?.emoteIds).toEqual([36])
    expect(saved.get(1665)?.rewards?.titleIds).toEqual([200])
    expect(saved.get(241)?.needs?.monsters).toHaveLength(30)
  })

  it('una segunda pasada con los mismos datos no cambia nada', async () => {
    const counts = await refreshQuests(payload, stepData(), {
      now: new Date('2026-02-02T10:00:00.000Z'),
    })

    expect(counts).toMatchObject({
      quests: { created: 0, updated: 0, unchanged: 9 },
      items: { created: 0, updated: 0, unchanged: 24 },
      monsters: { created: 0, updated: 0, unchanged: 34 },
    })
    const savedItems = await byDofusId<Item>('items', itemIds)
    expect(savedItems.size).toBe(24)
    for (const item of savedItems.values()) {
      expect(item.refreshedAt).toBe(firstRun.toISOString())
    }
  })

  it('actualiza solo lo que cambia y omite los objetos que no existen', async () => {
    const data = stepData()
    data.items.find((item) => item.id === 2322)!.name!.es = 'Colmillos de rata'
    // El cazador cazado da ahora 3 colmillos y un objeto que DofusDB no devuelve
    const hunted = data.quests.find((quest) => quest.id === 1977)!
    hunted.steps![0].rewards!.at(-1)!.itemsReward = [
      [2322, 3],
      [304, 2],
      [99_999_999, 1],
    ]

    const counts = await refreshQuests(payload, data, { now: new Date('2026-02-03T10:00:00Z') })

    expect(counts).toMatchObject({
      items: { created: 0, updated: 1, unchanged: 23 },
      quests: { created: 0, updated: 1, unchanged: 8 },
      missingItems: 1,
    })
    const savedItems = await byDofusId<Item>('items', itemIds)
    expect(savedItems.get(2322)?.name).toBe('Colmillos de rata')
    const saved = await byDofusId<Quest>('quests', [1977])
    expect(saved.get(1977)?.rewards?.items).toMatchObject([
      { item: savedItems.get(2322)!.id, quantity: 3 },
      { item: savedItems.get(304)!.id, quantity: 2 },
    ])
  })
})

// Las misiones de ambos fixtures, con sus PNJ, mapas, objetos y monstruos: hay
// prerrequisitos, recompensas y requisitos que enlazar.
describe('el resultado no depende de la concurrencia', () => {
  const stepIds = new Set((questsWithSteps as RawQuest[]).map((quest) => quest.id))
  const allQuests = [
    ...(questsWithSteps as RawQuest[]),
    ...(quests as RawQuest[]).filter((quest) => !stepIds.has(quest.id)),
  ]
  const questIds = allQuests.map((quest) => quest.id)
  const itemIds = items.map((item) => item.id)
  const monsterIds = monsters.map((monster) => monster.id)

  function allData(): QuestData {
    return structuredClone({ quests: allQuests, npcs, mapPositions, items, monsters })
  }

  async function removeTestData() {
    await payload.delete({ collection: 'quests', where: { dofusId: { in: questIds } } })
    await payload.delete({ collection: 'items', where: { dofusId: { in: itemIds } } })
    await payload.delete({ collection: 'monsters', where: { dofusId: { in: monsterIds } } })
  }

  // Lo guardado, sin los IDs de Payload: cada relación pasa a su ID de DofusDB, que no
  // cambia entre pasadas.
  async function snapshot() {
    const find = (collection: 'quests' | 'items' | 'monsters', ids: number[]) =>
      payload.find({ collection, where: { dofusId: { in: ids } }, pagination: false, depth: 0 })
    const [savedQuests, savedItems, savedMonsters] = await Promise.all([
      find('quests', questIds),
      find('items', itemIds),
      find('monsters', monsterIds),
    ])
    const dofusIdOf = (docs: { id: number; dofusId: number }[]) => {
      const byId = new Map(docs.map((doc) => [doc.id, doc.dofusId]))
      return (value: number | { id: number } | null | undefined) =>
        value == null ? null : byId.get(typeof value === 'number' ? value : value.id)
    }
    const quest = dofusIdOf(savedQuests.docs as Quest[])
    const item = dofusIdOf(savedItems.docs as Item[])
    const monster = dofusIdOf(savedMonsters.docs as Monster[])
    const strip = <T extends object>({
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...rest
    }: T & { id?: unknown; createdAt?: unknown; updatedAt?: unknown }) => rest

    const byDofusId = <T extends { dofusId: number }>(docs: T[]) =>
      [...docs].sort((a, b) => a.dofusId - b.dofusId)
    return {
      items: byDofusId(savedItems.docs as Item[]).map(strip),
      monsters: byDofusId(savedMonsters.docs as Monster[]).map(strip),
      quests: byDofusId(savedQuests.docs as Quest[]).map((doc) => ({
        ...strip(doc),
        prerequisites: (doc.prerequisites ?? []).map(quest),
        startPositions: (doc.startPositions ?? []).map(strip),
        rewards: {
          ...doc.rewards,
          items: (doc.rewards?.items ?? []).map((row) => ({
            item: item(row.item),
            quantity: row.quantity,
          })),
        },
        needs: {
          ...doc.needs,
          items: (doc.needs?.items ?? []).map((row) => ({
            item: item(row.item),
            quantity: row.quantity,
          })),
          monsters: (doc.needs?.monsters ?? []).map((row) => ({
            monster: monster(row.monster),
            quantity: row.quantity,
          })),
        },
      })),
    }
  }

  beforeAll(async () => {
    await removeTestData()
  })

  afterAll(async () => {
    await removeTestData()
  })

  it('guarda lo mismo y cuenta lo mismo con 1 y con 8 escrituras a la vez', async () => {
    const now = new Date('2026-03-01T10:00:00.000Z')

    const sequential = await refreshQuests(payload, allData(), { now, concurrency: 1 })
    const sequentialSnapshot = await snapshot()
    await removeTestData()
    const parallel = await refreshQuests(payload, allData(), { now, concurrency: 8 })
    const parallelSnapshot = await snapshot()

    expect(sequential.quests.created).toBe(questIds.length)
    expect(sequentialSnapshot.quests.some((doc) => doc.prerequisites.length > 0)).toBe(true)
    expect(parallel).toEqual(sequential)
    expect(parallelSnapshot).toEqual(sequentialSnapshot)
  })
})

// El catálogo entero de DofusDB trae objetos que ninguna misión nombra: una espada (44) y
// dos objetos de misión (1726 y 1727, supertipo 14). Torre los busca igual en las guías.
describe('catálogo completo de objetos', () => {
  const catalog = [...items, ...unreferencedItems]
  const questIds = (questsWithSteps as RawQuest[]).map((quest) => quest.id)
  const itemIds = catalog.map((item) => item.id)
  const monsterIds = monsters.map((monster) => monster.id)

  function catalogData(): QuestData {
    return structuredClone({
      quests: questsWithSteps as RawQuest[],
      npcs: [],
      mapPositions: [],
      items: catalog,
      monsters,
    })
  }

  async function savedItems() {
    const found = await payload.find({
      collection: 'items',
      where: { dofusId: { in: itemIds } },
      pagination: false,
      depth: 0,
    })
    return new Map(found.docs.map((doc) => [doc.dofusId, doc]))
  }

  async function removeTestData() {
    await payload.delete({ collection: 'quests', where: { dofusId: { in: questIds } } })
    await payload.delete({ collection: 'items', where: { dofusId: { in: itemIds } } })
    await payload.delete({ collection: 'monsters', where: { dofusId: { in: monsterIds } } })
  }

  beforeAll(async () => {
    await removeTestData()
  })

  afterAll(async () => {
    await removeTestData()
  })

  const firstRun = new Date('2026-04-01T10:00:00.000Z')

  it('guarda también los objetos que no nombra ninguna misión', async () => {
    const counts = await refreshQuests(payload, catalogData(), { now: firstRun })

    expect(counts).toMatchObject({
      items: { created: catalog.length, updated: 0, unchanged: 0 },
      missingItems: 0,
    })
    const saved = await savedItems()
    expect(saved.size).toBe(catalog.length)
    expect(saved.get(44)).toMatchObject({
      name: 'Espada de maderucha',
      level: 7,
      typeId: 6,
      superTypeId: 2,
      iconId: 6007,
      refreshedAt: firstRun.toISOString(),
    })
    expect(saved.get(1726)).toMatchObject({
      name: 'Bola de pelos de Tarche',
      typeId: 129,
      superTypeId: 14,
    })
  })

  it('una segunda pasada con el mismo catálogo no escribe ningún objeto', async () => {
    const counts = await refreshQuests(payload, catalogData(), {
      now: new Date('2026-04-02T10:00:00.000Z'),
    })

    expect(counts).toMatchObject({
      items: { created: 0, updated: 0, unchanged: catalog.length },
      quests: { created: 0, updated: 0, unchanged: questIds.length },
    })
    for (const item of (await savedItems()).values()) {
      expect(item.refreshedAt).toBe(firstRun.toISOString())
    }
  })
})
