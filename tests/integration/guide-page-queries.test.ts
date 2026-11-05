import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findGuideBySlug, findPublishedGuideLinks } from '@/lib/guides/queries'
import type { Quest, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Lo que lee la página pública /<slug>: siempre con overrideAccess: false. Un visitante
// solo ve lo publicado; la vista previa de un usuario del panel ve el último borrador.
describe('consultas de la página de guía', () => {
  let payload: Payload
  let editor: User
  let previousQuest: Quest
  let draftOnlyQuest: Quest

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)

    const beak = await payload.create({
      collection: 'items',
      data: { dofusId: 366, name: 'Pico de tofu', superTypeId: 9 },
    })
    previousQuest = await payload.create({
      collection: 'quests',
      data: { dofusId: 1975, name: 'Esto hace aguas' },
    })
    draftOnlyQuest = await payload.create({
      collection: 'quests',
      data: { dofusId: 1974, name: 'Una misión sin guía publicada' },
    })
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1976,
        name: 'Seis pies bajo tierra',
        levelMin: 20,
        prerequisites: [previousQuest.id],
        rewards: { experience: 16380, kamas: 390, items: [{ item: beak.id, quantity: 1 }] },
      },
    })

    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Esto hace aguas',
        slug: 'esto-hace-aguas',
        quest: previousQuest.id,
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Sin publicar',
        slug: 'sin-publicar',
        quest: draftOnlyQuest.id,
        _status: 'draft',
      },
      draft: true,
    })
    const published = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Seis pies bajo tierra',
        slug: 'seis-pies-bajo-tierra',
        quest: quest.id,
        _status: 'published',
      },
    })
    // Torre empieza a cambiarla: el borrador no sustituye a lo publicado.
    await payload.update({
      collection: 'quest-guides',
      id: published.id,
      data: { title: 'Seis pies bajo tierra (borrador)' },
      draft: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
    await payload.delete({ collection: 'items', where: { id: { exists: true } } })
    await payload.destroy()
  })

  describe('un visitante', () => {
    it('lee la guía publicada con su misión y sus recompensas pobladas', async () => {
      const guide = await findGuideBySlug(payload, 'seis-pies-bajo-tierra')
      expect(guide?.title).toBe('Seis pies bajo tierra')
      expect(guide?.quest).toMatchObject({
        name: 'Seis pies bajo tierra',
        levelMin: 20,
        prerequisites: [expect.objectContaining({ name: 'Esto hace aguas' })],
        rewards: { items: [{ item: expect.objectContaining({ name: 'Pico de tofu' }) }] },
      })
    })

    it('no ve una guía que solo es borrador', async () => {
      expect(await findGuideBySlug(payload, 'sin-publicar')).toBeNull()
    })

    it('no encuentra un slug que no existe, mal escrito o reservado', async () => {
      expect(await findGuideBySlug(payload, 'no-existe')).toBeNull()
      expect(await findGuideBySlug(payload, 'Seis-Pies')).toBeNull()
      expect(await findGuideBySlug(payload, 'sistema')).toBeNull()
    })
  })

  describe('la vista previa de un usuario del panel', () => {
    it('ve el último borrador de una guía publicada', async () => {
      const guide = await findGuideBySlug(payload, 'seis-pies-bajo-tierra', {
        preview: { user: editor },
      })
      expect(guide?.title).toBe('Seis pies bajo tierra (borrador)')
    })

    it('ve una guía que solo es borrador', async () => {
      const guide = await findGuideBySlug(payload, 'sin-publicar', { preview: { user: editor } })
      expect(guide?.title).toBe('Sin publicar')
    })

    it('sin usuario, la vista previa no enseña borradores', async () => {
      const guide = await findGuideBySlug(payload, 'sin-publicar', { preview: { user: null } })
      expect(guide).toBeNull()
    })
  })

  describe('los enlaces de Requiere', () => {
    it('solo enlazan las misiones previas con guía publicada', async () => {
      const links = await findPublishedGuideLinks(payload, [previousQuest.id, draftOnlyQuest.id])
      expect(links).toEqual([{ questId: previousQuest.id, slug: 'esto-hace-aguas' }])
      expect(await findPublishedGuideLinks(payload, [])).toEqual([])
    })
  })
})
