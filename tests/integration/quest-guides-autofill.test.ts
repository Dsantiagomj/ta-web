import { ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { guideStrings } from '@/lib/guides/strings'
import type { Quest, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

const hunterDescription =
  'Guía paso a paso de la misión El cazador cazado de Dofus, de nivel 25: ' +
  'requisitos, recompensas (24 316 XP) y cómo completarla.'

// Torre elige la misión de DofusDB y, al guardar, la guía saca de ella lo que esté vacío.
describe('guía de misión rellenada desde DofusDB', () => {
  let payload: Payload
  let editor: User
  let hunter: Quest

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
    const previous = await payload.create({
      collection: 'quests',
      data: { dofusId: 1976, name: 'Seis pies bajo tierra' },
    })
    const fangs = await payload.create({
      collection: 'items',
      data: { dofusId: 2322, name: 'Colmillos de ratas', typeId: 47 },
    })
    const leather = await payload.create({
      collection: 'items',
      data: { dofusId: 304, name: 'Cuero de miserata strubiense', typeId: 56 },
    })
    hunter = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1977,
        name: 'El cazador cazado',
        levelMin: 25,
        startCriterion: 'Qf=1976',
        prerequisites: [previous.id],
        startPositions: [{ npcName: 'Kerubim Crepin', x: 3, y: -17 }],
        // En el orden de DofusDB; Torre los lista al revés
        rewards: {
          experience: 24_316,
          kamas: 552,
          items: [
            { item: fangs.id, quantity: 2 },
            { item: leather.id, quantity: 2 },
          ],
        },
      },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
    await payload.delete({ collection: 'items', where: { id: { exists: true } } })
    await payload.destroy()
  })

  function createGuide(data: Record<string, unknown>) {
    return payload.create({
      collection: 'quest-guides',
      data,
      draft: true,
      overrideAccess: false,
      user: editor,
    })
  }

  it('con solo la misión elegida, rellena título, slug y SEO', async () => {
    const guide = await createGuide({ quests: [hunter.id] })
    expect(guide).toMatchObject({
      title: 'El cazador cazado',
      slug: 'el-cazador-cazado',
      seo: {
        metaTitle: 'El cazador cazado: guía de la misión de Dofus',
        metaDescription: hunterDescription,
      },
    })
  })

  it('si el slug ya existe, le añade un sufijo', async () => {
    const guide = await createGuide({ quests: [hunter.id] })
    expect(guide.slug).toBe('el-cazador-cazado-2')
  })

  it('no sobrescribe lo que Torre ya escribió', async () => {
    const guide = await createGuide({
      quests: [hunter.id],
      title: 'Cazador, versión de Torre',
      slug: 'cazador-de-torre',
      seo: { metaTitle: 'Mi título SEO' },
    })
    expect(guide).toMatchObject({
      title: 'Cazador, versión de Torre',
      slug: 'cazador-de-torre',
      seo: { metaTitle: 'Mi título SEO', metaDescription: hunterDescription },
    })
  })

  it('sin título ni misión, la rechaza con un mensaje en español', async () => {
    const attempt = createGuide({ slug: 'sin-titulo' })
    await expect(attempt).rejects.toThrow(ValidationError)
    await expect(attempt).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: guideStrings.admin.titleRequired })] },
    })
  })

  it('al editar una guía importada, conserva su slug de Squarespace y su SEO', async () => {
    const imported = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'El cazador cazado (importada)',
        slug: 'el-cazador-cazado-de-squarespace',
        quests: [hunter.id],
        seo: { metaTitle: 'SEO importado' },
      },
      draft: true,
    })

    const updated = await payload.update({
      collection: 'quest-guides',
      id: imported.id,
      data: { title: 'El cazador cazado' },
      draft: true,
      overrideAccess: false,
      user: editor,
    })
    expect(updated).toMatchObject({
      title: 'El cazador cazado',
      slug: 'el-cazador-cazado-de-squarespace',
      // Solo se rellena lo que faltaba
      seo: { metaTitle: 'SEO importado', metaDescription: hunterDescription },
    })
  })

  it('con solo la misión elegida, guarda el resumen relleno con los datos de DofusDB', async () => {
    const guide = await createGuide({ quests: [hunter.id] })
    expect(guide.summary).toMatchObject({
      prerequisites: 'Seis pies bajo tierra.',
      rewards: '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
      startNpc: 'Kerubim Crepin',
      startX: 3,
      startY: -17,
    })
  })

  it('nunca sobrescribe un campo del resumen escrito', async () => {
    const guide = await createGuide({
      quests: [hunter.id],
      summary: { rewards: 'Lo que diga Torre.', startX: 0 },
    })
    expect(guide.summary).toMatchObject({
      rewards: 'Lo que diga Torre.',
      startX: 0,
      startNpc: 'Kerubim Crepin',
    })
  })

  it('un campo del resumen que se vacía se rellena de nuevo al guardar', async () => {
    const guide = await createGuide({ quests: [hunter.id] })
    const updated = await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { summary: { startNpc: '' } },
      draft: true,
      overrideAccess: false,
      user: editor,
    })
    expect(updated.summary).toMatchObject({
      startNpc: 'Kerubim Crepin',
      prerequisites: 'Seis pies bajo tierra.',
    })
  })
})
