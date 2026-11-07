import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Objetos, monstruos, logros y categorías de logros son datos de DofusDB de solo lectura,
// como las misiones: se leen sin sesión y solo los escribe el script de refresco, con
// overrideAccess: true.
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

  // Un campo propio de cada colección, para comprobar que se lee lo que guardó el script.
  describe.each([
    { collection: 'items', extra: { iconId: 7 } },
    { collection: 'monsters', extra: { iconId: 7 } },
    { collection: 'achievements', extra: { points: 10 } },
    { collection: 'achievement-categories', extra: { order: 13 } },
  ] as const)('$collection', ({ collection, extra }) => {
    let existingId: number

    beforeAll(async () => {
      await payload.delete({ collection, where: { dofusId: { in: [9001, 9002] } } })
      const existing = await payload.create({
        collection,
        data: { dofusId: 9001, name: 'Del script', ...extra },
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
      expect(byId).toMatchObject({ dofusId: 9001, name: 'Del script', ...extra })
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
