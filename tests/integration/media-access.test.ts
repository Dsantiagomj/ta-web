import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Media, User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// Permisos reales de `media` a través de la API local, con overrideAccess: false como
// cuando se renderiza para un visitante. Sin `user`, la petición es anónima.
describe('permisos de media', () => {
  let payload: Payload
  let editor: User
  let existing: Media

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
    existing = await payload.create({
      collection: 'media',
      data: { alt: 'Zaap de Astrub' },
      file: tinyPng(),
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.destroy()
  })

  describe('un visitante anónimo', () => {
    it('lee los archivos', async () => {
      const found = await payload.find({ collection: 'media', overrideAccess: false })
      expect(found.docs.map((doc) => doc.id)).toContain(existing.id)

      const byId = await payload.findByID({
        collection: 'media',
        id: existing.id,
        overrideAccess: false,
      })
      expect(byId.alt).toBe('Zaap de Astrub')
    })

    it('no sube archivos', async () => {
      await expect(
        payload.create({
          collection: 'media',
          data: { alt: 'Subida anónima' },
          file: tinyPng(),
          overrideAccess: false,
        }),
      ).rejects.toThrow(Forbidden)
    })

    it('no edita archivos', async () => {
      await expect(
        payload.update({
          collection: 'media',
          id: existing.id,
          data: { alt: 'Cambiado por un anónimo' },
          overrideAccess: false,
        }),
      ).rejects.toThrow(Forbidden)

      const unchanged = await payload.findByID({ collection: 'media', id: existing.id })
      expect(unchanged.alt).toBe('Zaap de Astrub')
    })

    it('no borra archivos', async () => {
      await expect(
        payload.delete({ collection: 'media', id: existing.id, overrideAccess: false }),
      ).rejects.toThrow(Forbidden)

      const stillThere = await payload.findByID({ collection: 'media', id: existing.id })
      expect(stillThere.id).toBe(existing.id)
    })
  })

  describe('un usuario del panel', () => {
    it('sube, edita y borra archivos', async () => {
      const created = await payload.create({
        collection: 'media',
        data: { alt: 'Dofus Ébano' },
        file: tinyPng(),
        overrideAccess: false,
        user: editor,
      })
      expect(created).toMatchObject({ alt: 'Dofus Ébano', width: 1, height: 1 })

      const updated = await payload.update({
        collection: 'media',
        id: created.id,
        data: { alt: 'Dofus Ébano, de frente' },
        overrideAccess: false,
        user: editor,
      })
      expect(updated.alt).toBe('Dofus Ébano, de frente')

      await payload.delete({
        collection: 'media',
        id: created.id,
        overrideAccess: false,
        user: editor,
      })
      const remaining = await payload.find({
        collection: 'media',
        where: { id: { equals: created.id } },
      })
      expect(remaining.totalDocs).toBe(0)
    })
  })
})
