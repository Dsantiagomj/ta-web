import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import { validateSlug } from '@/collections/QuestGuides'
import type { QuestGuide } from '@/payload-types'

import { createHtmlToLexical } from './rich-text'
import type { ConvertedGuide, GuideBlock } from './squarespace/to-quest-guide'

export interface ImageFile {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

/** Descarga una imagen del CDN de Squarespace. Inyectable para probar sin red. */
export type FetchImage = (url: string) => Promise<ImageFile>

export interface LoadQuestGuidesOptions {
  fetchImage: FetchImage
  log?: (message: string) => void
}

export interface LoadQuestGuidesResult {
  guides: { created: number; updated: number; unchanged: number; skipped: number }
  media: { created: number; reused: number }
  /** Por slug: las rarezas de la conversión más las de la carga. */
  oddities: Record<string, string[]>
}

type BodyBlock = NonNullable<QuestGuide['body']>[number]

/**
 * Para comparar con lo guardado: sin IDs (de bloque y los aleatorios de los enlaces de
 * Lexical) ni campos vacíos, que Payload devuelve como null aunque no se enviaran.
 */
function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => key !== 'id' && item !== null && item !== undefined)
        .map(([key, item]) => [key, comparable(item)]),
    )
  }
  return value
}

const COMPARED_FIELDS = ['title', 'slug', 'originalUrl', 'summary', 'quests', 'body'] as const

function sameGuide(stored: QuestGuide, data: Pick<QuestGuide, (typeof COMPARED_FIELDS)[number]>) {
  return COMPARED_FIELDS.every((field) =>
    isDeepStrictEqual(comparable(stored[field]), comparable(data[field])),
  )
}

/**
 * Guarda las guías convertidas con la API local. Es un trabajo de confianza, así que
 * usa overrideAccess. Idempotente: las guías se buscan por slug y las imágenes por su
 * URL original, de modo que repetirla no duplica nada ni vuelve a descargar, y una guía
 * igual a su último borrador no se toca, para no sumar versiones vacías. Siempre
 * guarda borradores: una guía ya publicada recibe un borrador nuevo y sigue publicada
 * como estaba hasta que Torre lo publique.
 */
export async function loadQuestGuides(
  payload: Payload,
  guides: ConvertedGuide[],
  options: LoadQuestGuidesOptions,
): Promise<LoadQuestGuidesResult> {
  const log = options.log ?? (() => {})
  const toLexical = await createHtmlToLexical(payload.config)
  const result: LoadQuestGuidesResult = {
    guides: { created: 0, updated: 0, unchanged: 0, skipped: 0 },
    media: { created: 0, reused: 0 },
    oddities: {},
  }

  const dofusIds = [...new Set(guides.flatMap(({ guide }) => guide.questDofusIds))]
  const quests = await payload.find({
    collection: 'quests',
    where: { dofusId: { in: dofusIds } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const questIdByDofusId = new Map(quests.docs.map((quest) => [quest.dofusId, quest.id]))

  // URL original → ID en media, para no repetir consultas ni descargas en la misma pasada.
  const mediaIdByUrl = new Map<string, number>()

  async function mediaFor(url: string, alt: string): Promise<number> {
    const known = mediaIdByUrl.get(url)
    if (known !== undefined) return known

    const existing = await payload.find({
      collection: 'media',
      where: { originalUrl: { equals: url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    let id = existing.docs[0]?.id
    if (id === undefined) {
      const created = await payload.create({
        collection: 'media',
        data: { alt, originalUrl: url },
        file: await options.fetchImage(url),
        depth: 0,
        overrideAccess: true,
      })
      id = created.id
      result.media.created += 1
    } else {
      result.media.reused += 1
    }
    mediaIdByUrl.set(url, id)
    return id
  }

  async function toBodyBlock(block: GuideBlock, oddities: string[]): Promise<BodyBlock | null> {
    switch (block.blockType) {
      case 'richText':
        return { blockType: 'richText', content: toLexical(block.html) }
      case 'callout':
        return { blockType: 'callout', variant: block.variant, content: toLexical(block.html) }
      case 'video':
        return { blockType: 'video', url: block.url }
      case 'image':
        try {
          return { blockType: 'image', image: await mediaFor(block.url, block.alt) }
        } catch (error) {
          // Una imagen caída no tumba la guía: queda anotada para revisarla.
          oddities.push(`Imagen sin importar: ${block.url} (${(error as Error).message})`)
          return null
        }
    }
  }

  for (const { guide, oddities: conversionOddities } of guides) {
    const oddities = [...conversionOddities]
    result.oddities[guide.slug] = oddities
    if (validateSlug(guide.slug) !== true) {
      result.guides.skipped += 1
      log(`Guía ${guide.slug}: saltada, el slug no es válido`)
      continue
    }

    const quests: number[] = []
    for (const dofusId of guide.questDofusIds) {
      const id = questIdByDofusId.get(dofusId)
      if (id === undefined) oddities.push(`Misión de DofusDB ${dofusId} sin importar en quests`)
      else quests.push(id)
    }

    const body: BodyBlock[] = []
    for (const block of guide.body) {
      const converted = await toBodyBlock(block, oddities)
      if (converted) body.push(converted)
    }

    const data = {
      title: guide.title,
      slug: guide.slug,
      originalUrl: guide.originalUrl,
      summary: guide.summary,
      quests,
      body,
      _status: 'draft' as const,
    }
    const existing = await payload.find({
      collection: 'quest-guides',
      where: { slug: { equals: guide.slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const current = existing.docs[0]
    if (current && sameGuide(current, data)) {
      result.guides.unchanged += 1
      log(`Guía ${guide.slug}: sin cambios`)
      continue
    }
    if (current) {
      await payload.update({
        collection: 'quest-guides',
        id: current.id,
        data,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
      result.guides.updated += 1
    } else {
      await payload.create({
        collection: 'quest-guides',
        data,
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
      result.guides.created += 1
    }
    log(`Guía ${guide.slug}: ${current ? 'actualizada' : 'creada'}, ${body.length} bloques`)
  }

  return result
}
