import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las cuentas del panel no son públicas: un anónimo no las lista, no las lee, no las
// crea ni las cambia. El primer usuario se crea desde /admin con la base vacía.
describe('permisos de users para un visitante anónimo', () => {
  let payload: Payload
  let editor: User

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
  })

  afterAll(async () => {
    await payload.destroy()
  })

  it('no lista los usuarios del panel', async () => {
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toThrow(
      Forbidden,
    )
  })

  it('no lee un usuario del panel', async () => {
    await expect(
      payload.findByID({ collection: 'users', id: editor.id, overrideAccess: false }),
    ).rejects.toThrow(Forbidden)
  })

  it('no crea usuarios del panel', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'intruso@torrentearcano.test', password: 'una-clave-cualquiera' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)

    const intruders = await payload.find({
      collection: 'users',
      where: { email: { equals: 'intruso@torrentearcano.test' } },
    })
    expect(intruders.totalDocs).toBe(0)
  })

  it('no cambia ni borra un usuario del panel', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: editor.id,
        data: { email: 'robado@torrentearcano.test' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)

    await expect(
      payload.delete({ collection: 'users', id: editor.id, overrideAccess: false }),
    ).rejects.toThrow(Forbidden)

    const unchanged = await payload.findByID({ collection: 'users', id: editor.id })
    expect(unchanged.email).toBe(editor.email)
  })

  // El nombre de la cuenta (panel, ola 1): una columna nueva, con su migración.
  it('una cuenta del panel guarda su nombre', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { name: 'Torre' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.name).toBe('Torre')
  })
})
