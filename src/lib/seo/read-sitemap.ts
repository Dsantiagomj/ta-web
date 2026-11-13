// Lee de Postgres lo que lleva /sitemap.xml (./sitemap.ts), como un visitante anónimo:
// overrideAccess: false, sin usuario, draft: false y solo lo publicado. De cada documento,
// el slug, la fecha y el estado de Torre; nada más.

import type { Payload } from 'payload'

import type { SitemapData } from './sitemap'

const PUBLISHED = { _status: { equals: 'published' } } as const
const visitor = { depth: 0, draft: false, pagination: false, overrideAccess: false } as const

export async function readSitemapData(payload: Payload): Promise<SitemapData> {
  const [questGuides, achievementPages, achievementGroups, dofusGuides, checklists, dofusIndex] =
    await Promise.all([
      payload.find({
        collection: 'quest-guides',
        where: PUBLISHED,
        select: { slug: true, updatedAt: true },
        ...visitor,
      }),
      payload.find({
        collection: 'achievement-pages',
        where: PUBLISHED,
        select: { slug: true, updatedAt: true, state: true, group: true },
        ...visitor,
      }),
      payload.find({
        collection: 'achievement-groups',
        where: PUBLISHED,
        select: { updatedAt: true },
        ...visitor,
      }),
      payload.find({
        collection: 'dofus-guides',
        where: PUBLISHED,
        select: { slug: true, updatedAt: true, state: true },
        ...visitor,
      }),
      payload.find({
        collection: 'checklists',
        where: PUBLISHED,
        select: { slug: true, updatedAt: true, state: true },
        ...visitor,
      }),
      payload.findGlobal({
        slug: 'dofus-guides-index',
        select: { updatedAt: true },
        depth: 0,
        draft: false,
        overrideAccess: false,
      }),
    ])

  return {
    questGuides: questGuides.docs.map(({ slug, updatedAt }) => ({ slug, updatedAt })),
    achievementPages: achievementPages.docs.map(({ slug, updatedAt, state, group }) => ({
      slug,
      updatedAt,
      state,
      grouped: group != null,
    })),
    achievementGroups: achievementGroups.docs.map(({ updatedAt }) => ({ updatedAt })),
    dofusGuides: dofusGuides.docs.map(({ slug, updatedAt, state }) => ({ slug, updatedAt, state })),
    checklists: checklists.docs.map(({ slug, updatedAt, state }) => ({ slug, updatedAt, state })),
    dofusIndexUpdatedAt: dofusIndex.updatedAt ?? null,
  }
}
