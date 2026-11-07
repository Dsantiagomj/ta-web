import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  findGuideBySlug,
  findNextQuest,
  findPublishedGuideLinks,
  findQuestGiver,
} from '@/lib/guides/queries'
import type { Quest, User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

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

    const beakIcon = await payload.create({
      collection: 'media',
      data: { alt: 'Pico de tofu', gameAsset: 'dofusdb-item-image:47037' },
      file: tinyPng(),
    })
    const beak = await payload.create({
      collection: 'items',
      data: { dofusId: 366, name: 'Pico de tofu', superTypeId: 9, image: beakIcon.id },
    })
    const ramanImage = await payload.create({
      collection: 'media',
      data: { alt: 'Ramán famélico', gameAsset: 'dofusdb-monster-image:241' },
      file: tinyPng(),
    })
    const raman = await payload.create({
      collection: 'monsters',
      data: { dofusId: 5281, name: 'Ramán famélico', iconId: 241, image: ramanImage.id },
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
        achievement: { dofusId: 1671, name: 'La ocasión hace al ladrón', position: 2, total: 3 },
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
        body: [{ blockType: 'fight', monsters: [{ monster: raman.id, quantity: 1 }] }],
      },
    })
    // La siguiente misión del logro, con su guía publicada y una captura en su primer paso.
    const hunter = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1977,
        name: 'El cazador cazado',
        levelMin: 25,
        achievement: { dofusId: 1671, position: 3, total: 3 },
        startPositions: [{ npcName: 'Kerubim Crepin', x: 3, y: -17 }],
      },
    })
    const screenshot = await payload.create({
      collection: 'media',
      data: { alt: 'Kerubim en su casa', gameAsset: 'prueba-captura-kerubim' },
      file: tinyPng(),
    })
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'El cazador cazado',
        slug: 'el-cazador-cazado',
        quest: hunter.id,
        _status: 'published',
        body: [
          { blockType: 'step', x: 3, y: -17, body: [{ blockType: 'image', image: screenshot.id }] },
        ],
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
    await payload.delete({ collection: 'monsters', where: { id: { exists: true } } })
    await payload.delete({ collection: 'npcs', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { gameAsset: { exists: true } } })
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

    it('lee los iconos de los objetos y las imágenes de los monstruos de los combates', async () => {
      const guide = await findGuideBySlug(payload, 'seis-pies-bajo-tierra')
      const quest = guide?.quest as Quest
      const beak = quest.rewards?.items?.[0]?.item as { image?: { gameAsset?: string } }
      expect(beak.image).toMatchObject({ gameAsset: 'dofusdb-item-image:47037' })
      expect(guide?.body?.[0]).toMatchObject({
        blockType: 'fight',
        monsters: [
          {
            quantity: 1,
            monster: {
              name: 'Ramán famélico',
              image: expect.objectContaining({ gameAsset: 'dofusdb-monster-image:241' }),
            },
          },
        ],
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

  describe('el PNJ de la misión', () => {
    it('un visitante lee el PNJ por su ID de DofusDB, con sus renders poblados', async () => {
      const render = await payload.create({
        collection: 'media',
        data: { alt: 'Hupe Esse', gameAsset: 'dofusdb-npc-render:4412:right:prueba' },
        file: tinyPng(),
      })
      await payload.create({
        collection: 'npcs',
        data: { dofusId: 4412, name: 'Hupe Esse', look: '{74}', renderRight: render.id },
      })

      const giver = await findQuestGiver(payload, 4412)
      expect(giver).toMatchObject({ name: 'Hupe Esse', renderRight: { id: render.id } })
      expect(await findQuestGiver(payload, 999_999)).toBeNull()
      expect(await findQuestGiver(payload, null)).toBeNull()
    })
  })

  describe('la siguiente misión del logro', () => {
    it('la misión de la posición siguiente y su guía publicada, con sus imágenes', async () => {
      const next = await findNextQuest(payload, { dofusId: 1671, position: 2 })
      expect(next?.quest).toMatchObject({ name: 'El cazador cazado', levelMin: 25 })
      expect(next?.guide).toMatchObject({ title: 'El cazador cazado', slug: 'el-cazador-cazado' })
      const step = next?.guide?.body?.[0] as { body?: { image?: unknown }[] }
      expect(step.body?.[0]?.image).toMatchObject({ alt: 'Kerubim en su casa' })
    })

    it('sin misión siguiente, o sin logro, nada', async () => {
      expect(await findNextQuest(payload, { dofusId: 1671, position: 3 })).toBeNull()
      expect(await findNextQuest(payload, null)).toBeNull()
      expect(await findNextQuest(payload, { dofusId: 1671 })).toBeNull()
    })

    it('con la siguiente misión sin guía publicada, la misión y ninguna guía', async () => {
      const lone = await payload.create({
        collection: 'quests',
        data: { dofusId: 1978, name: 'Sin guía', achievement: { dofusId: 1672, position: 2 } },
      })
      const next = await findNextQuest(payload, { dofusId: 1672, position: 1 })
      expect(next).toMatchObject({ quest: { id: lone.id }, guide: null })
    })
  })
})
