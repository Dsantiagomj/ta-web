import { Forbidden, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pageNavItems } from '@/lib/pages/page'
import { readPageNav, readSitePage } from '@/lib/pages/queries'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// Las páginas sueltas de Torre (backlog B-09): el visitante solo lee lo publicado, Torre lo
// edita todo desde el panel, un editor no borra lo importado y su slug comparte la raíz con
// las guías.

let payload: Payload
let admin: User
let editor: User

const PREFIX = 'prueba-pagina'

async function cleanUp() {
  for (const collection of ['pages', 'quest-guides'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  admin = await createPanelUser(payload)
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
})

const page = (slug: string, state: 'published' | 'preparing' = 'published') => ({
  title: `Página ${slug}`,
  slug,
  state,
})

describe('acceso a las páginas', () => {
  it('un visitante solo lee las publicadas; Torre ve también los borradores', async () => {
    await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-publicada`), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-borrador`), _status: 'draft' },
      draft: true,
      user: editor,
      overrideAccess: false,
    })

    const where = { slug: { like: PREFIX } }
    const visitor = await payload.find({ collection: 'pages', where, overrideAccess: false })
    expect(visitor.docs.map((doc) => doc.slug)).toEqual([`${PREFIX}-publicada`])
    const visitorDraft = await payload.find({
      collection: 'pages',
      where,
      draft: true,
      overrideAccess: false,
    })
    expect(visitorDraft.docs.map((doc) => doc.slug)).toEqual([`${PREFIX}-publicada`])

    const panel = await payload.find({
      collection: 'pages',
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

  it('un visitante no crea ni cambia páginas', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        data: page(`${PREFIX}-anonima`),
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('un editor borra lo que hizo a mano, pero no lo importado; un administrador, sí', async () => {
    const byHand = await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-a-mano`), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    const imported = await payload.create({
      collection: 'pages',
      data: {
        ...page(`${PREFIX}-importada`),
        importSnapshot: { title: 'Página importada' },
        _status: 'published',
      },
      overrideAccess: true,
    })

    await payload.delete({
      collection: 'pages',
      id: byHand.id,
      user: editor,
      overrideAccess: false,
    })
    await expect(
      payload.delete({ collection: 'pages', id: imported.id, user: editor, overrideAccess: false }),
    ).rejects.toThrow()
    await payload.delete({
      collection: 'pages',
      id: imported.id,
      user: admin,
      overrideAccess: false,
    })
  })
})

describe('las capturas de una página', () => {
  it('una imagen que sale en el cuerpo de una página no se puede borrar', async () => {
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'Captura de una página de prueba' },
      file: tinyPng(),
      overrideAccess: true,
    })
    const used = await payload.create({
      collection: 'pages',
      data: {
        ...page(`${PREFIX}-con-captura`),
        body: [{ blockType: 'image', image: image.id }],
        _status: 'published',
      },
      overrideAccess: true,
    })
    await expect(
      payload.delete({ collection: 'media', id: image.id, user: admin, overrideAccess: false }),
    ).rejects.toThrow(`Página ${PREFIX}-con-captura`)
    await payload.delete({ collection: 'pages', id: used.id, overrideAccess: true })
    await payload.delete({ collection: 'media', id: image.id, overrideAccess: true })
  })
})

describe('el slug de las páginas', () => {
  it('no puede ser el de una guía, ni una guía el de una página', async () => {
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía de prueba', slug: `${PREFIX}-guia`, _status: 'published' },
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'pages',
        data: page(`${PREFIX}-guia`),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-ocupada`), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await expect(
      payload.create({
        collection: 'quest-guides',
        data: { title: 'Otra guía', slug: `${PREFIX}-ocupada` },
        overrideAccess: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('una ruta del sitio no vale como slug', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        data: page('checklists'),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('lo que lee el sitio', () => {
  it('la página del slug, con su página superior para las migas', async () => {
    const parent = await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-emotes`), _status: 'published' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'pages',
      data: { ...page(`${PREFIX}-emote`), parent: parent.id, _status: 'published' },
      overrideAccess: true,
    })
    const found = await readSitePage(payload, `${PREFIX}-emote`)
    expect(found?.parent).toMatchObject({
      title: `Página ${PREFIX}-emotes`,
      slug: `${PREFIX}-emotes`,
      state: 'published',
    })
    expect(await readSitePage(payload, `${PREFIX}-no-existe`)).toBeNull()
  })

  it('una En preparación se lee igual: /<slug> la lleva a Squarespace', async () => {
    await payload.create({
      collection: 'pages',
      data: {
        ...page(`${PREFIX}-legal`, 'preparing'),
        legacyHref: 'https://www.torrentearcano.com/aviso-legal',
        _status: 'published',
      },
      overrideAccess: true,
    })
    const found = await readSitePage(payload, `${PREFIX}-legal`)
    expect(found).toMatchObject({ state: 'preparing' })

    const nav = pageNavItems(await readPageNav(payload)).filter((item) =>
      item.slug.startsWith(PREFIX),
    )
    expect(nav).toContainEqual({
      name: `Página ${PREFIX}-legal`,
      slug: `${PREFIX}-legal`,
      href: 'https://www.torrentearcano.com/aviso-legal',
      legacy: true,
    })
    // Los borradores no salen en el pie ni en la búsqueda.
    expect(nav.map((item) => item.slug)).not.toContain(`${PREFIX}-borrador`)
  })
})
