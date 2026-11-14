import { Forbidden, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las guías de Dofus de Torre: el visitante solo lee lo publicado, Torre lo edita todo desde
// el panel, y su slug no puede ser el de una guía, un logro o un metalogro.

let payload: Payload
let editor: User

const PREFIX = 'prueba-dofus'

async function cleanUp() {
  await payload.delete({
    collection: 'dofus-guides',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
})

afterAll(async () => {
  await cleanUp()
})

const guide = (slug: string, order: number) => ({
  name: `Dofus de prueba ${order}`,
  slug,
  order,
  state: 'published' as const,
  level: 180,
  tag: 'primordial' as const,
  color: '#2a5aaa',
})

describe('acceso a las guías de Dofus', () => {
  it('un visitante solo lee las publicadas; Torre ve también los borradores', async () => {
    await payload.create({
      collection: 'dofus-guides',
      data: { ...guide(`${PREFIX}-publicada`, 1), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await payload.create({
      collection: 'dofus-guides',
      data: { ...guide(`${PREFIX}-borrador`, 2), _status: 'draft' },
      draft: true,
      user: editor,
      overrideAccess: false,
    })

    const where = { slug: { like: PREFIX } }
    const visitor = await payload.find({ collection: 'dofus-guides', where, overrideAccess: false })
    expect(visitor.docs.map((doc) => doc.slug)).toEqual([`${PREFIX}-publicada`])

    const panel = await payload.find({
      collection: 'dofus-guides',
      where,
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    expect(panel.docs.map((doc) => doc.slug).sort()).toEqual([
      `${PREFIX}-borrador`,
      `${PREFIX}-publicada`,
    ])
  })

  it('un visitante no puede crear, cambiar ni borrar una guía de Dofus', async () => {
    await expect(
      payload.create({
        collection: 'dofus-guides',
        data: guide(`${PREFIX}-anonima`, 3),
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
    const [published] = (
      await payload.find({
        collection: 'dofus-guides',
        where: { slug: { equals: `${PREFIX}-publicada` } },
      })
    ).docs
    await expect(
      payload.update({
        collection: 'dofus-guides',
        id: published!.id,
        data: { name: 'Otro' },
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
    await expect(
      payload.delete({ collection: 'dofus-guides', id: published!.id, overrideAccess: false }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('guarda Necesitarás por grupos y los logros y misiones en orden', async () => {
    const created = await payload.create({
      collection: 'dofus-guides',
      data: {
        ...guide(`${PREFIX}-completa`, 4),
        needs: {
          groups: [
            {
              name: 'recursos',
              rows: [
                { blockType: 'needItem', quantity: 200, name: 'Pepita' },
                { blockType: 'needItem', quantity: 1, name: 'Sello', note: '(o fabricarlo)' },
              ],
            },
            { name: 'mazmorras', rows: [] },
          ],
        },
        parts: [],
        video: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ',
        checklist: { name: 'Checklist', url: 'https://www.torrentearcano.com/checklist' },
      },
      user: editor,
      overrideAccess: false,
    })
    const rows = created.needs?.groups?.[0]?.rows ?? []
    expect(rows.map((row) => row.blockType === 'needItem' && row.name)).toEqual(['Pepita', 'Sello'])
    expect(created.needs?.groups?.[1]?.name).toBe('mazmorras')
  })

  it('el grupo de Necesitarás se elige de la lista fija: sin grupo o con otro, no se guarda', async () => {
    for (const name of [undefined, 'Recursos y otras movidas']) {
      await expect(
        payload.create({
          collection: 'dofus-guides',
          data: {
            ...guide(`${PREFIX}-grupo-libre`, 5),
            needs: { groups: [{ name, rows: [] }] },
          } as never,
          user: editor,
          overrideAccess: false,
        }),
      ).rejects.toThrow(/Grupos 1 > Grupo/)
    }
  })
})

describe('el slug de una guía de Dofus en la raíz', () => {
  it('no puede ser el de una guía de misión, ni al revés', async () => {
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía de prueba', slug: `${PREFIX}-compartido` },
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'dofus-guides',
        data: guide(`${PREFIX}-compartido`, 5),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await payload.create({
      collection: 'dofus-guides',
      data: guide(`${PREFIX}-solo-dofus`, 6),
      user: editor,
      overrideAccess: false,
    })
    await expect(
      payload.create({
        collection: 'quest-guides',
        data: { title: 'Otra guía', slug: `${PREFIX}-solo-dofus` },
        overrideAccess: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('no puede ser una ruta del sitio, como el índice /guias-dofus', async () => {
    await expect(
      payload.create({
        collection: 'dofus-guides',
        data: guide('guias-dofus', 7),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
