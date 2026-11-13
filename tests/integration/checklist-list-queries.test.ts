import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { checklistEntries } from '@/lib/checklists/list'
import { readChecklists } from '@/lib/checklists/queries'

import { startPayload, tinyPng } from './payload'

// Lo que leen el índice /checklists y el menú, como un visitante (overrideAccess: false): las
// checklists publicadas, también las En preparación, en el orden de Torre, con el huevo y el
// color de la guía de su Dofus. Un borrador no sale.

let payload: Payload
const PREFIX = 'prueba-cl-index'

async function cleanUp() {
  await payload.delete({ collection: 'checklists', where: { slug: { like: PREFIX } } })
  await payload.delete({ collection: 'dofus-guides', where: { slug: { like: PREFIX } } })
  await payload.delete({ collection: 'items', where: { dofusId: { in: [939001, 939002] } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  const image = await payload.create({
    collection: 'media',
    data: { alt: 'Huevo de prueba' },
    file: tinyPng(),
  })
  const item = await payload.create({
    collection: 'items',
    data: { dofusId: 939001, name: 'Dofus de prueba', image: image.id },
  })
  const guide = await payload.create({
    collection: 'dofus-guides',
    data: {
      slug: `${PREFIX}-dofus`,
      name: 'Dofus de prueba',
      order: 1,
      state: 'published',
      color: '#7fd6c2',
      dofus: item.id,
      _status: 'published',
    } as never,
  })
  // Una guía que Torre aún no ha publicado: su huevo y su color salen igual. Cada Dofus tiene
  // una sola guía, así que lleva su propio objeto.
  const draftItem = await payload.create({
    collection: 'items',
    data: { dofusId: 939002, name: 'Otro Dofus de prueba', image: image.id },
  })
  const draftGuide = await payload.create({
    collection: 'dofus-guides',
    data: {
      slug: `${PREFIX}-dofus-borrador`,
      name: 'Guía sin publicar',
      order: 2,
      state: 'preparing',
      color: '#d18b23',
      dofus: draftItem.id,
    } as never,
    draft: true,
  })
  const checklists = [
    {
      slug: `${PREFIX}-c`,
      name: 'Tercera',
      order: 3,
      state: 'preparing',
      dofusGuide: draftGuide.id,
      _status: 'published',
    },
    { slug: `${PREFIX}-b`, name: 'Segunda', order: 2, state: 'preparing', _status: 'published' },
    {
      slug: `${PREFIX}-a`,
      name: 'Primera',
      order: 1,
      state: 'published',
      dofusGuide: guide.id,
      _status: 'published',
    },
    { slug: `${PREFIX}-borrador`, name: 'Borrador', order: 0, state: 'preparing' },
  ]
  for (const data of checklists) {
    await payload.create({ collection: 'checklists', data: data as never, draft: !data._status })
  }
})

afterAll(async () => {
  await cleanUp()
})

describe('readChecklists', () => {
  it('como un visitante: lo publicado en su orden, con el huevo y el color de su Dofus', async () => {
    const entries = checklistEntries(await readChecklists(payload)).filter((entry) =>
      entry.slug.startsWith(PREFIX),
    )
    expect(entries.map((entry) => entry.slug)).toEqual([
      `${PREFIX}-a`,
      `${PREFIX}-b`,
      `${PREFIX}-c`,
    ])
    expect(entries[0]).toMatchObject({ href: `/${PREFIX}-a`, color: '#7fd6c2' })
    expect(entries[0]!.egg?.src).toMatch(/\.(png|webp)$/)
    expect(entries[1]!.egg).toBeUndefined()
  })

  it('con la guía de su Dofus en borrador, el huevo y el color salen y nada más de ella', async () => {
    const docs = await readChecklists(payload)
    const doc = docs.find((d) => d.slug === `${PREFIX}-c`)!
    expect(Object.keys(doc.dofusGuide as object).sort()).toEqual(['color', 'dofus'])
    expect(JSON.stringify(doc)).not.toContain('Guía sin publicar')
    const [entry] = checklistEntries([doc])
    expect(entry).toMatchObject({ color: '#d18b23' })
    expect(entry!.egg?.src).toMatch(/\.(png|webp)$/)
  })
})
