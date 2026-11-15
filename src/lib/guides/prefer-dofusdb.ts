// Las cifras de recompensa que Torre escribió y casi coinciden con las de DofusDB pasan a las
// de DofusDB: una diferencia pequeña suele ser una errata o una cifra de antes de un parche.
// Una grande se queda y se lista para revisarla. Solo toca los campos de recompensa ya
// llenos; «Recompensas en texto» nunca. Lo usa scripts/prefer-dofusdb-rewards.ts
// (pnpm guides:rewards-dofusdb), después de pnpm guides:rewards.
import type { Payload } from 'payload'

import type { Quest, QuestGuide } from '../../payload-types'
import { linkedQuestId } from './autofill'
import { formatThousands } from './display'
import { guideStrings } from './strings'
import type { LinkedItem, LinkedLevelRewards, LinkedQuest, LinkedRewards } from './summary'

/** Hasta cuánto se aparta una cifra de Torre de la de DofusDB para pasar a la de DofusDB. */
export const DOFUSDB_TOLERANCE = 0.1

/** Una fila de objeto guardada: el objeto como ID o poblado. */
interface ItemRow {
  id?: string | null
  item: number | { id: number } | null | undefined
  quantity: number | null | undefined
}

/** Una fila de «Por nivel» guardada. */
interface LevelRow {
  id?: string | null
  levelMin?: number | null
  levelMax?: number | null
  experience?: number | null
  kamas?: number | null
  items?: ItemRow[] | null
}

/** Los campos de recompensa de la guía que se comparan. */
export interface PreferFields {
  rewardExperience?: number | null
  rewardExperienceMin?: number | null
  rewardKamas?: number | null
  rewardItems?: ItemRow[] | null
  rewardLevels?: LevelRow[] | null
}

/** Una cifra de Torre comparada con la de DofusDB; la de un tramo lleva su nombre. */
export interface RewardComparison {
  field: 'XP' | 'kamas' | 'objeto'
  level?: string
  name?: string
  torre: number
  dofusDb: number
}

type SavedRow = { id?: string; item: number; quantity: number }
type SavedLevel = {
  id?: string
  levelMin: number
  levelMax: number
  experience?: number | null
  kamas?: number | null
  items: SavedRow[]
}

/** Lo que se escribe: los campos que cambian, enteros. */
export interface PreferUpdate {
  rewardExperience?: number
  rewardExperienceMin?: number
  rewardKamas?: number
  rewardItems?: SavedRow[]
  rewardLevels?: SavedLevel[]
}

export interface PreferDecision {
  update: PreferUpdate
  /** Las cifras que pasan a las de DofusDB. */
  switched: RewardComparison[]
  /** Las que se apartan más del margen: se quedan las de Torre. */
  kept: RewardComparison[]
}

/** Si la cifra de Torre está dentro del margen de la de DofusDB. */
export function closeEnough(torre: number, dofusDb: number): boolean {
  return Math.abs(torre - dofusDb) <= DOFUSDB_TOLERANCE * dofusDb
}

const relationId = (item: ItemRow['item']) => (typeof item === 'object' ? item?.id : item)

/**
 * Compara una cifra: igual, nada; dentro del margen, la de DofusDB; fuera, la de Torre y se
 * lista. Un 0 de Torre quita la cifra a propósito, y sin cifra de DofusDB no hay con qué
 * comparar: ninguno de los dos se toca.
 */
function compare(
  decision: PreferDecision,
  torre: number | null | undefined,
  dofusDb: number | null | undefined,
  comparison: Omit<RewardComparison, 'torre' | 'dofusDb'>,
): number | undefined {
  if (!torre || !dofusDb || torre === dofusDb) return undefined
  const entry = { ...comparison, torre, dofusDb }
  if (closeEnough(torre, dofusDb)) {
    decision.switched.push(entry)
    return dofusDb
  }
  decision.kept.push(entry)
  return undefined
}

