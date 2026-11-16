// Lee de Postgres las páginas de clase y de mazmorra para el menú, como un visitante:
// overrideAccess: false y draft: false, así que solo llega lo publicado.

import type { Payload } from 'payload'

import type { SectionNavDoc } from './nav'

/** Las publicadas de una colección, con lo que pide el menú. */
export async function readSectionNav(
  payload: Payload,
  collection: 'class-pages' | 'dungeon-pages',
): Promise<SectionNavDoc[]> {
  const { docs } = await payload.find({
    collection,
    where: { _status: { equals: 'published' } },
    select: {
      title: true,
      slug: true,
      state: true,
      legacyHref: true,
      inMenu: true,
      menuName: true,
    },
    sort: 'title',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })
  return docs
}
