import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { checklistArt, checklistArtKey } from '../../scripts/import/checklists/art'
import {
  loadChecklistCards,
  type CardImportEntry,
  type LoadChecklistCardsOptions,
} from '../../scripts/import/checklists/cards'
import type { Checklist, ChecklistsIndex } from '@/payload-types'

import { startPayload, tinyPng } from './payload'

// La importación del arte de las tarjetas del índice /checklists, del hub de silvestre-checklist:
// sube cada imagen a Media una vez, rellena la tarjeta de cada checklist y la «???» del índice,
// en seco no escribe, una segunda pasada no cambia nada y lo que Torre cambia en el panel se
// queda (importSnapshot). Una checklist con un borrador a medias recibe la tarjeta en lo
// publicado y en su borrador, que sigue siendo el último y sin publicar.

let payload: Payload

const PREFIX = 'prueba-tarjeta-checklist'
const slugs = { plain: `${PREFIX}-nebuloso`, draft: `${PREFIX}-silvestre` }
const ART = {
  scene: 'prueba-tarjetas/zona.jpg',
  npc: 'prueba-tarjetas/pnj.png',
  otherScene: 'prueba-tarjetas/otra-zona.jpg',
  teaserScene: 'prueba-tarjetas/krosmoz.jpg',
  teaserEgg: 'prueba-tarjetas/huevo.png',
}

// La imagen que sube Torre en el panel; con clave, para borrarla al terminar.
const OWN_KEY = `${PREFIX}-propia`

const entries: CardImportEntry[] = [
  {
    slug: slugs.plain,
    card: {
      scene: { path: ART.scene, alt: 'Xelorium' },
      npc: { path: ART.npc, alt: 'Khelebragón' },
      npcFit: { height: 72, right: -30, top: 4 },
    },
  },
  { slug: slugs.draft, card: { scene: { path: ART.scene, alt: 'Xelorium' } } },
  // Una que todavía no está en la base: se avisa y no se crea.
  { slug: `${PREFIX}-sin-importar`, card: { scene: { path: ART.scene, alt: 'Xelorium' } } },
]

const teaser = {
  scene: { path: ART.teaserScene, alt: 'Krosmoz' },
  egg: { path: ART.teaserEgg, alt: 'Un Dofus por descubrir' },
}

const options = (apply = true, list = entries): LoadChecklistCardsOptions => ({
  entries: list,
  teaser,
  apply,
  artFor: checklistArt(payload, { readArt: async () => tinyPng().data, dryRun: !apply }).media,
})

