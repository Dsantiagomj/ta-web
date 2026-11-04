import { readFileSync } from 'node:fs'
import path from 'node:path'
import { NotFound, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Item, Media, Quest, QuestGuide } from '@/payload-types'

import { loadQuestGuides, type FetchImage } from '../../scripts/import/load-quest-guides'
import { parsePage } from '../../scripts/import/squarespace/parse-page'
import {
  GUIDE_SLUGS,
  toQuestGuide,
  type ConvertedGuide,
} from '../../scripts/import/squarespace/to-quest-guide'

import { startPayload, tinyPng } from './payload'

// IDs de DofusDB de quest_matches.csv. Solo existe en la base la de El cazador cazado;
// la de Intoxicación profunda falta y Operación «envenenamiento» no tiene cruce.
const QUEST_IDS: Record<string, number[]> = {
  'el-cazador-cazado': [1977],
  'intoxicacion-profunda': [1433],
  'operacion-envenenamiento': [],
  'entretanto-un-renacer': [2420],
  'seis-pies-bajo-tierra': [1976],
}
const EXISTING_QUEST = 1977
const TOFU_BEAK = 366
const MISSING_QUESTS = [1433, 2420, 1976]

function converted(): ConvertedGuide[] {
  return GUIDE_SLUGS.map((slug) => {
    const html = readFileSync(
      path.join(__dirname, '../fixtures/squarespace', `${slug}.html`),
      'utf8',
    )
    return toQuestGuide(parsePage(html), { slug, questDofusIds: QUEST_IDS[slug]! })
  })
}

