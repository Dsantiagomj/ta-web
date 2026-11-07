import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { backfillFightLists } from '@/lib/guides/backfill-fights'
import type { Media, Monster, QuestGuide } from '@/payload-types'

import { startPayload } from './payload'

// La conversión de los combates de las guías ya importadas: en seco no escribe nada; con
// --apply pasa las listas «N x Monstruo» a bloques Combate e importa las imágenes de esos
// monstruos. Repetirla no cambia nada.

const SLUGS = ['prueba-combate-publicada', 'prueba-combate-sin-casar']
const MONSTERS = [
  { dofusId: 995_281, name: 'Ramán de prueba', iconId: 241 },
  { dofusId: 995_282, name: 'Milirrata de prueba', iconId: 239 },
]

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})
const element = { format: '', indent: 0, version: 1, direction: 'ltr' }
const paragraph = (...children: object[]) => ({
  ...element,
  type: 'paragraph',
  textFormat: 0,
  textStyle: '',
  children,
})
const list = (...values: string[]) => ({
  ...element,
  type: 'list',
  listType: 'bullet',
  tag: 'ul',
  start: 1,
  children: values.map((value, index) => ({
    ...element,
    type: 'listitem',
    value: index + 1,
    children: [text(value)],
  })),
})
const content = (...children: object[]) =>
  ({ root: { ...element, type: 'root', children } }) as never
const intro = paragraph(text('Vas a empezar una lucha contra:'))

let payload: Payload
let monsters: Monster[]
const fetchImage = async () =>
  sharp({ create: { width: 128, height: 128, channels: 4, background: '#5a2' } })
    .png()
    .toBuffer()

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

function fights(doc: QuestGuide) {
  return (doc.body ?? []).flatMap((block) =>
    block.blockType === 'step'
      ? (block.body ?? []).filter((inner) => inner.blockType === 'fight')
      : block.blockType === 'fight'
        ? [block]
        : [],
  )
}

async function cleanUp() {
  await payload.delete({ collection: 'quest-guides', where: { slug: { in: SLUGS } } })
  await payload.delete({
    collection: 'monsters',
    where: { dofusId: { in: MONSTERS.map((m) => m.dofusId) } },
  })
  await payload.delete({ collection: 'media', where: { gameAsset: { like: 'dofusdb-monster' } } })
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
  monsters = []
  for (const data of MONSTERS) monsters.push(await payload.create({ collection: 'monsters', data }))
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Prueba combate publicada',
      slug: SLUGS[0]!,
      _status: 'published',
      body: [
        {
          blockType: 'step',
          x: 3,
          y: -17,
          body: [
            {
              blockType: 'richText',
              content: content(intro, list('1 x Ramán de prueba', '2 x Milirrata de prueba.')),
            },
          ],
        },
      ],
    },
  })
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Prueba combate sin casar',
      slug: SLUGS[1]!,
      _status: 'published',
      body: [
        {
          blockType: 'richText',
          content: content(intro, list('1 x Jalató desconocido de prueba')),
        },
      ],
    },
  })
})

describe('backfillFightLists', () => {
  it('en seco cuenta lo que haría y no escribe nada', async () => {
    const result = await backfillFightLists(payload, { apply: false, slugs: SLUGS })

    expect(result).toMatchObject({
      guides: 2,
      changed: 1,
      converted: 1,
      unmatchedLists: 1,
      skipped: 0,
      unmatched: { 'Jalató desconocido de prueba': 1 },
    })
    expect(fights(await guide(SLUGS[0]!))).toEqual([])
  })

  it('con apply guarda el bloque Combate, publicado, e importa las imágenes de sus monstruos', async () => {
    const result = await backfillFightLists(payload, { apply: true, slugs: SLUGS, fetchImage })

    expect(result).toMatchObject({ changed: 1, converted: 1, published: 1, drafts: 0 })
    expect(result.images).toMatchObject({ imported: 2, linked: 2 })
    const saved = await guide(SLUGS[0]!)
    expect(saved._status).toBe('published')
    expect(fights(saved)).toEqual([
      expect.objectContaining({
        monsters: [
          expect.objectContaining({ monster: monsters[0]!.id, quantity: 1 }),
          expect.objectContaining({ monster: monsters[1]!.id, quantity: 2 }),
        ],
      }),
    ])
    const image = (
      await payload.findByID({ collection: 'monsters', id: monsters[0]!.id, depth: 1 })
    ).image as Media
    expect(image.gameAsset).toBe('dofusdb-monster-image:241')
    // La guía sin casar sigue igual.
    expect(fights(await guide(SLUGS[1]!))).toEqual([])
  })

  it('repetirlo no cambia nada', async () => {
    await backfillFightLists(payload, { apply: true, slugs: SLUGS, fetchImage })
    const again = await backfillFightLists(payload, { apply: true, slugs: SLUGS, fetchImage })
    expect(again).toMatchObject({ changed: 0, converted: 0, unmatchedLists: 1 })
  })

  it('si lo último es un borrador, convierte el borrador y no lo publica', async () => {
    const doc = await guide(SLUGS[0]!)
    await payload.update({
      collection: 'quest-guides',
      id: doc.id,
      data: { title: 'Prueba combate publicada (borrador)' },
      draft: true,
    })
    const result = await backfillFightLists(payload, { apply: true, slugs: SLUGS, fetchImage })
    expect(result).toMatchObject({ converted: 1, published: 0, drafts: 1 })
    const saved = await guide(SLUGS[0]!)
    expect(saved._status).toBe('draft')
    expect(fights(saved)).toHaveLength(1)
  })

  it('si las imágenes fallaron, repetirlo las importa aunque no quede nada que convertir', async () => {
    const failing = async (): Promise<Buffer> => {
      throw new Error('HTTP 503')
    }
    const first = await backfillFightLists(payload, {
      apply: true,
      slugs: SLUGS,
      fetchImage: failing,
    })
    expect(first).toMatchObject({ converted: 1 })
    expect(first.images).toMatchObject({ imported: 0, failed: 2 })

    const again = await backfillFightLists(payload, { apply: true, slugs: SLUGS, fetchImage })
    expect(again).toMatchObject({ converted: 0, changed: 0 })
    expect(again.images).toMatchObject({ imported: 2, linked: 2 })
    const image = (
      await payload.findByID({ collection: 'monsters', id: monsters[1]!.id, depth: 1 })
    ).image as Media
    expect(image.gameAsset).toBe('dofusdb-monster-image:239')
  })
})
