import type { Payload } from 'payload'

import { readSlugRedirects } from '@/lib/redirects/queries'

// Lo que este sitio enseña en /<slug>, como lo ve un visitante anónimo (overrideAccess: false,
// sin usuario, draft: false): las guías de misiones publicadas y, de los logros, las guías de
// Dofus, las páginas sueltas y las checklists, lo publicado en estado Publicada, más las
// direcciones que Torre cambió (colección redirects). Lo En preparación no cuenta: no tiene
// página aquí. Con esto los enlaces de Torre a su propia web pasan a relativos
// (src/lib/site/site-links.ts); la página lo lee en caché (src/app/(frontend)/site-data.ts).

type WithState = 'achievement-pages' | 'dofus-guides' | 'pages' | 'checklists'

export async function readLiveSlugs(payload: Payload): Promise<string[]> {
  const read = async (collection: 'quest-guides' | WithState, withState: boolean) => {
    const { docs } = await payload.find({
      collection,
      where: withState
        ? { and: [{ _status: { equals: 'published' } }, { state: { equals: 'published' } }] }
        : { _status: { equals: 'published' } },
      select: { slug: true },
      depth: 0,
      draft: false,
      pagination: false,
      overrideAccess: false,
    })
    return docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
  }
  const lists = await Promise.all([
    read('quest-guides', false),
    read('achievement-pages', true),
    read('dofus-guides', true),
    read('pages', true),
    read('checklists', true),
    readSlugRedirects(payload).then((rows) => rows.map(([from]) => from)),
  ])
  return [...new Set(lists.flat())].sort()
}
