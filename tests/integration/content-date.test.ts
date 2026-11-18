import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { backfillContentDate } from '../../src/migrations/20261118_173121_content_updated_at'

import { createPanelUser, startPayload } from './payload'

// «Actualizado el» (backlog D-03, AGENTS.md, Content date): contentUpdatedAt solo cambia
// cuando una persona del panel publica un cambio del contenido. Los scripts (las
// importaciones, pnpm guides:rewards, los rellenos) publican sin persona y no la mueven.

let payload: Payload
let torre: User

const PREFIX = 'fecha-contenido-'

async function cleanUp() {
  const own = { slug: { like: PREFIX } }
  await payload.delete({ collection: 'quest-guides', where: own })
  await payload.delete({ collection: 'pages', where: own })
}

/** La fila publicada, la que lee la web. */
async function published(collection: 'quest-guides' | 'pages', id: number) {
  return payload.findByID({ collection, id, draft: false, depth: 0 })
}

beforeAll(async () => {
  payload = await startPayload()
  torre = await createPanelUser(payload)
})

beforeEach(cleanUp)

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('contentUpdatedAt de una guía de misión', () => {
  it('Torre publica una guía nueva: lleva la fecha de ahora', async () => {
    const before = Date.now()
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía nueva', slug: `${PREFIX}nueva`, _status: 'published' },
      user: torre,
    })
    expect(new Date(guide.contentUpdatedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('un script que publica un cambio no la mueve', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Guía de script',
        slug: `${PREFIX}script`,
        _status: 'published',
        contentUpdatedAt: '2026-11-01T00:00:00.000Z',
      },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía tocada por un script', _status: 'published' },
      overrideAccess: true,
    })
    const row = await published('quest-guides', guide.id)
    expect(row.title).toBe('Guía tocada por un script')
    expect(row.contentUpdatedAt).toBe('2026-11-01T00:00:00.000Z')
  })

  it('un script que crea una guía publicada la deja sin fecha: vale la de creación', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Importada', slug: `${PREFIX}importada`, _status: 'published' },
    })
    expect(guide.contentUpdatedAt ?? null).toBeNull()
  })

  it('Torre publica un cambio del contenido: la fecha es ahora', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Guía vieja',
        slug: `${PREFIX}cambio`,
        _status: 'published',
        contentUpdatedAt: '2026-11-01T00:00:00.000Z',
      },
    })
    const before = Date.now()
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía corregida', _status: 'published' },
      user: torre,
      overrideAccess: false,
    })
    const row = await published('quest-guides', guide.id)
    expect(new Date(row.contentUpdatedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('Torre publica sin cambiar el contenido, o solo la dirección: la fecha se queda', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Guía igual',
        slug: `${PREFIX}igual`,
        _status: 'published',
        contentUpdatedAt: '2026-11-01T00:00:00.000Z',
      },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía igual', slug: `${PREFIX}igual-2`, _status: 'published' },
      user: torre,
      overrideAccess: false,
    })
    const row = await published('quest-guides', guide.id)
    expect(row.slug).toBe(`${PREFIX}igual-2`)
    expect(row.contentUpdatedAt).toBe('2026-11-01T00:00:00.000Z')
  })

  it('un borrador de Torre no la mueve; publicarlo después, sí', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Guía con borrador',
        slug: `${PREFIX}borrador`,
        _status: 'published',
        contentUpdatedAt: '2026-11-01T00:00:00.000Z',
      },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía con borrador nuevo' },
      draft: true,
      user: torre,
      overrideAccess: false,
    })
    expect((await published('quest-guides', guide.id)).contentUpdatedAt).toBe(
      '2026-11-01T00:00:00.000Z',
    )

    // El panel publica el borrador tal cual: el contenido ya estaba en él, no en lo publicado.
    const before = Date.now()
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía con borrador nuevo', _status: 'published' },
      user: torre,
      overrideAccess: false,
    })
    const row = await published('quest-guides', guide.id)
    expect(row.title).toBe('Guía con borrador nuevo')
    expect(new Date(row.contentUpdatedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })
})

describe('contentUpdatedAt de una página suelta', () => {
  it('sigue la misma regla: el script no la mueve y Torre sí', async () => {
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Emotes',
        slug: `${PREFIX}emotes`,
        state: 'published',
        _status: 'published',
        contentUpdatedAt: '2026-11-01T00:00:00.000Z',
      },
    })
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: 'Emotes (importados otra vez)', _status: 'published' },
    })
    expect((await published('pages', page.id)).contentUpdatedAt).toBe('2026-11-01T00:00:00.000Z')

    const before = Date.now()
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: 'Emotes de Torre', _status: 'published' },
      user: torre,
      overrideAccess: false,
    })
    const row = await published('pages', page.id)
    expect(new Date(row.contentUpdatedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })
})

describe('la migración content_updated_at', () => {
  it('lo publicado toma la fecha de su última versión publicada; un borrador, ninguna', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía de antes', slug: `${PREFIX}antes`, _status: 'published' },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Guía de antes, otra vez', _status: 'published' },
    })
    // Un borrador más nuevo no cuenta: la web enseña lo publicado.
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'Borrador' },
      draft: true,
    })
    const draft = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Solo borrador', slug: `${PREFIX}solo-borrador`, _status: 'draft' },
      draft: true,
    })
    // Como antes de la migración: sin fecha.
    await payload.db.drizzle.execute(
      sql`UPDATE quest_guides SET content_updated_at = NULL WHERE id IN (${guide.id}, ${draft.id})`,
    )

    await payload.db.drizzle.execute(backfillContentDate('quest_guides'))

    const { docs } = await payload.findVersions({
      collection: 'quest-guides',
      where: { parent: { equals: guide.id }, 'version._status': { equals: 'published' } },
      sort: '-updatedAt',
      limit: 1,
    })
    const row = await published('quest-guides', guide.id)
    expect(row.contentUpdatedAt).toBe(docs[0]!.updatedAt)
    const untouched = await payload.findByID({
      collection: 'quest-guides',
      id: draft.id,
      draft: true,
      depth: 0,
    })
    expect(untouched.contentUpdatedAt ?? null).toBeNull()
  })
})
