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
  { id: 918201, name: { es: 'Llave doble' }, level: 1, typeId: 84, iconId: null },
  { id: 918202, name: { es: 'Llave Doble' }, level: 1, typeId: 84, iconId: null },
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

  it('una fila sin cantidad: solo el único objeto que se llama así, sin mirar tildes ni mayúsculas', async () => {
    const { client } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    // El Cacao: «Varita pitusa.» sin «1 x». Torre la escribe sin la tilde que no lleva.
    const varita = await items.findOnlyItem('varita pitusa')
    expect(varita).toEqual({ id: expect.any(Number), name: 'Varita pitusa', singular: false })
    const stored = await payload.findByID({ collection: 'items', id: varita!.id, depth: 0 })
    expect(stored).toMatchObject({ dofusId: 918102, name: 'Varita pitusa' })

    // Dos objetos con el mismo nombre: no se adivina, y no se crea ninguno.
    expect(await items.findOnlyItem('Llave doble')).toBeNull()
    const doubles = await payload.find({
      collection: 'items',
      where: { dofusId: { in: [918201, 918202] } },
    })
    expect(doubles.docs).toEqual([])

    expect(await items.findOnlyItem('Un par de combates por allí y por allá')).toBeNull()
  })

  it('en seco, la fila sin cantidad tampoco crea el objeto: su ID de DofusDB en negativo', async () => {
    const { client } = fakeClient()
    await payload.delete({ collection: 'items', where: { dofusId: { equals: 918102 } } })
    const items = gameItems(payload, { client, fetchImage, dryRun: true })
    expect(await items.findOnlyItem('Varita pitusa')).toEqual({
      id: -918102,
      name: 'Varita pitusa',
      singular: false,
    })
    expect(
      (await payload.find({ collection: 'items', where: { dofusId: { equals: 918102 } } })).docs,
    ).toEqual([])
  })

  it('un nombre en plural que no casa se prueba en singular, solo si casa un único objeto', async () => {
    const { client } = fakeClient()
    const items = gameItems(payload, { client, fetchImage })

    // «8 x Bananaranjas»: la Bananaranja, y se sabe que casó en singular.
    const banana = await items.matchItem('Bananaranjas')
    expect(banana).toEqual({ id: expect.any(Number), name: 'Bananaranja', singular: true })
    expect(await items.findItem('Bananaranjas')).toBe(banana!.id)
    // El nombre exacto sigue mandando: Pepita no pasa por el singular.
    expect(await items.matchItem('Pepita')).toMatchObject({ name: 'Pepita', singular: false })

    // «Flores»: «Flore» y «Flor» son dos objetos. No se adivina, en ninguna de las dos búsquedas.
    expect(await items.matchItem('Flores')).toBeNull()
    expect(await items.findOnlyItem('Flores')).toBeNull()

    // Sin cantidad, igual: «Bananaranjas.» es la Bananaranja.
    expect(await items.findOnlyItem('Bananaranjas')).toMatchObject({
      name: 'Bananaranja',
      singular: true,
    })
  })
})
