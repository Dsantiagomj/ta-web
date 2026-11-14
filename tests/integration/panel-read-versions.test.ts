import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// A-16: la línea «En la web» cuenta los borradores sin publicar con lo que Payload sabe de
// las versiones. Sin permiso para leerlas, Payload diría que no hay ninguno y la línea
// callaría los cambios. Un editor (A-15) tiene que poder leerlas en las cinco colecciones.

const EDITORIAL = [
  'quest-guides',
  'achievement-pages',
  'achievement-groups',
  'dofus-guides',
  'checklists',
] as const

let payload: Payload
let editor: User

beforeAll(async () => {
  payload = await startPayload()
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await payload.destroy()
})

describe('las versiones de las colecciones de Torre', () => {
  it.each(EDITORIAL)('un editor lee las versiones de %s', async (collection) => {
    const versions = await payload.findVersions({
      collection,
      user: editor,
      overrideAccess: false,
      limit: 1,
    })
    expect(Array.isArray(versions.docs)).toBe(true)
  })

  it('un visitante anónimo no las lee', async () => {
    await expect(
      payload.findVersions({ collection: 'quest-guides', overrideAccess: false, limit: 1 }),
    ).rejects.toThrow()
  })
})