/** Sus filas de objetos con la cantidad de DofusDB donde casi coincide; null si ninguna cambia. */
function preferItems(
  decision: PreferDecision,
  rows: ItemRow[],
  given: LinkedRewards['items'],
  level?: string,
): SavedRow[] | null {
  const byId = new Map<number, { quantity: number; name?: string | null }>()
  for (const { item, quantity } of given ?? []) {
    const id = typeof item === 'object' ? item.id : item
    if (id !== undefined) byId.set(id, { quantity, name: (item as LinkedItem).name })
  }
  let changed = false
  const saved = rows.flatMap((row): SavedRow[] => {
    const id = relationId(row.item)
    if (id == null || row.quantity == null) return []
    const dofusDb = byId.get(id)
    const name = dofusDb?.name ?? String(id)
    const quantity = compare(decision, row.quantity, dofusDb?.quantity, {
      field: 'objeto',
      ...(level && { level }),
      name,
    })
    if (quantity !== undefined) changed = true
    return [{ ...(row.id && { id: row.id }), item: id, quantity: quantity ?? row.quantity }]
  })
  return changed ? saved : null
}

/** El tramo de DofusDB con los mismos niveles. */
function sameTier(levels: LinkedLevelRewards[] | null | undefined, row: LevelRow) {
  return levels?.find((tier) => tier.levelMin === row.levelMin && tier.levelMax === row.levelMax)
}

/**
 * Qué cifras de recompensa de la guía pasan a las de DofusDB: XP, kamas y cantidades de
 * objetos, sueltas y de cada tramo de «Por nivel» (con el tramo de los mismos niveles).
 */
export function preferDofusDb(
  current: PreferFields,
  quest: LinkedQuest | null | undefined,
): PreferDecision {
  const decision: PreferDecision = { update: {}, switched: [], kept: [] }
  const given = quest?.rewards
  if (!given) return decision

  const experience = compare(decision, current.rewardExperience, given.experience, { field: 'XP' })
  if (experience !== undefined) {
    decision.update.rewardExperience = experience
    // Su XP iba sin mínima: la de DofusDB va con la XP de DofusDB.
    if (current.rewardExperienceMin == null && given.experienceMin) {
      decision.update.rewardExperienceMin = given.experienceMin
    }
  }
  const kamas = compare(decision, current.rewardKamas, given.kamas, { field: 'kamas' })
  if (kamas !== undefined) decision.update.rewardKamas = kamas

  const items = preferItems(decision, current.rewardItems ?? [], given.items)
  if (items) decision.update.rewardItems = items

  let levelsChanged = false
  // Un tramo sin sus niveles no se puede guardar (son obligatorios): no hay ninguno así.
  const levels = (current.rewardLevels ?? []).flatMap((row): SavedLevel[] => {
    const { id, items: rowItems, levelMin, levelMax, experience, kamas } = row
    if (levelMin == null || levelMax == null) return []
    const tier = sameTier(given.byLevel, row)
    const level = guideStrings.summary.levelRange(levelMin, levelMax)
    const saved: SavedLevel = {
      ...(id && { id }),
      levelMin,
      levelMax,
      experience,
      kamas,
      items: (rowItems ?? []).flatMap((itemRow) => {
        const itemId = relationId(itemRow.item)
        return itemId == null || itemRow.quantity == null
          ? []
          : [{ ...(itemRow.id && { id: itemRow.id }), item: itemId, quantity: itemRow.quantity }]
      }),
    }
    if (!tier) return [saved]
    const tierExperience = compare(decision, row.experience, tier.experience, {
      field: 'XP',
      level,
    })
    const tierKamas = compare(decision, row.kamas, tier.kamas, { field: 'kamas', level })
    const tierItems = preferItems(decision, rowItems ?? [], tier.items, level)
    if (tierExperience !== undefined) saved.experience = tierExperience
    if (tierKamas !== undefined) saved.kamas = tierKamas
    if (tierItems) saved.items = tierItems
    if (tierExperience !== undefined || tierKamas !== undefined || tierItems) levelsChanged = true
    return [saved]
  })
  if (levelsChanged) decision.update.rewardLevels = levels
  return decision
}

export interface GuidePreference extends PreferDecision {
  slug: string
  status: 'published' | 'draft'
}

export interface PreferDofusDbResult {
  /** Guías leídas, por su última versión. */
  guides: number
  /** Las que tienen alguna cifra que comparar fuera de lo igual. */
  preferences: GuidePreference[]
  /** Guías guardadas: publicadas y borradores. */
  published: number
  drafts: number
}

/**
 * Recorre todas las guías por su última versión, como backfillGuideRewards: si lo último es
 * lo publicado, guarda publicado; si es un borrador, guarda el borrador. Sin apply solo
 * cuenta. Repetida, no cambia nada: lo que pasó a DofusDB ya es igual.
 */
