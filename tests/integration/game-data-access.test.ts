import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Objetos y monstruos son datos de DofusDB de solo lectura, como las misiones: se leen
// sin sesión y solo los escribe el script de refresco, con overrideAccess: true.
describe('permisos de los datos del juego', () => {
  let payload: Payload
  let editor: User

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
  })

  afterAll(async () => {
    await payload.destroy()
  })

  describe.each(['items', 'monsters'] as const)('%s', (collection) => {
    let existingId: number

    beforeAll(async () => {
      await payload.delete({ collection, where: { dofusId: { in: [9001, 9002] } } })
      const existing = await payload.create({
        collection,
        data: { dofusId: 9001, name: 'Del script', iconId: 7 },
      })
      existingId = existing.id
    })

    afterAll(async () => {
      await payload.delete({ collection, where: { dofusId: { in: [9001, 9002] } } })
    })

    it('un visitante anónimo los lee', async () => {
      const found = await payload.find({ collection, overrideAccess: false })
      expect(found.docs.map((doc) => doc.id)).toContain(existingId)

      const byId = await payload.findByID({ collection, id: existingId, overrideAccess: false })
      expect(byId).toMatchObject({ dofusId: 9001, name: 'Del script', iconId: 7 })
    })

    it('un usuario del panel no los crea', async () => {
      await expect(
        payload.create({
          collection,
          data: { dofusId: 9002, name: 'Creado desde el panel' },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow(Forbidden)

      const created = await payload.find({ collection, where: { dofusId: { equals: 9002 } } })
      expect(created.totalDocs).toBe(0)
    })

    it('un usuario del panel no los edita', async () => {
      await expect(
        payload.update({
          collection,
          id: existingId,
          data: { name: 'Cambiado desde el panel' },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow(Forbidden)

      const unchanged = await payload.findByID({ collection, id: existingId })
      expect(unchanged.name).toBe('Del script')
    })

    it('un usuario del panel no los borra', async () => {
      await expect(
        payload.delete({ collection, id: existingId, overrideAccess: false, user: editor }),
      ).rejects.toThrow(Forbidden)

      const stillThere = await payload.findByID({ collection, id: existingId })
      expect(stillThere.id).toBe(existingId)
    })
  })
})
