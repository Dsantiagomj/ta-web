import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readSearchIndex } from '@/lib/search/read-index'

import { createPanelUser, startPayload, tinyPng } from './payload'

// El índice de la búsqueda también lleva las guías de Dofus, las checklists y las páginas
// sueltas, para la portada: lo que un visitante anónimo puede abrir, como en el menú, con el
// huevo que corrigió Torre.

let payload: Payload

const PREFIX = 'buscar-'
const ITEMS = [949001, 949002]

async function cleanUp() {
  const own = { slug: { like: PREFIX } }
  await payload.delete({ collection: 'checklists', where: own })
  await payload.delete({ collection: 'dofus-guides', where: own })
  await payload.delete({ collection: 'pages', where: own })
  await payload.delete({ collection: 'items', where: { dofusId: { in: ITEMS } } })
}

/** Las filas de contenido del índice que crearon estas pruebas, por enlace. */
async function rows() {
  const { content = [] } = await readSearchIndex(payload)
  return new Map(
    content.filter((row) => row[2].includes(PREFIX)).map((row) => [row[2], row] as const),
  )
}

let correctedEgg: string

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  const egg = await payload.create({
    collection: 'media',
    data: { alt: 'Huevo de DofusDB' },
    file: tinyPng(),
  })
  const fixed = await payload.create({
    collection: 'media',
    data: { alt: 'Huevo que subió Torre' },
    file: tinyPng(),
  })
  correctedEgg = fixed.filename!
  const item = await payload.create({
    collection: 'items',
    data: { dofusId: ITEMS[0], name: 'Dofus Buscado', image: egg.id },
  })
  // La corrección la escribe Torre desde el panel: sin usuario, no se guarda.
  await payload.update({
    collection: 'items',
    id: item.id,
    data: { correction: { image: fixed.id } },
    overrideAccess: false,
    user: await createPanelUser(payload, 'editor'),
  })
  const guide = await payload.create({
    collection: 'dofus-guides',
    data: {
      slug: `${PREFIX}dofus`,
      name: 'Dofus Buscado',
      order: 1,
      state: 'published',
      dofus: item.id,
      _status: 'published',
    } as never,
  })
  const other = await payload.create({
    collection: 'items',
    data: { dofusId: ITEMS[1], name: 'Dofus En Preparación', image: egg.id },
  })
  await payload.create({
    collection: 'dofus-guides',
    data: {
      slug: `${PREFIX}dofus-preparando`,
      name: 'Dofus En Preparación',
      order: 2,
      state: 'preparing',
      dofus: other.id,
      _status: 'published',
    } as never,
  })
  const checklists = [
    {
      slug: `${PREFIX}lista`,
      name: 'Lista publicada',
      order: 1,
      state: 'published',
      dofusGuide: guide.id,
      _status: 'published',
    },
    {
      slug: `${PREFIX}lista-vieja`,
      name: 'Lista vieja',
      order: 2,
      state: 'preparing',
      legacyHref: `https://www.torrentearcano.com/${PREFIX}lista-vieja`,
      _status: 'published',
    },
    {
      slug: `${PREFIX}lista-sin-enlace`,
      name: 'Lista sin enlace',
      order: 3,
      state: 'preparing',
      _status: 'published',
    },
    { slug: `${PREFIX}lista-borrador`, name: 'Lista borrador', order: 4, state: 'published' },
  ]
  for (const data of checklists) {
    await payload.create({ collection: 'checklists', data: data as never, draft: !data._status })
  }
  const pages = [
    {
      slug: `${PREFIX}pagina`,
      title: 'Página publicada',
      state: 'published',
      _status: 'published',
    },
    {
      slug: `${PREFIX}pagina-vieja`,
      title: 'Página vieja',
      state: 'preparing',
      legacyHref: `https://www.torrentearcano.com/${PREFIX}pagina-vieja`,
      _status: 'published',
    },
    { slug: `${PREFIX}pagina-borrador`, title: 'Página borrador', state: 'published' },
  ]
  for (const data of pages) {
    await payload.create({ collection: 'pages', data: data as never, draft: !data._status })
  }
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('el contenido del índice de búsqueda', () => {
  it('lleva la guía de Dofus Publicada con el huevo que corrigió Torre', async () => {
    const row = (await rows()).get(`/${PREFIX}dofus`)
    expect(row?.slice(0, 3)).toEqual(['dofus', 'Dofus Buscado', `/${PREFIX}dofus`])
    expect(row?.[3]).toContain(correctedEgg.replace(/\.png$/, ''))
  })

  it('no lleva una guía de Dofus En preparación: no tiene página', async () => {
    expect((await rows()).has(`/${PREFIX}dofus-preparando`)).toBe(false)
  })

  it('lleva las checklists como el menú: su página, o la de Squarespace si está En preparación', async () => {
    const found = await rows()
    expect(found.get(`/${PREFIX}lista`)?.slice(0, 2)).toEqual(['checklist', 'Lista publicada'])
    expect([...found.values()].find((row) => row[1] === 'Lista vieja')?.[2]).toBe(
      `https://www.torrentearcano.com/${PREFIX}lista-vieja`,
    )
    const names = [...found.values()].map((row) => row[1])
    expect(names).not.toContain('Lista sin enlace')
    expect(names).not.toContain('Lista borrador')
  })

  it('lleva solo las páginas Publicadas que se abren aquí', async () => {
    const found = await rows()
    expect(found.get(`/${PREFIX}pagina`)).toEqual([
      'pagina',
      'Página publicada',
      `/${PREFIX}pagina`,
      null,
    ])
    const names = [...found.values()].map((row) => row[1])
    expect(names).not.toContain('Página vieja')
    expect(names).not.toContain('Página borrador')
  })
})
