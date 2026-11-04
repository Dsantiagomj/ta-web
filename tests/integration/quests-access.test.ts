import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Quest, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las misiones son datos de DofusDB de solo lectura: se leen sin sesión y solo las
// escribe el script de refresco, con la API local y overrideAccess: true.
describe('permisos de quests', () => {
  let payload: Payload
  let editor: User
  let existing: Quest

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
    existing = await payload.create({
      collection: 'quests',
      data: { dofusId: 1001, name: 'Aprendizaje: Escudero', levelMin: 30, levelMax: 60 },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
    await payload.destroy()
  })

  describe('un visitante anónimo', () => {
    it('lee las misiones', async () => {
      const found = await payload.find({ collection: 'quests', overrideAccess: false })
      expect(found.docs.map((doc) => doc.id)).toContain(existing.id)

      const byId = await payload.findByID({
        collection: 'quests',
        id: existing.id,
        overrideAccess: false,
      })
      expect(byId).toMatchObject({ dofusId: 1001, name: 'Aprendizaje: Escudero' })
    })
  })

  describe('un usuario del panel', () => {
    it('no crea misiones', async () => {
      await expect(
        payload.create({
          collection: 'quests',
          data: { dofusId: 1002, name: 'Creada desde el panel' },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow(Forbidden)

      const created = await payload.find({
        collection: 'quests',
        where: { dofusId: { equals: 1002 } },
      })
      expect(created.totalDocs).toBe(0)
    })

    it('no edita misiones', async () => {
      await expect(
        payload.update({
          collection: 'quests',
          id: existing.id,
          data: { name: 'Cambiada desde el panel' },
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow(Forbidden)

      const unchanged = await payload.findByID({ collection: 'quests', id: existing.id })
      expect(unchanged.name).toBe('Aprendizaje: Escudero')
    })

    it('no borra misiones', async () => {
      await expect(
        payload.delete({
          collection: 'quests',
          id: existing.id,
          overrideAccess: false,
          user: editor,
        }),
      ).rejects.toThrow(Forbidden)

      const stillThere = await payload.findByID({ collection: 'quests', id: existing.id })
      expect(stillThere.id).toBe(existing.id)
    })
  })

  describe('el script de refresco', () => {
    it('crea misiones con prerrequisitos y posiciones de inicio', async () => {
      const refreshedAt = new Date().toISOString()
      const created = await payload.create({
        collection: 'quests',
        data: {
          dofusId: 1003,
          name: 'Aprendizaje: Caballero',
          startCriterion: 'Ps=1&Pa=1&PL>29&Qf=1001',
          prerequisites: [existing.id],
          startPositions: [{ npcId: 42, npcName: 'Maestro de armas', mapId: 7, x: 5, y: -18 }],
          refreshedAt,
        },
        overrideAccess: true,
      })

      expect(created).toMatchObject({
        dofusId: 1003,
        startCriterion: 'Ps=1&Pa=1&PL>29&Qf=1001',
        startPositions: [{ npcId: 42, npcName: 'Maestro de armas', mapId: 7, x: 5, y: -18 }],
        refreshedAt,
      })
      expect(created.prerequisites).toEqual([expect.objectContaining({ id: existing.id })])
    })
  })
})
