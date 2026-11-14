import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { gameItems } from '../../scripts/import/dofus-guides/game-items'
import type { DofusDbClient } from '@/lib/dofusdb/client'
import type { RawItem } from '@/lib/dofusdb/types'

import { startPayload, tinyPng } from './payload'

// Los objetos de las guías de Dofus: el propio Dofus y lo de Necesitarás. Lo que no está en
// la base se trae de DofusDB con su icono, una vez; lo que ya está no se toca.

let payload: Payload
const PNG = tinyPng().data

const RAW: RawItem[] = [
  { id: 918043, name: { es: 'Dofus abisal' }, level: 180, typeId: 23, iconId: 923023 },
  { id: 917298, name: { es: 'Piel de rojiva' }, level: 60, typeId: 15, iconId: 959042 },
  { id: 918102, name: { es: 'Varita pitusa' }, level: 1, typeId: 4, iconId: 904012 },
  // El mismo objeto dos veces en DofusDB (mismo nombre y tipo): vale el de ID más bajo.
  { id: 918201, name: { es: 'Llave doble' }, level: 1, typeId: 84, iconId: null },
  { id: 918202, name: { es: 'Llave doble' }, level: 1, typeId: 84, iconId: null },
  // Dos objetos distintos que se escriben casi igual: no se adivina.
  { id: 918203, name: { es: 'Capa doble' }, level: 1, typeId: 17, iconId: null },
  { id: 918204, name: { es: 'Capa Doble' }, level: 1, typeId: 16, iconId: null },
  { id: 918205, name: { es: 'Túnica de prueba' }, level: 1, typeId: 16, iconId: null },
  { id: 916834, name: { es: 'Bananaranja' }, level: 1, typeId: 41, iconId: null },
  { id: 918301, name: { es: 'Flor' }, level: 1, typeId: 41, iconId: null },
  { id: 918302, name: { es: 'Flore' }, level: 1, typeId: 41, iconId: null },
]
const RAW_IDS = RAW.map((row) => row.id)

/** Un DofusDB falso: sirve RAW por ID y por nombre, y apunta lo que le piden. */
function fakeClient() {
  const asked: string[] = []
  const client: DofusDbClient = {
    fetchAll: async () => {
      throw new Error('no se recorre ninguna colección')
    },
    fetchByIds: async <T>(_: string, ids: number[]) => {
      asked.push(`ids ${ids.join(',')}`)
      return RAW.filter((row) => ids.includes(row.id)) as T[]
    },
    fetchWhere: async <T>(_: string, query: Record<string, string | number>) => {
      asked.push(JSON.stringify(query))
      const exact = query['name.es']
      const pattern = query['name.es[$regex]']
      return RAW.filter((row) =>
        exact !== undefined
          ? row.name?.es === exact
          : new RegExp(String(pattern), 'i').test(row.name?.es ?? ''),
      ) as T[]
    },
  }
  return { client, asked }
}

const fetched: string[] = []
const fetchImage = async (url: string) => {
  fetched.push(url)
  return PNG
}

