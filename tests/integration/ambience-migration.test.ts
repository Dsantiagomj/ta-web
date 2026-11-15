import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AMBIENCE_FROM_LEGACY } from '../../src/migrations/20261115_191357_editable_missing_fields'

import { startPayload } from './payload'

// El ambiente de las checklists que ya existían: el Hielos y el Silvestre conservan el suyo al
// pasar del reparto por id antiguo al campo «Ambiente».

let payload: Payload

const SLUGS = ['prueba-ambiente-hielos', 'prueba-ambiente-silvestre', 'prueba-ambiente-otra']

beforeAll(async () => {
  payload = await startPayload()
  await payload.delete({ collection: 'checklists', where: { slug: { in: SLUGS } } })
})

afterAll(async () => {
  await payload.delete({ collection: 'checklists', where: { slug: { in: SLUGS } } })
  await payload.destroy()
})

describe('la migración del ambiente', () => {
  it('el Hielos nieva, el Silvestre tiene luciérnagas y las demás siguen con las motas', async () => {
    const [prefixes, order] = [['hielos:', 'silvestre:', 'nebuloso:'], 990]
    const ids = []
    for (const [index, slug] of SLUGS.entries()) {
      const created = await payload.create({
        collection: 'checklists',
        data: {
          name: slug,
          slug,
          order: order + index,
          state: 'preparing',
          legacy: { prefix: prefixes[index] },
          _status: 'draft',
        },
        draft: true,
      })
      ids.push(created.id)
    }
    await payload.db.drizzle.execute(AMBIENCE_FROM_LEGACY)

    const ambienceOf = async (id: number) =>
      (await payload.findByID({ collection: 'checklists', id, draft: true, depth: 0 })).ambience
    expect(await ambienceOf(ids[0]!)).toBe('snow')
    expect(await ambienceOf(ids[1]!)).toBe('forest')
    expect(await ambienceOf(ids[2]!)).toBe('egg')
  })
})
