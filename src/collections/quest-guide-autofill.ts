import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

import {
  autofillFromQuest,
  availableSlug,
  fillsFromDofusDb,
  linkedQuestId,
} from '../lib/guides/autofill'
import { guideStrings } from '../lib/guides/strings'
import {
  applySummaryFill,
  FILLABLE_FIELDS,
  summaryToFill,
  type CurrentSummary,
} from '../lib/guides/summary'
import type { QuestGuide } from '../payload-types'
import { isRootSlugTaken } from './root-slug'

// Lo que llega en `data` manda, aunque sea null (la importación vacía así un campo); lo
// que no llega se toma del documento guardado.
function sent<T>(value: T | undefined, saved: T | undefined): T | undefined {
  return value === undefined ? saved : value
}

/**
 * Rellena lo vacío desde la misión de DofusDB enlazada. El SEO y el resumen, solo al crear
 * la guía o al cambiar de misión: lo que Torre vacía después se queda vacío (el botón
 * «Rellenar desde DofusDB» lo rellena a petición). El título y el slug, siempre que estén
 * vacíos, porque son obligatorios. Nunca cambia lo que ya hay: las guías importadas
 * conservan su slug y su resumen de Squarespace. Al editar, `data` puede venir a medias,
 * así que lo que falta se busca en el documento guardado.
 */
export const fillFromQuest: CollectionBeforeValidateHook<QuestGuide> = async ({
  collection,
  data,
  operation,
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
  const summary: CurrentSummary = {
    ...Object.fromEntries(
      FILLABLE_FIELDS.map((field) => [field, sent(data.summary?.[field], saved?.summary?.[field])]),
    ),
    rewardExperienceMin: sent(
      data.summary?.rewardExperienceMin,
      saved?.summary?.rewardExperienceMin,
    ),
    rewardItems: sent(data.summary?.rewardItems, saved?.summary?.rewardItems),
    needs: { items: sent(data.summary?.needs?.items, saved?.summary?.needs?.items) },
  }
  const questId = linkedQuestId(sent(data.quest, saved?.quest))
  const full = fillsFromDofusDb(operation, data.quest, saved?.quest)
  const identityMissing = !current.title?.trim() || !current.slug?.trim()

  if (questId !== null && (full || identityMissing)) {
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
      // Libre en toda la raíz: guías, logros y metalogros, también en sus borradores.
      data.slug = await availableSlug(fill.slug, (slug) =>
        isRootSlugTaken(req, slug, 'quest-guides', saved?.id),
      )
    }
    if (full && (fill.metaTitle || fill.metaDescription)) {
      data.seo = {
        ...saved?.seo,
        ...data.seo,
        ...(fill.metaTitle && { metaTitle: fill.metaTitle }),
        ...(fill.metaDescription && { metaDescription: fill.metaDescription }),
      }
    }
    const summaryFill = full ? summaryToFill(summary, quest) : {}
    if (Object.keys(summaryFill).length) {
      const merged = {
        ...saved?.summary,
        ...data.summary,
        needs: { ...saved?.summary?.needs, ...data.summary?.needs },
      }
      data.summary = applySummaryFill(merged, summaryFill)
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
