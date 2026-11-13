import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refreshSubAreas } from '@/lib/dofusdb/refresh-subareas'
import type { RawArea, RawSubArea } from '@/lib/dofusdb/types'

import { startPayload } from './payload'

// El refresco de subzonas: guarda cada subzona con el nombre de su área, solo si cambia,
// y nunca borra una que DofusDB deje de dar.

const BASE = 996_000
const subAreas: RawSubArea[] = [
  { id: BASE + 1, name: { es: 'Caminos rocosos', fr: 'Chemins rocailleux' }, areaId: BASE + 50 },
  // El área 0 existe (Amakna): no es «sin área».
  { id: BASE + 2, name: { es: 'Puerto de prueba' }, areaId: 0 },
  // Sin área conocida: se guarda sin ella.
  { id: BASE + 3, name: { es: 'Subzona suelta' }, areaId: BASE + 99 },
]
const areas: RawArea[] = [
  { id: BASE + 50, name: { es: 'Llanuras de Cania' } },
  { id: 0, name: { es: 'Amakna' } },
]

let payload: Payload

const read = async (dofusId: number) =>
  (
    await payload.find({
      collection: 'subareas',
      where: { dofusId: { equals: dofusId } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]

beforeAll(async () => {
  payload = await startPayload()
  await payload.delete({ collection: 'subareas', where: { dofusId: { greater_than: BASE } } })
})

afterAll(async () => {
  await payload.delete({ collection: 'subareas', where: { dofusId: { greater_than: BASE } } })
  await payload.destroy()
})

describe('refreshSubAreas', () => {
  it('crea cada subzona con el nombre y el ID de su área', async () => {
    const counts = await refreshSubAreas(payload, { subAreas, areas })

    expect(counts).toEqual({ created: 3, updated: 0, unchanged: 0 })
    expect(await read(BASE + 1)).toMatchObject({
      name: 'Caminos rocosos',
      areaDofusId: BASE + 50,
      areaName: 'Llanuras de Cania',
    })
    expect(await read(BASE + 2)).toMatchObject({ areaDofusId: 0, areaName: 'Amakna' })
    const loose = await read(BASE + 3)
    expect(loose).toMatchObject({ name: 'Subzona suelta', areaDofusId: BASE + 99 })
    expect(loose?.areaName ?? null).toBeNull()
  })

  it('una segunda pasada con los mismos datos no escribe nada', async () => {
    const before = await read(BASE + 1)

    const counts = await refreshSubAreas(payload, { subAreas, areas })

    expect(counts).toEqual({ created: 0, updated: 0, unchanged: 3 })
    expect((await read(BASE + 1))?.updatedAt).toBe(before?.updatedAt)
  })

  it('actualiza solo lo que DofusDB cambió y no borra lo que deja de dar', async () => {
    const renamed = [{ ...subAreas[0], name: { es: 'Caminos pedregosos' } }]

    const counts = await refreshSubAreas(payload, { subAreas: renamed, areas })

    expect(counts).toEqual({ created: 0, updated: 1, unchanged: 0 })
    expect((await read(BASE + 1))?.name).toBe('Caminos pedregosos')
    expect(await read(BASE + 2)).toBeDefined()
  })
})
