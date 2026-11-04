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
    hunter = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1977,
        name: 'El cazador cazado',
        levelMin: 25,
        rewards: { experience: 24_316, kamas: 552 },
      },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
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
})