async function cleanUp() {
  await payload.delete({
    collection: 'items',
    where: { dofusId: { in: [...RAW_IDS, 914635] } },
  })
  await payload.delete({
    collection: 'media',
    where: { gameAsset: { like: 'dofusdb-item-image:9' } },
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  await payload.create({ collection: 'items', data: { dofusId: 914635, name: 'Pepita' } })
})

afterAll(async () => {
  await cleanUp()
})

describe('gameItems', () => {
  it('trae de DofusDB el Dofus que falta, con su icono, y la segunda vez lo reutiliza', async () => {
    const { client, asked } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    const id = await items.ensureItem(918043)
    const item = await payload.findByID({ collection: 'items', id: id!, depth: 0 })
    expect(item).toMatchObject({
      dofusId: 918043,
      name: 'Dofus abisal',
      level: 180,
      iconId: 923023,
    })
    expect(item.image).toEqual(expect.any(Number))
    expect(fetched).toEqual(['https://api.dofusdb.fr/img/items/923023.png'])

    expect(await items.ensureItem(918043)).toBe(id)
    expect(asked.filter((call) => call.startsWith('ids'))).toHaveLength(1)
  })

  it('en seco busca pero no crea nada: lo que importaría tiene un ID negativo', async () => {
    const { client } = fakeClient()
    const items = gameItems(payload, { client, fetchImage, dryRun: true })
    await payload.delete({ collection: 'items', where: { dofusId: { equals: 917298 } } })

    expect(await items.findItem('Piel de rojiva')).toBe(-917298)
    expect(
      (await payload.find({ collection: 'items', where: { dofusId: { equals: 917298 } } })).docs,
    ).toEqual([])
  })

  it('un objeto que ya estaba sin imagen (lo creó el refresco) recibe su icono, una vez', async () => {
    const { client } = fakeClient()
    await payload.delete({ collection: 'items', where: { dofusId: { equals: 918043 } } })
    await payload.create({
      collection: 'items',
      data: { dofusId: 918043, name: 'Dofus abisal', iconId: 923023 },
    })

    // En seco no escribe: el objeto sigue sin imagen.
    await gameItems(payload, { client, fetchImage, dryRun: true }).ensureItem(918043)
    const before = await payload.find({
      collection: 'items',
      where: { dofusId: { equals: 918043 } },
    })
    expect(before.docs[0]!.image).toBeFalsy()

    const items = gameItems(payload, { client, fetchImage })
    const id = await items.ensureItem(918043)
    const item = await payload.findByID({ collection: 'items', id: id!, depth: 0 })
    expect(item.image).toEqual(expect.any(Number))

    // Por su nombre, igual: Pepita estaba sin imagen; con su iconId, findItem le pone el icono.
    await payload.update({
      collection: 'items',
      where: { dofusId: { equals: 914635 } },
      data: { iconId: 914635 },
    })
    const pepita = await items.findItem('Pepita')
    expect((await payload.findByID({ collection: 'items', id: pepita!, depth: 0 })).image).toEqual(
      expect.any(Number),
    )
  })

  it('un ID que DofusDB no conoce no es un objeto', async () => {
    const { client } = fakeClient()
    expect(await gameItems(payload, { client, fetchImage }).ensureItem(999999)).toBeNull()
  })

  it('encuentra un objeto por su nombre: primero en la base, luego en DofusDB', async () => {
    const { client, asked } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    const pepita = await items.findItem('Pepita')
    expect(pepita).toEqual(expect.any(Number))
    expect(asked).toEqual([])

    // Torre escribe «Piel de Rojiva»: el nombre casa sin mayúsculas, como en el juego.
    const piel = await items.findItem('Piel de Rojiva')
    const item = await payload.findByID({ collection: 'items', id: piel!, depth: 0 })
    expect(item).toMatchObject({ dofusId: 917298, name: 'Piel de rojiva' })

    expect(await items.findItem('Algo que no existe')).toBeNull()
  })

  it('con cantidad o sin ella, la misma búsqueda: la base primero y DofusDB sin tildes ni mayúsculas', async () => {
    const { client, asked } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    // Pepita está en la base: ni se pregunta a DofusDB.
    expect(await items.matchItem('Pepita')).toMatchObject({ name: 'Pepita', singular: false })
    expect(asked).toEqual([])

    // El Cacao: «Varita pitusa.» sin «1 x», en minúsculas.
    const varita = await items.matchItem('varita pitusa')
    expect(varita).toEqual({
      id: expect.any(Number),
      name: 'Varita pitusa',
      singular: false,
    })
    const stored = await payload.findByID({ collection: 'items', id: varita!.id, depth: 0 })
    expect(stored).toMatchObject({ dofusId: 918102, name: 'Varita pitusa' })

    // Torre escribe «Tunica» sin la tilde: casa igual.
    expect(await items.matchItem('Tunica de prueba')).toMatchObject({ name: 'Túnica de prueba' })
    expect(await items.matchItem('Un par de combates por allí y por allá')).toBeNull()
  })

  it('repetidos: el de ID más bajo si son el mismo objeto (nombre y tipo); si no, nada', async () => {
    const { client } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    const llave = await items.matchItem('Llave doble')
    const stored = await payload.findByID({ collection: 'items', id: llave!.id, depth: 0 })
    expect(stored.dofusId).toBe(918201)
    // En singular, la misma regla.
    expect(await items.matchItem('Llaves dobles')).toMatchObject({ id: llave!.id, singular: true })

    // «Capa doble»: dos objetos distintos. No se adivina ni se crea ninguno.
    expect(await items.matchItem('Capa doble')).toBeNull()
    const capes = await payload.find({
      collection: 'items',
      where: { dofusId: { in: [918203, 918204] } },
    })
    expect(capes.docs).toEqual([])
  })

  it('en seco no crea el objeto: su ID de DofusDB en negativo', async () => {
    const { client } = fakeClient()
    await payload.delete({ collection: 'items', where: { dofusId: { equals: 918102 } } })
    const items = gameItems(payload, { client, fetchImage, dryRun: true })
    expect(await items.matchItem('Varita pitusa')).toEqual({
      id: -918102,
      name: 'Varita pitusa',
      singular: false,
    })
    expect(
      (await payload.find({ collection: 'items', where: { dofusId: { equals: 918102 } } })).docs,
    ).toEqual([])
  })

  it('un nombre en plural que no casa se prueba en singular, y se apunta para el informe', async () => {
    const { client } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    // «8 x Bananaranjas»: la Bananaranja, y se sabe que casó en singular.
    const banana = await items.matchItem('Bananaranjas')
    expect(banana).toEqual({
      id: expect.any(Number),
      name: 'Bananaranja',
      singular: true,
    })
    expect(await items.findItem('Bananaranjas')).toBe(banana!.id)

    // «Flores»: «Flore» y «Flor» son dos objetos. No se adivina.
    expect(await items.matchItem('Flores')).toBeNull()

    // Lo que casó en singular, ordenado: las checklists lo listan al final.
    expect(items.singularMatches()).toEqual([{ name: 'Bananaranjas', item: 'Bananaranja' }])
  })
})
