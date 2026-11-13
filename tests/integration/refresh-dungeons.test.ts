import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { refreshDungeons } from '@/lib/dofusdb/refresh-dungeons'
import type { Dungeon } from '@/payload-types'

import { startPayload } from './payload'

// Las mazmorras de DofusDB con sus jefes: se guardan por su ID de DofusDB y enlazan los
// monstruos ya guardados. Un jefe que no está se omite y se cuenta.

const DUNGEON_IDS = [990_131, 990_143]
const MONSTER_IDS = [990_394, 990_395]

let payload: Payload
let kumijo: number

beforeAll(async () => {
  payload = await startPayload()
})

afterAll(async () => {
  await payload.destroy()
})

beforeEach(async () => {
  await payload.delete({ collection: 'dungeons', where: { dofusId: { in: DUNGEON_IDS } } })
  await payload.delete({ collection: 'monsters', where: { dofusId: { in: MONSTER_IDS } } })
  kumijo = (
    await payload.create({ collection: 'monsters', data: { dofusId: 990_394, name: 'Kumijo' } })
  ).id
})

async function stored(): Promise<Dungeon[]> {
  const { docs } = await payload.find({
    collection: 'dungeons',
    where: { dofusId: { in: DUNGEON_IDS } },
    sort: 'dofusId',
    depth: 0,
  })
  return docs
}

const RAW = [
  {
    id: 990_131,
    name: { es: 'Casa de los Espíritus', fr: 'Maison des Esprits' },
    bosses: [990_394],
  },
  // Una expedición: sin jefe, y uno que no está en monsters.
  { id: 990_143, name: { es: 'Expedición - Tofullinero Real' }, bosses: [990_999] },
]

describe('refresco de mazmorras desde DofusDB', () => {
  it('guarda cada mazmorra con su nombre en español y enlaza sus jefes', async () => {
    const counts = await refreshDungeons(payload, RAW)

    const [casa, expedicion] = await stored()
    expect(casa).toMatchObject({
      dofusId: 990_131,
      name: 'Casa de los Espíritus',
      bosses: [kumijo],
    })
    expect(expedicion).toMatchObject({ name: 'Expedición - Tofullinero Real', bosses: [] })
    expect(counts).toEqual({ created: 2, updated: 0, unchanged: 0, missingBosses: 1 })
  })

  it('repetido con los mismos datos no cambia nada; con un jefe nuevo, lo enlaza', async () => {
    await refreshDungeons(payload, RAW)
    expect(await refreshDungeons(payload, RAW)).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 2,
    })

    const otro = (
      await payload.create({ collection: 'monsters', data: { dofusId: 990_395, name: 'Otro' } })
    ).id
    const changed = structuredClone(RAW)
    changed[0]!.bosses = [990_395, 990_394]
    expect(await refreshDungeons(payload, changed)).toMatchObject({ updated: 1, unchanged: 1 })
    const [casa] = await stored()
    // En el orden de DofusDB: la página pinta el primero.
    expect(casa!.bosses).toEqual([otro, kumijo])
  })
})
