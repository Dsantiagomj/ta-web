import { ValidationError, type CollectionBeforeValidateHook, type Where } from 'payload'

import { autofillFromQuest, availableSlug, firstQuestId } from '../lib/guides/autofill'
import { guideStrings } from '../lib/guides/strings'
import { FILLABLE_FIELDS, summaryToFill } from '../lib/guides/summary'
import type { QuestGuide } from '../payload-types'

// Lo que llega en `data` manda, aunque sea null (la importación vacía así un campo); lo
// que no llega se toma del documento guardado.
function sent<T>(value: T | undefined, saved: T | undefined): T | undefined {
  return value === undefined ? saved : value
}

/**
 * Rellena el título, el slug, el SEO y el resumen vacíos desde la primera misión de
 * DofusDB. Nunca cambia lo que ya hay: las guías importadas conservan su slug y su
 * resumen de Squarespace. Al editar, `data` puede venir a medias, así que lo que falta se
 * busca en el documento guardado.
 */
export const fillFromQuest: CollectionBeforeValidateHook<QuestGuide> = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data
  const saved = originalDoc as Partial<QuestGuide> | undefined
  const current = {
    title: sent(data.title, saved?.title),
    slug: sent(data.slug, saved?.slug),
    metaTitle: sent(data.seo?.metaTitle, saved?.seo?.metaTitle),
    metaDescription: sent(data.seo?.metaDescription, saved?.seo?.metaDescription),
  }
  const summary = Object.fromEntries(
    FILLABLE_FIELDS.map((field) => [field, sent(data.summary?.[field], saved?.summary?.[field])]),
  )
  const questId = firstQuestId(sent(data.quests, saved?.quests))

  if (questId !== null) {
    const quest = await req.payload.findByID({
      collection: 'quests',
      id: questId,
      // depth 1: los nombres de objetos y prerrequisitos del resumen
      depth: 1,
      disableErrors: true,
      req,
    })
    const fill = quest ? autofillFromQuest(current, quest) : {}
    if (fill.title) data.title = current.title = fill.title
    if (fill.slug) {
      data.slug = await availableSlug(fill.slug, async (slug) => {
        const where: Where = { slug: { equals: slug } }
        const others: Where = saved?.id ? { and: [where, { id: { not_equals: saved.id } }] } : where
        const { totalDocs } = await req.payload.count({
          collection: 'quest-guides',
          where: others,
          req,
        })
        return totalDocs > 0
      })
    }
    if (fill.metaTitle || fill.metaDescription) {
      data.seo = {
        ...saved?.seo,
        ...data.seo,
        ...(fill.metaTitle && { metaTitle: fill.metaTitle }),
        ...(fill.metaDescription && { metaDescription: fill.metaDescription }),
      }
    }
    const summaryFill = summaryToFill(summary, quest)
    if (Object.keys(summaryFill).length) {
      data.summary = { ...saved?.summary, ...data.summary, ...summaryFill }
    }
  }

  // Los borradores se guardan sin validar: sin esto, una guía podría quedar sin título.
  if (!current.title?.trim()) {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: 'title', message: guideStrings.admin.titleRequired }],
      req,
    })
  }
  return data
}
