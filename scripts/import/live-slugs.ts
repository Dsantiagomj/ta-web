// Las páginas que este sitio enseña en /<slug>, para los enlaces de Torre a su propia web al
// importarlos (dofus-guides/site-links.ts): lo publicado de las guías y las checklists (una
// En preparación redirige a la suya: también vale) y, de los logros, las guías de Dofus y las
// páginas sueltas, lo publicado que no está En preparación. Lo usan import-dofus-guides.ts e
// import-pages.ts.
import type { Payload } from 'payload'

type Doc = { slug: string; _status?: string | null; state?: string | null }

export async function liveSiteSlugs(payload: Payload): Promise<Set<string>> {
  const read = async (
    collection: 'quest-guides' | 'checklists' | 'achievement-pages' | 'dofus-guides' | 'pages',
    withState: boolean,
  ) => {
    const { docs } = await payload.find({
      collection,
      limit: 0,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: withState
        ? { slug: true, state: true, _status: true }
        : { slug: true, _status: true },
    })
    return (docs as Doc[]).filter(
      (doc) => doc._status === 'published' && (!withState || doc.state === 'published'),
    )
  }
  const lists = await Promise.all([
    read('quest-guides', false),
    read('checklists', false),
    read('achievement-pages', true),
    read('dofus-guides', true),
    read('pages', true),
  ])
  return new Set(lists.flat().map((doc) => doc.slug))
}
