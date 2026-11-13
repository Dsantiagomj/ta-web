import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readSitemapData } from '@/lib/seo/read-sitemap'
import { sitemapEntries } from '@/lib/seo/sitemap'

import { startPayload } from './payload'

// Lo que lee /sitemap.xml: lo que ve un visitante anónimo (overrideAccess: false, sin
// usuario). Un borrador o una guía despublicada nunca llegan; una página de logro En
// preparación llega, para la fecha del índice, pero no sale como página.

const SITE = 'https://www.torrentearcano.com'
const SLUGS = ['mapa-publicada', 'mapa-borrador', 'mapa-despublicada']
const ACHIEVEMENTS = [978_101, 978_102]
let payload: Payload

async function cleanUp() {
  await payload.delete({ collection: 'quest-guides', where: { slug: { in: SLUGS } } })
  await payload.delete({
    collection: 'achievement-pages',
    where: { slug: { in: ['mapa-logro', 'mapa-logro-preparando'] } },
  })
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENTS } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'Mapa publicada', slug: 'mapa-publicada', _status: 'published' },
  })
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'Mapa borrador', slug: 'mapa-borrador', _status: 'draft' },
    draft: true,
  })
  const unpublished = await payload.create({
    collection: 'quest-guides',
    data: { title: 'Mapa despublicada', slug: 'mapa-despublicada', _status: 'published' },
  })
  await payload.update({
    collection: 'quest-guides',
    id: unpublished.id,
    data: { _status: 'draft' },
  })
  for (const [dofusId, slug, state] of [
    [ACHIEVEMENTS[0], 'mapa-logro', 'published'],
    [ACHIEVEMENTS[1], 'mapa-logro-preparando', 'preparing'],
  ] as const) {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId, name: slug },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: { achievement: achievement.id, name: slug, slug, state, _status: 'published' },
    })
  }
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('readSitemapData', () => {
  it('lee solo lo publicado, con su fecha de cambio', async () => {
    const data = await readSitemapData(payload)
    const guides = data.questGuides.map((doc) => doc.slug)

    expect(guides).toContain('mapa-publicada')
    expect(guides).not.toContain('mapa-borrador')
    expect(guides).not.toContain('mapa-despublicada')
    expect(data.questGuides.find((doc) => doc.slug === 'mapa-publicada')?.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    )
  })

  it('el sitemap lleva la página de logro publicada y no la En preparación', async () => {
    const urls = sitemapEntries(await readSitemapData(payload), SITE).map((entry) => entry.url)

    expect(urls).toContain(`${SITE}/mapa-publicada`)
    expect(urls).toContain(`${SITE}/mapa-logro`)
    expect(urls).not.toContain(`${SITE}/mapa-logro-preparando`)
    expect(urls).not.toContain(`${SITE}/mapa-borrador`)
  })
})
