// Lee de Postgres las páginas sueltas (./page.ts), siempre con el acceso de quien mira:
// overrideAccess: false. Un visitante solo ve lo publicado; el panel, en la vista previa,
// el último borrador.

import type { Payload } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { Page, User } from '@/payload-types'

import type { SitePageDoc } from './page'

export interface ReadSitePageOptions {
  /** La vista previa del panel: el último borrador, como lo ve esa cuenta. */
  preview?: { user: User }
}

/**
 * La página del slug, también En preparación: /<slug> la necesita para llevar a su página
 * de Squarespace. Sus capturas (1) y los monstruos de los combates (1) con su imagen (2); de
 * la página superior, solo lo que piden las migas.
 */
export async function readSitePage(
  payload: Payload,
  slug: string,
  { preview }: ReadSitePageOptions = {},
): Promise<(Page & SitePageDoc) | null> {
  if (!isGuideSlug(slug)) return null
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    populate: { pages: { title: true, slug: true, state: true } },
    depth: 2,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    ...(preview ? { draft: true, user: preview.user } : { draft: false }),
  })
  return (docs[0] as (Page & SitePageDoc) | undefined) ?? null
}

/** Las páginas publicadas para el pie y la búsqueda, por título, como las ve un visitante. */
export async function readPageNav(
  payload: Payload,
): Promise<Pick<SitePageDoc, 'title' | 'slug' | 'state' | 'legacyHref'>[]> {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    select: { title: true, slug: true, state: true, legacyHref: true },
    sort: 'title',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })
  return docs
}