/** Lo último guardado (el borrador si lo hay) o lo publicado. */
const read = async (slug: string, draft = true) =>
  (
    await payload.find({
      collection: 'checklists',
      where: { slug: { equals: slug } },
      draft,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as Checklist

const mediaId = async (path: string) =>
  (
    await payload.find({
      collection: 'media',
      where: { gameAsset: { equals: checklistArtKey(path) } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]?.id

const readIndex = async () =>
  (await payload.findGlobal({
    slug: 'checklists-index',
    depth: 0,
    overrideAccess: true,
  })) as ChecklistsIndex

const artCount = async () =>
  (
    await payload.count({
      collection: 'media',
      where: { gameAsset: { in: Object.values(ART).map(checklistArtKey) } },
      overrideAccess: true,
    })
  ).totalDocs

async function cleanUp() {
  await payload.delete({
    collection: 'checklists',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'checklists-index',
    data: { teaser: { scene: null, egg: null }, importSnapshot: null },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'media',
    where: { gameAsset: { in: [...Object.values(ART).map(checklistArtKey), OWN_KEY] } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
})

beforeEach(async () => {
  await cleanUp()
  await payload.create({
    collection: 'checklists',
    data: {
      name: 'Dofus de prueba',
      slug: slugs.plain,
      order: 901,
      state: 'published',
      _status: 'published',
    },
    overrideAccess: true,
  })
  // La ficha publicada y, encima, un borrador a medias: lo que deja la importación al portar.
  const ficha = await payload.create({
    collection: 'checklists',
    data: {
      name: 'Silvestre de prueba',
      slug: slugs.draft,
      order: 902,
      state: 'preparing',
      description: 'La ficha publicada.',
      _status: 'published',
    },
    overrideAccess: true,
  })
  await payload.update({
    collection: 'checklists',
    id: ficha.id,
    data: { description: 'El borrador sin publicar.', steps: [{ zone: 'Amakna' }] },
    draft: true,
    overrideAccess: true,
  })
})

afterAll(async () => {
  await cleanUp()
})

describe('loadChecklistCards', () => {
  it('en seco no sube ni escribe nada, y dice lo que haría', async () => {
    const report = await loadChecklistCards(payload, options(false))
    expect(await artCount()).toBe(0)
    expect((await read(slugs.plain)).card?.scene ?? null).toBeNull()
    expect(report.updated).toEqual([slugs.plain, slugs.draft])
    expect(report.missing).toEqual([`${PREFIX}-sin-importar`])
    expect(report.teaser).toBe('updated')
    expect(report.pendingArt).toBe(4)
  })

  it('sube cada imagen una vez y rellena la tarjeta con su encuadre', async () => {
    await loadChecklistCards(payload, options())
    // La escena la comparten dos checklists: un solo archivo.
    expect(await artCount()).toBe(4)
    const card = (await read(slugs.plain)).card!
    expect(card.scene).toBe(await mediaId(ART.scene))
    expect(card.npc).toBe(await mediaId(ART.npc))
    expect(card).toMatchObject({ npcHeight: 72, npcRight: -30, npcTop: 4 })
    // El color no lo trae: vacío, el de la guía de su Dofus.
    expect(card.color ?? null).toBeNull()
    // Va a lo publicado: el índice lo enseña ya.
    expect((await read(slugs.plain, false)).card?.scene).toBe(await mediaId(ART.scene))
  })

  it('con un borrador a medias, la tarjeta llega a lo publicado y al borrador, que no se publica', async () => {
    const stepIdBefore = (await read(slugs.draft)).steps?.[0]?.stepId
    expect(stepIdBefore).toBeTruthy()
    const report = await loadChecklistCards(payload, options())
    const scene = await mediaId(ART.scene)
    const published = await read(slugs.draft, false)
    expect(published.card?.scene).toBe(scene)
    expect(published.description).toBe('La ficha publicada.')
    expect(published.steps ?? []).toEqual([])
    const latest = await read(slugs.draft)
    expect(latest._status).toBe('draft')
    expect(latest.description).toBe('El borrador sin publicar.')
    // El paso del borrador sigue con su stepId: el progreso de cada persona va por él.
    expect(latest.steps?.map((step) => [step.zone, step.stepId])).toEqual([
      ['Amakna', stepIdBefore],
    ])
    expect(latest.card?.scene).toBe(scene)
    expect(report.withDraft).toEqual([slugs.draft])
  })

  it('la tarjeta «???» del índice recibe su escena y su huevo', async () => {
    await loadChecklistCards(payload, options())
    const index = await readIndex()
    expect(index.teaser?.scene).toBe(await mediaId(ART.teaserScene))
    expect(index.teaser?.egg).toBe(await mediaId(ART.teaserEgg))
    // Encendida, con su etiqueta y su texto de siempre.
    expect(index.teaser).toMatchObject({ enabled: true, label: 'En camino', text: '???' })
  })

  it('una segunda pasada no sube ni cambia nada', async () => {
    await loadChecklistCards(payload, options())
    const before = await read(slugs.draft)
    const report = await loadChecklistCards(payload, options())
    expect(await artCount()).toBe(4)
    expect(report.updated).toEqual([])
    expect(report.unchanged).toEqual([slugs.plain, slugs.draft])
    expect(report.teaser).toBe('unchanged')
    expect((await read(slugs.draft)).updatedAt).toBe(before.updatedAt)
  })

  it('lo que Torre cambia en el panel se queda; lo que no tocó sigue a la importación', async () => {
    await loadChecklistCards(payload, options())
    const plain = await read(slugs.plain)
    const own = (
      await payload.create({
        collection: 'media',
        data: { alt: 'Su escena', gameAsset: OWN_KEY },
        file: tinyPng(),
        overrideAccess: true,
      })
    ).id
    await payload.update({
      collection: 'checklists',
      id: plain.id,
      data: { card: { ...plain.card, scene: own, npcHeight: 60 }, _status: 'published' },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'checklists-index',
      data: { teaser: { egg: own } },
      overrideAccess: true,
    })

    // La importación cambia la escena y el encuadre del PNJ.
    const changed = entries.map((entry) =>
      entry.slug === slugs.plain
        ? {
            ...entry,
            card: {
              ...entry.card,
              scene: { path: ART.otherScene, alt: 'Otra zona' },
              npcFit: { height: 80, right: -20, top: 2 },
            },
          }
        : entry,
    )
    const report = await loadChecklistCards(payload, options(true, changed))
    const card = (await read(slugs.plain)).card!
    expect(card.scene).toBe(own)
    expect(card.npcHeight).toBe(60)
    // Lo que Torre no tocó llega.
    expect(card.npcRight).toBe(-20)
    expect(card.npcTop).toBe(2)
    expect(report.kept).toEqual(
      expect.arrayContaining([
        { slug: slugs.plain, field: 'scene' },
        { slug: slugs.plain, field: 'npcHeight' },
        { slug: 'checklists-index', field: 'egg' },
      ]),
    )
    expect((await readIndex()).teaser?.egg).toBe(own)
  })
})
