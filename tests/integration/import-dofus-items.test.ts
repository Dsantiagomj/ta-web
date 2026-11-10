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
]

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
    where: { dofusId: { in: [918043, 917298, 914635] } },
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
})
