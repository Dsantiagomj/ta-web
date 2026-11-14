import { Forbidden, type CollectionSlug, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// Los papeles del panel (docs/research/backlog.md, A-15): el editor crea, edita y publica;
// solo el administrador borra lo importado y las imágenes, y gestiona los usuarios.

let payload: Payload
let admin: User
let editor: User

const PREFIX = 'prueba-papeles'
const ACHIEVEMENT_IDS = [990_501, 990_502, 990_503]
const CATEGORY_IDS = [990_511, 990_512, 990_513]

async function cleanUp() {
  for (const collection of [
    'checklists',
    'dofus-guides',
    'achievement-pages',
    'achievement-groups',
    'quest-guides',
  ] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } } })
  }
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENT_IDS } } })
  await payload.delete({
    collection: 'achievement-categories',
    where: { dofusId: { in: CATEGORY_IDS } },
  })
  await payload.delete({ collection: 'media', where: { alt: { like: PREFIX } } })
}

let counter = 0
const nextSlug = () => `${PREFIX}-${++counter}`

/** Lo mínimo para crear un documento de cada colección editorial. */
const editorial: Record<string, () => Promise<Record<string, unknown>>> = {
  'quest-guides': async () => ({ title: 'Guía de prueba', slug: nextSlug() }),
  'achievement-pages': async () => {
    const dofusId = ACHIEVEMENT_IDS[counter % ACHIEVEMENT_IDS.length]!
    await payload.delete({ collection: 'achievement-pages', where: { slug: { like: PREFIX } } })
    await payload.delete({ collection: 'achievements', where: { dofusId: { equals: dofusId } } })
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId, name: `Logro de prueba ${dofusId}` },
    })
    return { achievement: achievement.id, name: 'Página de prueba', slug: nextSlug() }
  },
  'achievement-groups': async () => ({ name: 'Metalogro de prueba', slug: nextSlug() }),
  'dofus-guides': async () => ({ name: 'Dofus de prueba', slug: nextSlug(), order: 900 }),
  checklists: async () => ({ name: 'Checklist de prueba', slug: nextSlug(), order: 900 }),
}

/** La marca que deja la importación en cada colección. */
const IMPORTED: Record<string, Record<string, unknown>> = {
  'quest-guides': { originalUrl: 'https://www.torrentearcano.com/aprendizaje-escudero' },
  'dofus-guides': { importSnapshot: {} },
  checklists: { importSnapshot: {} },
  'achievement-pages': {},
  'achievement-groups': {},
}

