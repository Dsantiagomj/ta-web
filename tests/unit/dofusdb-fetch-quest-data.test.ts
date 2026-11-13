import { describe, expect, it } from 'vitest'

import type { DofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import type { RawQuest } from '@/lib/dofusdb/types'

import unreferencedItems from '../fixtures/dofusdb/items-unreferenced.json'
import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'
import quests from '../fixtures/dofusdb/quests.json'

/**
 * Un cliente que sirve los fixtures y apunta qué IDs le piden de cada colección y qué
 * campos pide en cada fetchAll.
 */
function fixtureClient(rows: Record<string, unknown[]>) {
  const lookups: Record<string, number[]> = {}
  const selects: Record<string, string[] | undefined> = {}
  const client: DofusDbClient = {
    fetchAll: async <T>(collection: string, options?: { select?: string[] }) => {
      selects[collection] = options?.select
      return (rows[collection] ?? []) as T[]
    },
    fetchByIds: async <T>(collection: string, ids: number[]) => {
      lookups[collection] = ids
      return (rows[collection] ?? []) as T[]
    },
    fetchWhere: async () => {
      throw new Error('fetchQuestData no busca por consulta')
    },
  }
  return { client, lookups, selects }
}

describe('fetchQuestData', () => {
  it('trae las misiones y busca solo los PNJ y mapas de sus posiciones de inicio', async () => {
    const { client, lookups } = fixtureClient({ quests, npcs, 'map-positions': mapPositions })

    const data = await fetchQuestData(client)

    expect(data).toMatchObject({ quests, npcs, mapPositions })
    const positions = (quests as RawQuest[]).flatMap((quest) => quest.startPosition ?? [])
    expect(new Set(lookups.npcs)).toEqual(new Set(positions.map((position) => position?.npcId)))
    expect(new Set(lookups['map-positions'])).toEqual(
      new Set(positions.map((position) => position?.mapId)),
    )
  })

  it('trae todo el catálogo de monstruos: los combates de las guías los nombran por su nombre', async () => {
    const { client, lookups, selects } = fixtureClient({ quests: questsWithSteps, items, monsters })

    const data = await fetchQuestData(client)

    expect(data.monsters).toEqual(monsters)
    expect(lookups).not.toHaveProperty('monsters')
    expect(selects.monsters).toEqual(['id', 'name', 'gfxId'])
  })

  it('trae todo el catálogo de objetos, también los que no nombra ninguna misión', async () => {
    const catalog = [...items, ...unreferencedItems]
    const { client, lookups, selects } = fixtureClient({
      quests: questsWithSteps,
      items: catalog,
      monsters,
    })

    const data = await fetchQuestData(client)

    expect(data.items).toEqual(catalog)
    expect(lookups).not.toHaveProperty('items')
    // Solo los campos que se guardan; DofusDB añade el tipo, con su supertipo, por typeId
    expect(selects.items).toEqual(['id', 'name', 'level', 'typeId', 'iconId', 'type'])
  })

  it('busca también los PNJ que nombran los objetivos, por su parámetro y en su texto', async () => {
    const quest: RawQuest = {
      id: 1,
      name: { es: 'Misión de prueba' },
      startPosition: [{ npcId: 10, mapId: 66062340 }],
      steps: [
        {
          id: 11,
          optimalLevel: 1,
          duration: 1,
          objectives: [
            { id: 1, className: 'QuestObjectiveGoToNpcData', parameters: { parameter0: 20 } },
            {
              id: 2,
              className: 'QuestObjectiveBringItemToNpcData',
              parameters: { parameter0: 30, parameter1: 900, parameter2: 1 },
            },
            // Un objetivo libre solo nombra al PNJ en su texto.
            {
              id: 3,
              className: 'QuestObjectiveFreeFormData',
              parameters: { parameter0: 751055 },
              text: { es: 'Habla con {npc,40} y con {npc,10}' },
            },
            // Un monstruo en el mismo parámetro no es un PNJ.
            {
              id: 4,
              className: 'QuestObjectiveFightMonsterData',
              parameters: { parameter0: 50, parameter1: 2 },
            },
          ],
        },
      ],
    }
    const { client, lookups } = fixtureClient({ quests: [quest] })

    await fetchQuestData(client)

    expect([...lookups.npcs].sort((a, b) => a - b)).toEqual([10, 20, 30, 40])
  })

  it('trae todas las subzonas y áreas, con su nombre: la zona de la misión y la de cada objetivo', async () => {
    const subareas = [{ id: 95, name: { es: 'Ciudad de Astrub' }, areaId: 18 }]
    const areas = [{ id: 18, name: { es: 'Astrub' } }]
    const { client, lookups, selects } = fixtureClient({ quests, subareas, areas })

    const data = await fetchQuestData(client)

    expect(lookups).not.toHaveProperty('subareas')
    expect(lookups).not.toHaveProperty('areas')
    expect(selects.subareas).toEqual(['id', 'name', 'areaId'])
    expect(selects.areas).toEqual(['id', 'name'])
    expect(data.subAreas).toEqual(subareas)
    expect(data.areas).toEqual(areas)
  })

  it('trae todos los logros', async () => {
    const achievements = [{ id: 1671, name: { es: 'La ocasión hace al ladrón' }, need: {} }]
    const { client } = fixtureClient({ quests, achievements })

    const data = await fetchQuestData(client)

    expect(data.achievements).toEqual(achievements)
  })

  it('trae los logros con lo que necesitan sus páginas y todas sus categorías', async () => {
    const categories = [{ id: 45, name: { es: 'Astrub' }, parentId: 8, order: 13 }]
    const { client, selects } = fixtureClient({ quests, 'achievement-categories': categories })

    const data = await fetchQuestData(client)

    expect(data.achievementCategories).toEqual(categories)
    expect(selects['achievement-categories']).toEqual(['id', 'name', 'parentId', 'order'])
    // Con objectiveIds y rewardIds, DofusDB añade a cada logro sus objetivos y recompensas.
    expect(selects.achievements).toEqual([
      'id',
      'name',
      'slug',
      'need',
      'categoryId',
      'iconId',
      'points',
      'level',
      'order',
      'objectiveIds',
      'rewardIds',
    ])
  })
})
