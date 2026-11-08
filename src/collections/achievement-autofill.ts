import { ValidationError, type CollectionBeforeValidateHook, type PayloadRequest } from 'payload'

import { achievementValues, groupValues } from '../lib/achievements/dofusdb-source'
import { fillFromValues } from '../lib/achievements/dofusdb-values'
import { achievementStrings } from '../lib/achievements/strings'
import { availableSlug, linkedQuestId, slugFromName } from '../lib/guides/autofill'
import { isRootSlugTaken, type RootSlugCollection } from './root-slug'

type Doc = Record<string, unknown> & { id?: number; rewards?: Record<string, unknown> | null }

// Lo que llega en `data` manda, aunque sea null (Torre vació el campo); lo que no llega se
// toma del documento guardado.
function sent(data: Doc, saved: Doc | undefined, key: string): unknown {
  return data[key] === undefined ? saved?.[key] : data[key]
}

/**
 * El primer slug libre en toda la raíz: el de la base, luego los de reserva (logro-…) y por
 * último la base con -2, -3… Uno reservado (/sistema…) cuenta como ocupado.
 */
async function freeRootSlug(
  req: PayloadRequest,
  candidates: string[],
  self: RootSlugCollection,
  ownId: number | undefined,
): Promise<string> {
  const isTaken = (slug: string) => isRootSlugTaken(req, slug, self, ownId)
  for (const candidate of candidates) if (!(await isTaken(candidate))) return candidate
  return availableSlug(candidates.at(-1)!, isTaken)
}

function requireName(name: unknown, self: RootSlugCollection, req: PayloadRequest) {
  if (typeof name === 'string' && name.trim()) return
  throw new ValidationError({
    collection: self,
    errors: [{ path: 'name', message: achievementStrings.admin.nameRequired }],
    req,
  })
}

const REWARD_FIELDS = ['experience', 'kamas', 'items'] as const

/**
 * Rellena lo vacío de una página de logro con lo que da su logro de DofusDB (nombre,
 * metalogro, orden, puntos, recompensas y misiones) y el slug con el nombre. Nunca cambia
 * lo que ya hay, ni el estado, que es de Torre.
 */
export const fillAchievementPage: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data
  const saved = originalDoc as Doc | undefined
  const doc = data as Doc
  const rewards = { ...saved?.rewards, ...(doc.rewards ?? {}) }
  const achievementId = linkedQuestId(sent(doc, saved, 'achievement'))
  if (achievementId !== null) {
    const values = await achievementValues(req.payload, achievementId, req)
    if (values) {
      const current = {
        name: sent(doc, saved, 'name'),
        group: sent(doc, saved, 'group'),
        order: sent(doc, saved, 'order'),
        points: sent(doc, saved, 'points'),
        quests: sent(doc, saved, 'quests'),
        experience: rewards.experience,
        kamas: rewards.kamas,
        items: rewards.items,
      }
      const fill = fillFromValues('achievement', values, current)
      for (const [field, value] of Object.entries(fill)) {
        if ((REWARD_FIELDS as readonly string[]).includes(field)) rewards[field] = value
        else doc[field] = value
      }
      if (REWARD_FIELDS.some((field) => field in fill)) doc.rewards = rewards
    }
  }
  const name = sent(doc, saved, 'name')
  requireName(name, 'achievement-pages', req)
  if (!sent(doc, saved, 'slug')) {
    const base = slugFromName(String(name))
    doc.slug = await freeRootSlug(req, [base, `logro-${base}`], 'achievement-pages', saved?.id)
  }
  return data
}

/**
 * Rellena lo vacío de un metalogro con lo que da su categoría de DofusDB (nombre, orden,
 * sección y representante) y el slug con el nombre, como los de Torre: metalogro-astrub. Un metalogro
 * sin categoría (Misiones de templo) se escribe a mano.
 */
export const fillAchievementGroup: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data
  const saved = originalDoc as Doc | undefined
  const doc = data as Doc
  const categoryId = linkedQuestId(sent(doc, saved, 'category'))
  if (categoryId !== null) {
    const values = await groupValues(req.payload, categoryId, req)
    if (values) {
      const current = Object.fromEntries(
        ['name', 'order', 'section', 'representative'].map((field) => [
          field,
          sent(doc, saved, field),
        ]),
      )
      Object.assign(doc, fillFromValues('group', values, current))
    }
  }
  const name = sent(doc, saved, 'name')
  requireName(name, 'achievement-groups', req)
  if (!sent(doc, saved, 'slug')) {
    const base = `metalogro-${slugFromName(String(name))}`
    doc.slug = await freeRootSlug(req, [base], 'achievement-groups', saved?.id)
  }
  return data
}
