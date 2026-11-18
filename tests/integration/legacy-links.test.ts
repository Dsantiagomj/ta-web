import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { collectLegacyLinks } from '../../scripts/legacy-links/collect'

import { startPayload } from './payload'

// pnpm links:legacy contra una base de verdad: lee lo publicado, nunca escribe, y separa lo que
// el sitio ya sirve de lo que seguiría yendo a Squarespace. La base es compartida con otras
// pruebas, así que solo se miran los slugs propios.

let payload: Payload
const PREFIX = 'prueba-legado'
const SITE = 'https://www.torrentearcano.com'

const link = (url: string) => ({
  type: 'link',
  version: 1,
  fields: { url, linkType: 'custom', newTab: false },
  children: [{ type: 'text', version: 1, text: 'aquí', format: 0, detail: 0, mode: 'normal' }],
})
const body = (...links: unknown[]) => [
  {
    blockType: 'richText',
    content: {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: links,
          },
        ],
      },
    },
  },
]

async function cleanUp() {
  await payload.delete({
    collection: 'pages',
    where: { slug: { like: PREFIX } },
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

describe('collectLegacyLinks', () => {
  it('lo publicado que lleva a Squarespace, lo En preparación aparte y lo ya servido contado', async () => {
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Destino',
        slug: `${PREFIX}-destino`,
        state: 'published',
        _status: 'published',
      } as never,
    })
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Con enlaces',
        slug: `${PREFIX}-enlaces`,
        state: 'published',
        body: body(
          link(`${SITE}/${PREFIX}-destino`),
          link(`${SITE}/${PREFIX}-sin-pagina`),
          link('https://www.youtube.com/watch?v=x'),
        ),
        _status: 'published',
      } as never,
    })
    await payload.create({
      collection: 'pages',
      data: {
        title: 'En preparación',
        slug: `${PREFIX}-prep`,
        state: 'preparing',
        legacyHref: `${SITE}/${PREFIX}-prep`,
        body: body(link(`${SITE}/${PREFIX}-no-se-pinta`)),
        _status: 'published',
      } as never,
    })
    const before = await payload.count({ collection: 'pages' })

    const { entries, relative } = await collectLegacyLinks(payload)
    const ours = entries.filter((entry) => entry.href.includes(PREFIX))

    expect(ours).toEqual([
      {
        source: 'content',
        where: `Página «Con enlaces» (/${PREFIX}-enlaces), body.1.content`,
        href: `${SITE}/${PREFIX}-sin-pagina`,
        served: null,
      },
      {
        source: 'preparing',
        where: `Página «En preparación» (/${PREFIX}-prep)`,
        href: `${SITE}/${PREFIX}-prep`,
        served: null,
      },
    ])
    expect(relative.page).toBeGreaterThanOrEqual(1)
    // Solo lee.
    expect(await payload.count({ collection: 'pages' })).toEqual(before)
  })
})