/** El texto de un bloque de Lexical, sin los cortes entre nodos de distinto formato. */
function lexicalText(value: unknown): string {
  return [...JSON.stringify(value).matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
    .map((match) => match[1])
    .join('')
}

function imageUrls(guides: ConvertedGuide[]): Set<string> {
  return new Set(
    guides.flatMap(({ guide }) =>
      guide.body.flatMap((block) => (block.blockType === 'image' ? [block.url] : [])),
    ),
  )
}

describe('carga de guías importadas de Squarespace', () => {
  let payload: Payload
  let quest: Quest
  let tofuBeak: Item
  const downloads: string[] = []
  // Sin red: cada imagen es un PNG de 1×1 px.
  const fetchImage: FetchImage = async (url) => {
    downloads.push(url)
    return tinyPng(decodeURIComponent(url.split('/').pop()!).replace(/\+/g, ' '))
  }

  async function guidesBySlug(): Promise<Map<string, QuestGuide>> {
    const found = await payload.find({
      collection: 'quest-guides',
      where: { slug: { in: [...GUIDE_SLUGS] } },
      pagination: false,
      depth: 0,
      draft: true,
    })
    return new Map(found.docs.map((doc) => [doc.slug, doc]))
  }

  async function versionCount(): Promise<number> {
    const ids = [...(await guidesBySlug()).values()].map((guide) => guide.id)
    const versions = await payload.findVersions({
      collection: 'quest-guides',
      where: { parent: { in: ids } },
      pagination: false,
      depth: 0,
    })
    return versions.docs.length
  }

  async function importedMedia(): Promise<Media[]> {
    const found = await payload.find({
      collection: 'media',
      where: { originalUrl: { contains: 'images.squarespace-cdn.com' } },
      pagination: false,
      depth: 0,
    })
    return found.docs
  }

  async function cleanUp() {
    await payload.delete({ collection: 'quest-guides', where: { slug: { in: [...GUIDE_SLUGS] } } })
    await payload.delete({
      collection: 'media',
      where: { originalUrl: { contains: 'images.squarespace-cdn.com' } },
    })
    await payload.delete({
      collection: 'quests',
      where: { dofusId: { in: [EXISTING_QUEST, ...MISSING_QUESTS] } },
    })
    await payload.delete({ collection: 'items', where: { dofusId: { equals: TOFU_BEAK } } })
  }

  beforeAll(async () => {
    payload = await startPayload()
    await cleanUp()
    tofuBeak = await payload.create({
      collection: 'items',
      data: { dofusId: TOFU_BEAK, name: 'Pico de tofu', typeId: 47, superTypeId: 9 },
    })
    quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: EXISTING_QUEST,
        name: 'El cazador cazado',
        // Distinta de la de la página de Torre, para ver de dónde sale cada dato
        startPositions: [{ npcName: 'Kerubim Crepin', x: 4, y: -18 }],
        needs: { items: [{ item: tofuBeak.id, quantity: 3 }] },
      },
    })
  })

  afterAll(async () => {
    await cleanUp()
    await payload.destroy()
  })

  it('crea las guías como borradores, con sus bloques, imágenes y misiones', async () => {
    const guides = converted()
    const urls = imageUrls(guides)

    const result = await loadQuestGuides(payload, guides, { fetchImage })

    expect(result.guides).toEqual({ created: 5, updated: 0, unchanged: 0, skipped: 0 })
    expect(result.media).toEqual({ created: urls.size, reused: 0 })
    expect(downloads.sort()).toEqual([...urls].sort())

    const saved = await guidesBySlug()
    expect([...saved.keys()].sort()).toEqual([...GUIDE_SLUGS].sort())
    for (const guide of saved.values()) expect(guide._status).toBe('draft')

    const hunter = saved.get('el-cazador-cazado')!
    expect(hunter).toMatchObject({
      title: 'El cazador cazado',
      originalUrl: 'https://www.torrentearcano.com/el-cazador-cazado',
      quests: [quest.id],
      summary: { startNpc: 'Kerubim Crepin', startX: 3, startY: -17 },
    })
    // El texto de Squarespace va a las notas; la lista de objetos sale de DofusDB
    expect(hunter.summary?.needs).toMatchObject({
      notes: 'Literalmente nada xD.',
      items: [{ item: tofuBeak.id, quantity: 3 }],
    })

    const blockTypes = new Set(
      [...saved.values()].flatMap((guide) => guide.body?.map((block) => block.blockType) ?? []),
    )
    expect([...blockTypes].sort()).toEqual(['callout', 'image', 'richText', 'video'])

    const video = saved.get('intoxicacion-profunda')!.body?.at(-1)
    expect(video).toMatchObject({
      blockType: 'video',
      url: 'https://www.youtube.com/watch?v=VaY3tyYTq4A',
    })

    const callout = saved
      .get('seis-pies-bajo-tierra')!
      .body?.find((block) => block.blockType === 'callout')
    expect(callout).toMatchObject({ variant: 'warning' })
    expect(lexicalText(callout)).toContain('IMPORTANTE: las anutrof NO deben morir')

    const firstText = hunter.body?.find((block) => block.blockType === 'richText')
    expect(lexicalText(firstText)).toContain('Dirígete a la Biblioteca de Astrub')
  })

  it('guarda cada imagen en media con su URL original y su texto alternativo', async () => {
    const media = await importedMedia()
    expect(media).toHaveLength(imageUrls(converted()).size)

    const withAlt = media.find((doc) => doc.originalUrl?.endsWith('203347.png'))
    expect(withAlt?.alt).toMatch(/^Pantalla de diálogo/)
    const withoutAlt = media.find((doc) => doc.originalUrl?.endsWith('010216.png'))
    expect(withoutAlt?.alt).toBe('Operación «envenenamiento»')

    const hunter = (await guidesBySlug()).get('el-cazador-cazado')!
    const image = hunter.body?.find((block) => block.blockType === 'image')
    expect(media.map((doc) => doc.id)).toContain(image?.blockType === 'image' && image.image)
  })

  it('devuelve las rarezas de cada guía, también las misiones que faltan en la base', async () => {
    const result = await loadQuestGuides(payload, converted(), { fetchImage })

    expect(result.oddities['operacion-envenenamiento']).toContain('Sin misión de DofusDB enlazada')
    expect(result.oddities['intoxicacion-profunda']).toEqual([
      'Misión de DofusDB 1433 sin importar en quests',
    ])
    expect(result.oddities['el-cazador-cazado']).toEqual([])
  })

  it('una segunda pasada no duplica, no descarga ni guarda versiones de guías sin cambios', async () => {
    const before = downloads.length
    const mediaBefore = (await importedMedia()).length
    const versionsBefore = await versionCount()

    const result = await loadQuestGuides(payload, converted(), { fetchImage })

    expect(result.guides).toEqual({ created: 0, updated: 0, unchanged: 5, skipped: 0 })
    expect(await versionCount()).toBe(versionsBefore)
    expect(result.media).toEqual({ created: 0, reused: mediaBefore })
    expect(downloads).toHaveLength(before)
    expect(await importedMedia()).toHaveLength(mediaBefore)

    const saved = await guidesBySlug()
    expect(saved.size).toBe(5)
    for (const guide of saved.values()) expect(guide._status).toBe('draft')
  })

  it('una guía que cambia guarda un borrador nuevo; las demás no se tocan', async () => {
    const versionsBefore = await versionCount()
    const guides = converted()
    guides[0]!.guide.summary.needs = { notes: 'Un objeto nuevo.' }

    const result = await loadQuestGuides(payload, guides, { fetchImage })

    expect(result.guides).toEqual({ created: 0, updated: 1, unchanged: 4, skipped: 0 })
    expect(await versionCount()).toBe(versionsBefore + 1)
    const changed = (await guidesBySlug()).get(guides[0]!.guide.slug)!
    expect(changed).toMatchObject({
      _status: 'draft',
      summary: { needs: { notes: 'Un objeto nuevo.' } },
    })
  })

  it('un campo del resumen que desaparece se rellena con DofusDB, y repetir no guarda más versiones', async () => {
    const withoutFields = () => {
      const guides = converted()
      delete guides[0]!.guide.summary.needs
      delete guides[0]!.guide.summary.startX
      delete guides[0]!.guide.summary.startY
      return guides
    }

    const first = await loadQuestGuides(payload, withoutFields(), { fetchImage })
    expect(first.guides).toMatchObject({ updated: 1, unchanged: 4 })
    const cleared = (await guidesBySlug()).get(withoutFields()[0]!.guide.slug)!
    expect(cleared.summary).toMatchObject({
      needs: { notes: null, items: [{ item: tofuBeak.id, quantity: 3 }] },
      startX: 4,
      startY: -18,
    })

    const versionsBefore = await versionCount()
    const second = await loadQuestGuides(payload, withoutFields(), { fetchImage })
    expect(second.guides).toEqual({ created: 0, updated: 0, unchanged: 5, skipped: 0 })
    expect(await versionCount()).toBe(versionsBefore)
  })

  it('un visitante anónimo no ve los borradores importados', async () => {
    const found = await payload.find({
      collection: 'quest-guides',
      where: { slug: { in: [...GUIDE_SLUGS] } },
      overrideAccess: false,
    })
    expect(found.docs).toEqual([])

    const hunter = (await guidesBySlug()).get('el-cazador-cazado')!
    await expect(
      payload.findByID({ collection: 'quest-guides', id: hunter.id, overrideAccess: false }),
    ).rejects.toThrow(NotFound)
  })

  it('salta una guía con slug no válido y lo anota', async () => {
    const [first] = converted()
    const invalid: ConvertedGuide = {
      guide: { ...first!.guide, slug: 'Slug_Malo' },
      oddities: ['Slug no válido: Slug_Malo'],
    }

    const result = await loadQuestGuides(payload, [invalid], { fetchImage })

    expect(result.guides).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 })
    expect(result.oddities['Slug_Malo']).toEqual(['Slug no válido: Slug_Malo'])
  })
})
