// El arte de los carteles del índice /checklists sobre las checklists de prueba
// (tests/e2e/seed/checklists.ts): la escena, el PNJ y su encuadre del Nebuloso y la escena del
// Hielos, los dos Publicados y sin borrador (guardar uno con borrador publicaría el borrador), y
// la tarjeta «???» encendida. Las demás se quedan sin arte, como una recién creada. Las
// imágenes son el arte de la portada (public/img/inicio). Se siembra después de las
// checklists; repetirlo no duplica nada.
//
// El huevo y el color salen de la guía de cada Dofus, como en dev. El Hielos enlaza la suya, un
// borrador nunca publicado (no sale en /guias-dofus ni en el menú, y su huevo y su color sí, que
// son datos del juego). El Nebuloso sembrado enlaza la guía del Ocre, de la que dependen las
// pruebas de su página (migas): su tarjeta lleva el color del Nebuloso de dev en `card.color`, el
// que gana a la guía, así que solo el huevo es del Ocre. El Silvestre no tiene guía: sin huevo y
// con la tinta del tema.
import path from 'node:path'

import type { Payload } from 'payload'

import { seedChecklists } from './checklists'

export const seedCards = {
  /** El morado del Nebuloso en dev (la guía misiones-nebuloso). */
  nebulosoColor: '#875cd2',
  /** La guía del Hielos en dev: su color y su huevo. */
  hielosGuide: {
    slug: 'dofus-de-los-hielos',
    name: 'Dofus de los Hielos',
    color: '#47c4ff',
    egg: 'public/img/game/dofus/dofus-de-los-hielos.webp',
    item: { dofusId: 991_880, name: 'Dofus de los Hielos', level: 190 },
  },
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

async function setCard(
  payload: Payload,
  slug: string,
  card: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
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
    data: { card, ...extra, _status: 'published' } as never,
  })
}

/** La guía del Hielos, en borrador: solo su huevo y su color llegan al índice. */
async function hielosGuide(payload: Payload): Promise<number> {
  const guide = seedCards.hielosGuide
  const found = await payload.find({
    collection: 'dofus-guides',
    where: { slug: { equals: guide.slug } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  if (found.docs[0]) return found.docs[0].id
  const egg = await payload.create({
    collection: 'media',
    data: { alt: guide.name, gameAsset: 'e2e-checklist-card:hielos-egg' },
    filePath: path.resolve(guide.egg),
  })
  const item = await payload.create({
    collection: 'items',
    data: { ...guide.item, image: egg.id },
  })
  const created = await payload.create({
    collection: 'dofus-guides',
    data: {
      slug: guide.slug,
      name: guide.name,
      order: 90,
      state: 'preparing',
      level: guide.item.level,
      color: guide.color,
      dofus: item.id,
      _status: 'draft',
    } as never,
    draft: true,
  })
  return created.id
}

export async function seedChecklistCards(payload: Payload) {
  await setCard(payload, seedChecklists.nebuloso.slug, {
    scene: await media(payload, 'astrub'),
    npc: await media(payload, 'meriana'),
    ...seedCards.npcFit,
    color: seedCards.nebulosoColor,
  })
  await setCard(
    payload,
    seedChecklists.hielos.slug,
    { scene: await media(payload, 'crocanteria') },
    { dofusGuide: await hielosGuide(payload) },
  )
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
