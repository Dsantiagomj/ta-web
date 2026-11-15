import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { RawQuest } from '@/lib/dofusdb/types'
import { backfillShownItems } from '@/lib/guides/shown-items'
import type { QuestGuide } from '@/payload-types'

import shownItems from '../fixtures/dofusdb/quests-shown-items.json'
import { startPayload } from './payload'

// La puesta al día de las guías rellenadas con lo que se enseña sumado (2 × Cocobur en El
// forjador de leyenda): en seco no escribe nada; con apply corrige solo las guías que
// siguen con el valor que rellenaba DofusDB, y nunca una lista que Torre cambió.

const SLUGS = ['prueba-ensenar-publicada', 'prueba-ensenar-torre', 'prueba-ensenar-borrador']
const quests = shownItems as RawQuest[]

let payload: Payload
let cocobur: number

async function guide(slug: string): Promise<QuestGuide> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { slug: { equals: slug } },
    draft: true,
    depth: 0,
    limit: 1,
  })
  return docs[0]!
}

async function published(slug: string): Promise<QuestGuide> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { slug: { equals: slug } },
    draft: false,
    depth: 0,
    limit: 1,
  })
  return docs[0]!
}

const items = (doc: QuestGuide) =>
  (doc.summary?.needs?.items ?? []).map(({ item, quantity }) => [
    typeof item === 'object' ? item.id : item,
    quantity,
  ])

async function cleanUp() {
  await payload.delete({ collection: 'quest-guides', where: { slug: { in: SLUGS } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { in: [2035, 2036] } } })
  await payload.delete({ collection: 'items', where: { dofusId: { in: [20210, 20211] } } })
}

beforeAll(async () => {
  payload = await startPayload()
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

beforeEach(async () => {
  await cleanUp()
  cocobur = (
    await payload.create({
      collection: 'items',
      data: { dofusId: 20210, name: 'Cocobur', typeId: 6, superTypeId: 2 },
    })
  ).id
  // El frasco es un objeto de misión: la lista de Necesitarás no lo muestra.
  await payload.create({
    collection: 'items',
    data: { dofusId: 20211, name: 'Frasco de agua mágica', typeId: 133, superTypeId: 14 },
  })
  const forjador = await payload.create({
    collection: 'quests',
    data: { dofusId: 2036, name: 'El forjador de leyenda' },
  })
  const create = (slug: string, quantity: number, status: 'published' | 'draft') =>
    payload.create({
      collection: 'quest-guides',
      data: {
        title: slug,
        slug,
        quest: forjador.id,
        _status: status,
        summary: {
          needs: { items: [{ item: cocobur, quantity }], notes: '1 x Combate solitario.' },
        },
      },
      draft: status === 'draft',
    })
  await create(SLUGS[0]!, 2, 'published')
  await create(SLUGS[1]!, 3, 'published')
  // Publicada con 2 y luego un borrador de Torre con otros cambios: se corrige el borrador.
  const draft = await create(SLUGS[2]!, 2, 'published')
  await payload.update({
    collection: 'quest-guides',
    id: draft.id,
    data: { title: 'Cambio sin publicar', _status: 'draft' },
    draft: true,
  })
})

describe('backfillShownItems', () => {
  it('en seco lista lo que cambiaría y no escribe nada', async () => {
    const result = await backfillShownItems(payload, { apply: false, quests })
    expect(result.fixes.map(({ slug, status, from, to }) => [slug, status, from, to])).toEqual([
      // Por slug.
      [SLUGS[2], 'draft', [['Cocobur', 2]], [['Cocobur', 1]]],
      [SLUGS[0], 'published', [['Cocobur', 2]], [['Cocobur', 1]]],
    ])
    expect(result.different).toEqual([{ slug: SLUGS[1], stored: [['Cocobur', 3]] }])
    for (const slug of [SLUGS[0]!, SLUGS[2]!]) {
      expect(items(await guide(slug))).toEqual([[cocobur, 2]])
    }
  })

  it('con apply corrige las que siguen con el valor de DofusDB y respeta la de Torre', async () => {
    const result = await backfillShownItems(payload, { apply: true, quests })
    expect(result).toMatchObject({ published: 1, drafts: 1 })

    const fixed = await guide(SLUGS[0]!)
    expect(items(fixed)).toEqual([[cocobur, 1]])
    expect(fixed._status).toBe('published')
    expect(fixed.summary?.needs?.notes).toBe('1 x Combate solitario.')

    expect(items(await guide(SLUGS[1]!))).toEqual([[cocobur, 3]])

    const draft = await guide(SLUGS[2]!)
    expect(draft._status).toBe('draft')
    expect(draft.title).toBe('Cambio sin publicar')
    expect(items(draft)).toEqual([[cocobur, 1]])
    // Lo publicado sigue igual hasta que Torre publique su borrador.
    expect(items(await published(SLUGS[2]!))).toEqual([[cocobur, 2]])

    const again = await backfillShownItems(payload, { apply: true, quests })
    expect(again.fixes).toEqual([])
  })
})
