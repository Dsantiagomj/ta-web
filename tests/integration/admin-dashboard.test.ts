import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readDashboard } from '@/lib/admin/dashboard'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// A-13: el panel de control «Pendiente» lee de la base de verdad, como la cuenta del panel.
// La base la comparten todos los archivos: se mira solo lo que crea esta prueba.

const PREFIX = 'pendiente-prueba'
let payload: Payload
let editor: User

async function clean() {
  for (const collection of ['checklists', 'dofus-guides', 'quest-guides'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
}

const asEditor = () => ({ user: editor, overrideAccess: false }) as const

beforeAll(async () => {
  payload = await startPayload()
  editor = await createPanelUser(payload)
  await clean()
})

afterAll(async () => {
  await clean()
  await payload.destroy()
})

describe('readDashboard', () => {
  it('separa lo nunca publicado de los cambios sin publicar, y lee «En preparación»', async () => {
    const neverPublished = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Pendiente: nunca publicada', slug: `${PREFIX}-nueva`, _status: 'draft' },
      draft: true,
      ...asEditor(),
    })
    const changed = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Pendiente: publicada', slug: `${PREFIX}-publicada`, _status: 'published' },
      ...asEditor(),
    })
    await payload.update({
      collection: 'quest-guides',
      id: changed.id,
      data: { title: 'Pendiente: retocada', _status: 'draft' },
      draft: true,
      ...asEditor(),
    })
    const preparing = await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus pendiente',
        slug: `${PREFIX}-dofus`,
        order: 900,
        state: 'preparing',
        _status: 'published',
      },
      ...asEditor(),
    })

    const dashboard = await readDashboard(payload, editor)

    const drafts = dashboard.drafts.items.filter((item) => item.collection === 'quest-guides')
    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: neverPublished.id, neverPublished: true }),
        // La última versión manda: el título que se enseña es el del borrador.
        expect.objectContaining({
          id: changed.id,
          title: 'Pendiente: retocada',
          neverPublished: false,
        }),
      ]),
    )

    const dofusGroup = dashboard.preparing.find((group) => group.collection === 'dofus-guides')
    expect(dofusGroup?.label).toBe('Guías de Dofus')
    expect(dofusGroup?.items.map((item) => item.id)).toContain(preparing.id)
    expect(dofusGroup?.listHref).toContain('/admin/collections/dofus-guides?where')

    expect(dashboard.recent[0]?.updatedAt >= (dashboard.recent.at(-1)?.updatedAt ?? '')).toBe(true)
  })

  it('un Dofus sin enlace de checklist sale con la checklist que ya apunta a él', async () => {
    const linked = await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus con checklist',
        slug: `${PREFIX}-con-enlace`,
        order: 901,
        state: 'published',
        checklist: { name: 'Su checklist', url: 'https://torrentearcano.com/su-checklist' },
        _status: 'published',
      },
      ...asEditor(),
    })
    const missing = await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus sin enlace',
        slug: `${PREFIX}-sin-enlace`,
        order: 902,
        state: 'published',
        _status: 'published',
      },
      ...asEditor(),
    })
    await payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist del Dofus sin enlace',
        slug: `${PREFIX}-checklist`,
        order: 900,
        state: 'preparing',
        dofusGuide: missing.id,
        _status: 'draft',
      },
      draft: true,
      ...asEditor(),
    })

    const { dofusWithoutChecklist } = await readDashboard(payload, editor)
    const ids = dofusWithoutChecklist.items.map((item) => item.id)
    expect(ids).not.toContain(linked.id)
    expect(dofusWithoutChecklist.items.find((item) => item.id === missing.id)).toMatchObject({
      title: 'Dofus sin enlace',
      checklistName: 'Checklist del Dofus sin enlace',
      href: `/admin/collections/dofus-guides/${missing.id}`,
    })
  })
})