/** Donde un editor borra lo que no vino de la importación. */
const HAND_MADE_DELETABLE = new Set<string>(['quest-guides', 'dofus-guides', 'checklists'])

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  admin = await createPanelUser(payload, 'admin')
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe.each(Object.keys(editorial) as CollectionSlug[])('papeles en %s', (collection) => {
  const create = async (user: User) =>
    payload.create({
      collection,
      data: { ...(await editorial[collection]!()), _status: 'draft' } as never,
      draft: true,
      user,
      overrideAccess: false,
    })

  it('el editor crea, edita y publica', async () => {
    const created = await create(editor)
    const published = await payload.update({
      collection,
      id: created.id,
      data: { _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    expect((published as { _status?: string })._status).toBe('published')
  })

  const count = async (id: number | string) =>
    (await payload.count({ collection, where: { id: { equals: id } } })).totalDocs

  it('el editor no borra lo importado; el administrador sí', async () => {
    // Como lo deja la importación: con su marca (o, en las de DofusDB, siempre).
    const created = await payload.create({
      collection,
      data: { ...(await editorial[collection]!()), ...IMPORTED[collection] } as never,
    })
    await expect(
      payload.delete({ collection, id: created.id, user: editor, overrideAccess: false }),
    ).rejects.toThrow()
    expect(await count(created.id)).toBe(1)

    await payload.delete({ collection, id: created.id, user: admin, overrideAccess: false })
    expect(await count(created.id)).toBe(0)
  })

  it(
    HAND_MADE_DELETABLE.has(collection)
      ? 'el editor borra lo que se hizo a mano'
      : 'el editor tampoco borra lo que se hizo a mano: sale de DofusDB',
    async () => {
      const created = await create(editor)
      const attempt = payload.delete({
        collection,
        id: created.id,
        user: editor,
        overrideAccess: false,
      })
      if (HAND_MADE_DELETABLE.has(collection)) {
        await attempt
        expect(await count(created.id)).toBe(0)
      } else {
        await expect(attempt).rejects.toBeInstanceOf(Forbidden)
        expect(await count(created.id)).toBe(1)
      }
    },
  )
})

describe('papeles en media', () => {
  it('el editor sube y edita imágenes, pero no las borra; el administrador sí', async () => {
    const created = await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} imagen` },
      file: tinyPng(),
      user: editor,
      overrideAccess: false,
    })
    const updated = await payload.update({
      collection: 'media',
      id: created.id,
      data: { alt: `${PREFIX} imagen cambiada` },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.alt).toBe(`${PREFIX} imagen cambiada`)

    await expect(
      payload.delete({ collection: 'media', id: created.id, user: editor, overrideAccess: false }),
    ).rejects.toBeInstanceOf(Forbidden)

    await payload.delete({
      collection: 'media',
      id: created.id,
      user: admin,
      overrideAccess: false,
    })
    const remaining = await payload.count({
      collection: 'media',
      where: { id: { equals: created.id } },
    })
    expect(remaining.totalDocs).toBe(0)
  })
})

describe('papeles en users', () => {
  it('una cuenta nueva es editora salvo que diga lo contrario', async () => {
    const email = `nuevo-${counter}-${Date.now()}@torrentearcano.test`
    const created = await payload.create({
      collection: 'users',
      data: { email, password: 'una-clave-de-prueba' },
      user: admin,
      overrideAccess: false,
    })
    expect(created.role).toBe('editor')
    await payload.delete({ collection: 'users', id: created.id })
  })

  it('el administrador crea, cambia y borra cuentas, y da el papel de administrador', async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: `otro-${Date.now()}@torrentearcano.test`, password: 'una-clave-de-prueba' },
      user: admin,
      overrideAccess: false,
    })
    const promoted = await payload.update({
      collection: 'users',
      id: created.id,
      data: { role: 'admin' },
      user: admin,
      overrideAccess: false,
    })
    expect(promoted.role).toBe('admin')

    await payload.delete({
      collection: 'users',
      id: created.id,
      user: admin,
      overrideAccess: false,
    })
    const remaining = await payload.count({
      collection: 'users',
      where: { id: { equals: created.id } },
    })
    expect(remaining.totalDocs).toBe(0)
  })

  it('el editor solo ve su cuenta y no crea ni borra cuentas', async () => {
    const found = await payload.find({ collection: 'users', user: editor, overrideAccess: false })
    expect(found.docs.map((doc) => doc.id)).toEqual([editor.id])

    await expect(
      payload.findByID({ collection: 'users', id: admin.id, user: editor, overrideAccess: false }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'users',
        data: { email: `colado-${Date.now()}@torrentearcano.test`, password: 'otra-clave' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)

    await expect(
      payload.delete({ collection: 'users', id: admin.id, user: editor, overrideAccess: false }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('el editor cambia su nombre, pero no su papel ni la cuenta de otro', async () => {
    const renamed = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { name: 'Ayudante', role: 'admin' },
      user: editor,
      overrideAccess: false,
    })
    expect(renamed.name).toBe('Ayudante')
    expect(renamed.role).toBe('editor')

    await expect(
      payload.update({
        collection: 'users',
        id: admin.id,
        data: { name: 'Robado' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('no deja el panel sin administradores', async () => {
    // Las cuentas de las demás pruebas, fuera: este administrador queda solo.
    await payload.db.deleteMany({
      collection: 'users',
      where: { id: { not_in: [admin.id, editor.id] } },
    })
    await expect(
      payload.update({
        collection: 'users',
        id: admin.id,
        data: { role: 'editor' },
        user: admin,
        overrideAccess: false,
      }),
    ).rejects.toThrow('Tiene que quedar al menos un administrador')
    await expect(
      payload.delete({ collection: 'users', id: admin.id, user: admin, overrideAccess: false }),
    ).rejects.toThrow('Tiene que quedar al menos un administrador')
    expect((await payload.findByID({ collection: 'users', id: admin.id })).role).toBe('admin')
  })

  // La última del archivo: vacía la tabla de cuentas, sin hooks, para tener la base vacía.
  it('la primera cuenta, con la base vacía, es administradora', async () => {
    await payload.db.deleteMany({ collection: 'users', where: { id: { exists: true } } })
    // Como /admin/create-first-user: Payload la crea con overrideAccess.
    const first = await payload.create({
      collection: 'users',
      data: {
        email: `primera-${Date.now()}@torrentearcano.test`,
        password: 'la-primera-clave',
        role: 'editor',
      },
    })
    expect(first.role).toBe('admin')
    const second = await payload.create({
      collection: 'users',
      data: { email: `segunda-${Date.now()}@torrentearcano.test`, password: 'la-segunda' },
    })
    expect(second.role).toBe('editor')
    await payload.db.deleteMany({
      collection: 'users',
      where: { id: { in: [first.id, second.id] } },
    })
  })
})
