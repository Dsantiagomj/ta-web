import { ValidationError, type CollectionBeforeValidateHook, type Where } from 'payload'

import { autofillFromQuest, availableSlug, firstQuestId } from '../lib/guides/autofill'
import { guideStrings } from '../lib/guides/strings'
import type { QuestGuide } from '../payload-types'

/**
 * Rellena el título, el slug y el SEO vacíos desde la primera misión de DofusDB. Nunca
 * cambia lo que ya hay: las guías importadas conservan su slug de Squarespace. Al editar,
 * `data` puede venir a medias, así que lo que falta se busca en el documento guardado.
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
    title: data.title ?? saved?.title,
    slug: data.slug ?? saved?.slug,
    metaTitle: data.seo?.metaTitle ?? saved?.seo?.metaTitle,
    metaDescription: data.seo?.metaDescription ?? saved?.seo?.metaDescription,
  }
  const questId = firstQuestId(data.quests ?? saved?.quests)

  if (questId !== null) {
    const quest = await req.payload.findByID({
      collection: 'quests',
      id: questId,
      depth: 0,
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
        ...data.seo,
        ...(fill.metaTitle && { metaTitle: fill.metaTitle }),
        ...(fill.metaDescription && { metaDescription: fill.metaDescription }),
      }
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
