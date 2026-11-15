import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { QuestData } from '@/lib/dofusdb/fetch-quest-data'
import { refreshNpcs } from '@/lib/dofusdb/refresh-npcs'
import { refreshQuests } from '@/lib/dofusdb/refresh-quests'
import type { RawNpc, RawQuest } from '@/lib/dofusdb/types'
import type { User } from '@/payload-types'

import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'

import { createPanelUser, startPayload, tinyPng } from './payload'

// «Corrección de Torre»: el panel solo edita ese grupo de un dato del juego, y ningún
// refresco de DofusDB lo escribe nunca.

const HUPE: RawNpc = { id: 994_412, name: { es: 'Hupe Esse' }, look: null }
const QUEST_IDS = (questsWithSteps as RawQuest[]).map((quest) => quest.id)

function stepData(): QuestData {
  return structuredClone({
    quests: questsWithSteps as RawQuest[],
    npcs,
    mapPositions,
    items,
    monsters,
  }) as QuestData
}

let payload: Payload
let editor: User

async function cleanUp() {
  await payload.delete({ collection: 'npcs', where: { dofusId: { equals: HUPE.id } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { in: QUEST_IDS } } })
  await payload.delete({ collection: 'items', where: { id: { exists: true } } })
  await payload.delete({ collection: 'monsters', where: { id: { exists: true } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

const noRender = async () => {
  throw new Error('sin render')
}

describe('el panel corrige un dato del juego', () => {
  it('guarda la corrección, marca «Corregido por Torre» y no cambia lo de DofusDB', async () => {
    await refreshNpcs(payload, [HUPE], { fetchRender: noRender })
    const [npc] = (
      await payload.find({ collection: 'npcs', where: { dofusId: { equals: HUPE.id } } })
    ).docs
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'Hupe Esse, dibujado por Torre' },
      file: tinyPng(),
    })
    const saved = await payload.update({
      collection: 'npcs',
      id: npc!.id,
      data: { name: 'Otro nombre', correction: { name: 'Hupé Esse', image: image.id } },
      depth: 0,
      overrideAccess: false,
      user: editor,
    })
    expect(saved).toMatchObject({
      name: 'Hupe Esse',
      correction: { name: 'Hupé Esse', image: image.id },
      corrected: true,
    })
  })

  it('sin sesión no se corrige nada', async () => {
    const [npc] = (
      await payload.find({ collection: 'npcs', where: { dofusId: { equals: HUPE.id } } })
    ).docs
    await expect(
      payload.update({
        collection: 'npcs',
        id: npc!.id,
        data: { correction: { name: 'Anónimo' } },
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)
  })

  it('se encuentra por el nombre que le dio Torre', async () => {
    const { docs } = await payload.find({
      collection: 'npcs',
      where: { 'correction.name': { like: 'hupé' } },
      overrideAccess: false,
      user: editor,
    })
    expect(docs.map((doc) => doc.dofusId)).toEqual([HUPE.id])
  })
})

describe('los refrescos de DofusDB nunca escriben la corrección', () => {
  it('pnpm data:quests (PNJ) cambia el nombre de DofusDB y deja la corrección', async () => {
    await refreshNpcs(payload, [{ ...HUPE, name: { es: 'Hupe Esse (nuevo)' } }], {
      fetchRender: noRender,
    })
    const [npc] = (
      await payload.find({
        collection: 'npcs',
        where: { dofusId: { equals: HUPE.id } },
        depth: 0,
      })
    ).docs
    expect(npc).toMatchObject({
      name: 'Hupe Esse (nuevo)',
      correction: { name: 'Hupé Esse' },
      corrected: true,
    })
  })

  it('pnpm data:quests (misiones, objetos y monstruos) deja las correcciones', async () => {
    await refreshQuests(payload, stepData())
    const quest = (await payload.find({ collection: 'quests', limit: 1, depth: 0 })).docs[0]!
    const item = (await payload.find({ collection: 'items', limit: 1, depth: 0 })).docs[0]!
    const monster = (await payload.find({ collection: 'monsters', limit: 1, depth: 0 })).docs[0]!
    const correct = (collection: 'quests' | 'items' | 'monsters', id: number) =>
      payload.update({
        collection,
        id,
        data: { correction: { name: 'De Torre', level: 7 } },
        overrideAccess: false,
        user: editor,
      })
    await correct('quests', quest.id)
    await correct('items', item.id)
    await correct('monsters', monster.id)

    // Otro nombre en DofusDB: el refresco reescribe esas filas.
    const data = stepData()
    data.quests = data.quests.map((raw) => ({ ...raw, name: { es: `${raw.name.es} (bis)` } }))
    data.items = data.items.map((raw) => ({ ...raw, name: { es: `${raw.name?.es} (bis)` } }))
    data.monsters = data.monsters.map((raw) => ({ ...raw, name: { es: `${raw.name?.es} (bis)` } }))
    await refreshQuests(payload, data)

    for (const [collection, id] of [
      ['quests', quest.id],
      ['items', item.id],
      ['monsters', monster.id],
    ] as const) {
      const doc = await payload.findByID({ collection, id, depth: 0 })
      expect(doc.name, collection).toMatch(/\(bis\)$/)
      expect(doc, collection).toMatchObject({
        correction: { name: 'De Torre', level: 7 },
        corrected: true,
      })
    }
  })
})
