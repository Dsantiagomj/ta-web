// Las checklists de prueba del índice /checklists y del menú, además de las de la página
// (tests/e2e/seed/checklists.ts): el «Dofus Nebuloso» Publicado (su página existe) y el
// «Silvestre» En preparación vienen de allí. Aquí se añaden una En preparación con
// legacyHref y el huevo de su Dofus, una En preparación sin él (apagada) y un borrador que no
// sale. Se siembra después de las checklists de la página; repetirlo no duplica nada.
import type { Payload } from 'payload'

import { seedChecklists } from './checklists'
import { seedDofus } from './dofus-guides'

export const indexChecklists = {
  /** Publicada, con su página: la siembra tests/e2e/seed/checklists.ts. */
  published: {
    slug: seedChecklists.nebuloso.slug,
    name: seedChecklists.nebuloso.name,
    description: seedChecklists.nebuloso.description,
    /** El h1 de su página. */
    title: seedChecklists.nebuloso.title,
  },
  legacy: {
    slug: 'lista-ocre',
    name: 'Almas del Ocre',
    description: 'Las almas de la eterna cosecha, una a una.',
    legacyHref: 'https://www.torrentearcano.com/lista-ocre',
  },
  preparing: { slug: 'checklist-jyfus', name: 'Checklist del Jyfus' },
  draft: { slug: 'checklist-borrador', name: 'Checklist en borrador' },
}

const findId = async (payload: Payload, collection: 'checklists' | 'dofus-guides', slug: string) =>
  (await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 }))
    .docs[0]?.id

export async function seedChecklistIndex(payload: Payload) {
  const { legacy, preparing, draft } = indexChecklists
  const checklists = [
    {
      ...legacy,
      order: 2,
      state: 'preparing',
      dofusGuide: await findId(payload, 'dofus-guides', seedDofus.ocre.slug),
      _status: 'published',
    },
    { ...preparing, order: 4, state: 'preparing', _status: 'published' },
    { ...draft, order: 0, state: 'preparing', _status: 'draft' },
  ]
  for (const data of checklists) {
    if (await findId(payload, 'checklists', data.slug)) continue
    await payload.create({
      collection: 'checklists',
      data: data as never,
      draft: data._status === 'draft',
    })
  }
}
