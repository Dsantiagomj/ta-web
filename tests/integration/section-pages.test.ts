import { Forbidden, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readSectionNav } from '@/lib/section-pages/queries'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las páginas de clase y de mazmorra de Torre (backlog S-10 y S-11): el visitante solo lee lo
// publicado, Torre lo edita todo desde el panel, un editor no borra lo importado, su slug
// comparte la raíz con las demás páginas y aún no pueden estar Publicadas.

let payload: Payload
let editor: User

const PREFIX = 'prueba-seccion'
const COLLECTIONS = ['class-pages', 'dungeon-pages'] as const

async function cleanUp() {
  for (const collection of [...COLLECTIONS, 'pages'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  // La primera cuenta de una base vacía es administradora: la editora va después.
  await createPanelUser(payload)
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
})

const doc = (slug: string) => ({
  title: `Página ${slug}`,
  slug,
  state: 'preparing' as const,
  legacyHref: `https://www.torrentearcano.com/${slug}`,
})

describe.each(COLLECTIONS)('%s', (collection) => {
  const slug = (name: string) => `${PREFIX}-${collection}-${name}`

  it('un visitante solo lee lo publicado; el panel ve también los borradores', async () => {
    await payload.create({
      collection,
      data: { ...doc(slug('publicada')), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await payload.create({
      collection,
      data: { ...doc(slug('borrador')), _status: 'draft' },
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    const where = { slug: { like: `${PREFIX}-${collection}` } }
    const visitor = await payload.find({ collection, where, draft: true, overrideAccess: false })
    expect(visitor.docs.map((found) => found.slug)).toEqual([slug('publicada')])
    const panel = await payload.find({
      collection,
      where,
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    expect(panel.docs.map((found) => found.slug).sort()).toEqual([
      slug('borrador'),
      slug('publicada'),
    ])
  })

  it('el menú lee solo lo publicado, con lo que necesita', async () => {
    const read = (await readSectionNav(payload, collection)).filter((found) =>
      found.slug.startsWith(`${PREFIX}-${collection}`),
    )
    expect(read).toEqual([
      expect.objectContaining({
        slug: slug('publicada'),
        state: 'preparing',
        legacyHref: `https://www.torrentearcano.com/${slug('publicada')}`,
        inMenu: true,
      }),
    ])
  })

  it('un editor no borra lo importado; lo que hizo a mano, sí', async () => {
    const imported = await payload.create({
      collection,
      data: { ...doc(slug('importada')), importSnapshot: { title: 'x' }, _status: 'published' },
      overrideAccess: true,
    })
    await expect(
      payload.delete({ collection, id: imported.id, user: editor, overrideAccess: false }),
    ).rejects.toBeInstanceOf(Forbidden)
    const own = await payload.create({
      collection,
      data: { ...doc(slug('propia')), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await payload.delete({ collection, id: own.id, user: editor, overrideAccess: false })
  })

  it('no usa una dirección de otra página del sitio', async () => {
    await payload.create({
      collection: 'pages',
      data: { title: 'Ocupada', slug: slug('ocupada'), state: 'published', _status: 'published' },
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection,
        data: { ...doc(slug('ocupada')), _status: 'published' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('no se puede poner Publicada mientras no tenga página aquí', async () => {
    await expect(
      payload.create({
        collection,
        data: { ...doc(slug('visible')), state: 'published', _status: 'published' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
