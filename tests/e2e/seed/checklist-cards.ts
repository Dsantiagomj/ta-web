// El arte de los carteles del índice /checklists sobre las checklists de prueba
// (tests/e2e/seed/checklists.ts): la escena, el PNJ y su encuadre del Nebuloso y la escena del
// Hielos, los dos Publicados y sin borrador (guardar uno con borrador publicaría el borrador), y
// la tarjeta «???» encendida. Las demás se quedan sin arte, como una recién creada. Las
// imágenes son el arte de la portada (public/img/inicio). Se siembra después de las
// checklists; repetirlo no duplica nada.
import path from 'node:path'

import type { Payload } from 'payload'

import { seedChecklists } from './checklists'

export const seedCards = {
  /** El encuadre del PNJ del Nebuloso: sale en el HTML como --npc-h, --npc-r y --npc-t. */
  npcFit: { npcHeight: 70, npcRight: -26, npcTop: 6 },
  teaser: { label: 'En camino', text: '???' },
}

const ART = {
  astrub: { file: 'public/img/inicio/astrub-1600.webp', alt: 'La plaza de Astrub' },
  crocanteria: { file: 'public/img/inicio/crocanteria-960.webp', alt: 'La Crocantería' },
  meriana: { file: 'public/img/inicio/npc-2205-414.webp', alt: 'Meriana' },
  krosmoz: { file: 'public/img/inicio/krosmoz-960.webp', alt: 'El Krosmoz' },
  egg: { file: 'public/img/game/dofus/dofus-ebano.webp', alt: 'Dofus Ébano' },
}

async function media(payload: Payload, name: keyof typeof ART): Promise<number> {
  const key = `e2e-checklist-card:${name}`
  const { docs } = await payload.find({
    collection: 'media',
    where: { gameAsset: { equals: key } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0].id
  const created = await payload.create({
    collection: 'media',
    data: { alt: ART[name].alt, gameAsset: key },
    filePath: path.resolve(ART[name].file),
  })
  return created.id
}

async function setCard(payload: Payload, slug: string, card: Record<string, unknown>) {
  const { docs } = await payload.find({
    collection: 'checklists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0] || docs[0].card?.scene) return
  await payload.update({
    collection: 'checklists',
    id: docs[0].id,
    data: { card, _status: 'published' } as never,
  })
}

export async function seedChecklistCards(payload: Payload) {
  await setCard(payload, seedChecklists.nebuloso.slug, {
    scene: await media(payload, 'astrub'),
    npc: await media(payload, 'meriana'),
    ...seedCards.npcFit,
  })
  await setCard(payload, seedChecklists.hielos.slug, {
    scene: await media(payload, 'crocanteria'),
  })
  await payload.updateGlobal({
    slug: 'checklists-index',
    data: {
      teaser: {
        enabled: true,
        ...seedCards.teaser,
        scene: await media(payload, 'krosmoz'),
        egg: await media(payload, 'egg'),
      },
    },
  })
}
