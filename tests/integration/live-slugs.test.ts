import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readLiveSlugs } from '@/lib/site/live-slugs'

import { startPayload } from './payload'

// Lo que este sitio enseña en /<slug>, leído como un visitante anónimo: con ello los enlaces de
// Torre a su propia web pasan a relativos (src/lib/site/site-links.ts). La base es compartida
// con otras pruebas, así que solo se miran los slugs propios.

let payload: Payload
const PREFIX = 'prueba-vivos'

async function cleanUp() {
  for (const collection of ['quest-guides', 'achievement-pages', 'pages'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
  await payload.delete({
    collection: 'redirects',
    where: { from: { like: PREFIX } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
})

afterAll(async () => {
  await cleanUp()
})

const ours = (slugs: string[]) => slugs.filter((slug) => slug.startsWith(PREFIX)).sort()

describe('readLiveSlugs', () => {
  it('lo publicado, lo que está en estado Publicada y las direcciones cambiadas', async () => {
    const create = (collection: 'quest-guides' | 'achievement-pages' | 'pages', data: object) =>
      payload.create({ collection, data: data as never, draft: !('_status' in data) })
    await create('quest-guides', {
      title: 'Guía',
      slug: `${PREFIX}-guia`,
      _status: 'published',
    })
    await create('quest-guides', { title: 'Borrador', slug: `${PREFIX}-borrador` })
    await create('achievement-pages', {
      name: 'Logro',
      slug: `${PREFIX}-logro`,
      state: 'published',
      _status: 'published',
    })
    await create('achievement-pages', {
      name: 'Logro en preparación',
      slug: `${PREFIX}-logro-prep`,
      state: 'preparing',
      _status: 'published',
    })
    await create('pages', {
      title: 'Página',
      slug: `${PREFIX}-pagina`,
      state: 'published',
      _status: 'published',
    })
    await create('pages', {
      title: 'Página en preparación',
      slug: `${PREFIX}-pagina-prep`,
      state: 'preparing',
      legacyHref: `https://www.torrentearcano.com/${PREFIX}-pagina-prep`,
      _status: 'published',
    })
    await payload.create({
      collection: 'redirects',
      data: { from: `${PREFIX}-antigua`, to: `${PREFIX}-guia` },
      overrideAccess: true,
    })

    expect(ours(await readLiveSlugs(payload))).toEqual([
      `${PREFIX}-antigua`,
      `${PREFIX}-guia`,
      `${PREFIX}-logro`,
      `${PREFIX}-pagina`,
    ])
  })
})