export async function preferDofusDbRewards(
  payload: Payload,
  options: { apply: boolean; log?: (message: string) => void },
): Promise<PreferDofusDbResult> {
  const log = options.log ?? (() => {})
  const result: PreferDofusDbResult = { guides: 0, preferences: [], published: 0, drafts: 0 }
  const guides = await payload.find({
    collection: 'quest-guides',
    pagination: false,
    depth: 0,
    draft: true,
    sort: 'slug',
    select: { slug: true, quest: true, summary: true, _status: true },
    overrideAccess: true,
  })
  const questIds = [...new Set(guides.docs.flatMap((guide) => linkedQuestId(guide.quest) ?? []))]
  // depth 1: los nombres de los objetos, para el informe.
  const quests = questIds.length
    ? await payload.find({
        collection: 'quests',
        where: { id: { in: questIds } },
        pagination: false,
        depth: 1,
        select: { rewards: true },
        populate: { items: { name: true } },
        overrideAccess: true,
      })
    : { docs: [] as Quest[] }
  const questById = new Map(quests.docs.map((quest) => [quest.id, quest as LinkedQuest]))

  for (const guide of guides.docs as QuestGuide[]) {
    result.guides += 1
    const quest = questById.get(linkedQuestId(guide.quest) ?? -1) ?? null
    const decision = preferDofusDb((guide.summary ?? {}) as PreferFields, quest)
    if (!decision.switched.length && !decision.kept.length) continue
    const published = guide._status === 'published'
    result.preferences.push({
      slug: guide.slug,
      status: published ? 'published' : 'draft',
      ...decision,
    })
    if (!Object.keys(decision.update).length) continue
    log(
      `Guía ${guide.slug}${published ? '' : ' (borrador)'}: ${Object.keys(decision.update).join(', ')}`,
    )
    if (!options.apply) continue
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { summary: decision.update, _status: published ? 'published' : 'draft' },
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
  }
  return result
}

const ratio = (comparison: RewardComparison) =>
  (comparison.torre / comparison.dofusDb).toLocaleString('es', { maximumFractionDigits: 3 })

function comparisonText(comparison: RewardComparison): string {
  const field = comparison.field === 'objeto' ? `objeto ${comparison.name}` : comparison.field
  return [
    ...(comparison.level ? [comparison.level] : []),
    field,
    `Torre ${formatThousands(comparison.torre)}`,
    `DofusDB ${formatThousands(comparison.dofusDb)}`,
    `ratio ${ratio(comparison)}`,
  ].join(', ')
}

/**
 * El informe: lo que pasa a DofusDB y las diferencias grandes, una por línea, y cuántas
 * guías pasan a DofusDB por campo.
 */
export function preferDofusDbReport(result: PreferDofusDbResult, apply: boolean): string[] {
  const draft = (guide: GuidePreference) => (guide.status === 'draft' ? ' (borrador)' : '')
  const kept = result.preferences.filter((guide) => guide.kept.length)
  const lines = [
    'Pasan a DofusDB:',
    ...result.preferences.flatMap((guide) =>
      guide.switched.map((entry) => `${guide.slug}${draft(guide)}: ${comparisonText(entry)}`),
    ),
    'Diferencias grandes (se queda la cifra de Torre):',
    ...kept.flatMap((guide) =>
      guide.kept.map((comparison) => `${guide.slug}${draft(guide)}: ${comparisonText(comparison)}`),
    ),
  ]
  const changed = result.preferences.filter((guide) => Object.keys(guide.update).length)
  const drafts = changed.filter((guide) => guide.status === 'draft').length
  const count = (field: RewardComparison['field'], byLevel: boolean) =>
    result.preferences.filter((guide) =>
      guide.switched.some((entry) => entry.field === field && Boolean(entry.level) === byLevel),
    ).length
  lines.push(
    `Guías leídas: ${result.guides}. Con cambios: ${changed.length} ` +
      `(publicadas: ${changed.length - drafts}, borradores: ${drafts}).`,
    `Pasan a DofusDB: XP en ${count('XP', false)}, kamas en ${count('kamas', false)}, ` +
      `objetos en ${count('objeto', false)}; por nivel, XP en ${count('XP', true)}, ` +
      `kamas en ${count('kamas', true)}, objetos en ${count('objeto', true)}.`,
    `Diferencias grandes: ${kept.reduce((sum, guide) => sum + guide.kept.length, 0)}, ` +
      `en ${kept.length} guías.`,
    apply
      ? `Guardadas: publicadas ${result.published} y borradores ${result.drafts}.`
      : 'En seco: sin --apply no se escribe nada.',
  )
  return lines
}
