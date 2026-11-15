// Llena una vez los campos de recompensa de las guías que ya existían antes de tenerlos: las
// cifras que Torre escribió en su texto y, donde no hay, las de DofusDB, como haría el
// rellenado al crear la guía. Solo llena lo vacío: un campo con valor no se toca nunca.
// Lo usa scripts/backfill-guide-rewards.ts (pnpm guides:rewards).
import type { Payload } from 'payload'

import type { Quest, QuestGuide } from '../../payload-types'
import { linkedQuestId } from './autofill'
import { formatThousands } from './display'
import { torreRewards } from './reward-text'
import { summaryToFill, type FilledRow, type LinkedQuest, type NeedRow } from './summary'

/** Los campos de recompensa de la guía, tal como están guardados. */
export interface RewardFields {
  rewardExperience?: number | null
  rewardExperienceMin?: number | null
  rewardKamas?: number | null
  rewardItems?: NeedRow[] | null
  rewardNotes?: string | null
}

/** Lo que se escribe: solo campos vacíos. */
export interface RewardFill {
  rewardExperience?: number
  rewardExperienceMin?: number
  rewardKamas?: number
  rewardItems?: FilledRow[]
  rewardNotes?: string
}

/** Una cifra de Torre que no es la de DofusDB: la que ahora gana en la página. */
export type RewardDifference =
  | { field: 'XP' | 'kamas'; torre: number; dofusDb: number }
  | { field: 'objeto'; name: string; torre: number; dofusDb: number }

export interface RewardsDecision {
  fill: RewardFill
  differences: RewardDifference[]
  /** La línea por la que su texto no se lee solo: los valores son los de DofusDB. */
  unreadable?: string
  /** Sus líneas de objeto que no son un objeto de DofusDB de la misión. */
  unmatchedItems: string[]
}

const REWARD_FIELDS = [
  'rewardExperience',
  'rewardExperienceMin',
  'rewardKamas',
  'rewardItems',
  'rewardNotes',
] as const

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return !value.trim()
  return Array.isArray(value) && value.length === 0
}

/**
 * Qué escribir en los campos de recompensa vacíos de una guía: lo de su texto primero, luego
 * lo de DofusDB (summaryToFill, el mismo rellenado que al crear la guía).
 */
export function rewardsToWrite(
  current: RewardFields,
  text: string | null | undefined,
  quest: LinkedQuest | null | undefined,
): RewardsDecision {
  const torre = torreRewards(text, quest)
  const fill: RewardFill = {}
  for (const [field, value] of Object.entries(torre.fields)) {
    if (isEmpty(current[field as keyof RewardFields])) Object.assign(fill, { [field]: value })
  }
  const fromDofusDb = summaryToFill({ ...current, ...fill }, quest)
  for (const field of REWARD_FIELDS) {
    const value = fromDofusDb[field as keyof typeof fromDofusDb]
    if (value !== undefined && fill[field] === undefined) Object.assign(fill, { [field]: value })
  }

  const differences: RewardDifference[] = []
  const given = quest?.rewards
  const { rewardExperience: experience, rewardKamas: kamas } = torre.fields
  if (experience !== undefined && given?.experience && experience !== given.experience) {
    differences.push({ field: 'XP', torre: experience, dofusDb: given.experience })
  }
  if (kamas !== undefined && given?.kamas && kamas !== given.kamas) {
    differences.push({ field: 'kamas', torre: kamas, dofusDb: given.kamas })
  }
  for (const change of torre.quantityChanges) {
    differences.push({ field: 'objeto', name: change.name, torre: change.to, dofusDb: change.from })
  }
  return {
    fill,
    differences,
    ...(torre.unreadable !== undefined && { unreadable: torre.unreadable }),
    unmatchedItems: torre.unmatchedItems,
  }
}

export interface GuideRewardsFill extends RewardsDecision {
  slug: string
  status: 'published' | 'draft'
}

export interface BackfillGuideRewardsResult {
  /** Guías leídas, por su última versión. */
  guides: number
  /** Las que tienen algún campo que llenar. */
  fills: GuideRewardsFill[]
  /** Guías guardadas: publicadas (lo último era lo publicado) y borradores. */
  published: number
  drafts: number
}

export interface BackfillGuideRewardsOptions {
  /** Sin apply solo cuenta: no escribe nada. */
  apply: boolean
  log?: (message: string) => void
}

/**
 * Recorre todas las guías por su última versión, como backfillShownItems: si lo último es lo
 * publicado, guarda publicado; si es un borrador, guarda el borrador y lo publicado sigue
 * igual hasta que Torre lo publique.
 */
export async function backfillGuideRewards(
  payload: Payload,
  options: BackfillGuideRewardsOptions,
): Promise<BackfillGuideRewardsResult> {
  const log = options.log ?? (() => {})
  const result: BackfillGuideRewardsResult = { guides: 0, fills: [], published: 0, drafts: 0 }

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
  // depth 1: los nombres de los objetos de recompensa, para casarlos con los de Torre.
  const quests = questIds.length
    ? await payload.find({
        collection: 'quests',
        where: { id: { in: questIds } },
        pagination: false,
        depth: 1,
        select: { rewards: true },
        populate: { items: { name: true, correction: true } },
        overrideAccess: true,
      })
    : { docs: [] as Quest[] }
  const questById = new Map(quests.docs.map((quest) => [quest.id, quest as LinkedQuest]))

  for (const guide of guides.docs as QuestGuide[]) {
    result.guides += 1
    const quest = questById.get(linkedQuestId(guide.quest) ?? -1) ?? null
    const summary = guide.summary ?? {}
    const decision = rewardsToWrite(summary as RewardFields, summary.rewards, quest)
    if (!Object.keys(decision.fill).length) continue

    const published = guide._status === 'published'
    result.fills.push({ slug: guide.slug, status: published ? 'published' : 'draft', ...decision })
    log(
      `Guía ${guide.slug}${published ? '' : ' (borrador)'}: ${Object.keys(decision.fill).join(', ')}`,
    )
    if (!options.apply) continue
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { summary: decision.fill, _status: published ? 'published' : 'draft' },
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
  }
  return result
}

function differenceText(difference: RewardDifference): string {
  const dofusDb = `(DofusDB ${formatThousands(difference.dofusDb)})`
  if (difference.field === 'objeto') {
    return `${formatThousands(difference.torre)} x ${difference.name} ${dofusDb}`
  }
  return `${difference.field} ${formatThousands(difference.torre)} ${dofusDb}`
}

/** El informe de la carga: qué gana de Torre, qué no se lee y qué no casa, y los totales. */
export function rewardsReport(result: BackfillGuideRewardsResult, apply: boolean): string[] {
  const lines: string[] = []
  const draft = (fill: GuideRewardsFill) => (fill.status === 'draft' ? ' (borrador)' : '')
  for (const fill of result.fills) {
    if (fill.differences.length) {
      lines.push(
        `Gana Torre en ${fill.slug}${draft(fill)}: ${fill.differences.map(differenceText).join('; ')}`,
      )
    }
  }
  for (const fill of result.fills) {
    if (fill.unreadable === undefined) continue
    lines.push(
      `Sin leer en ${fill.slug}${draft(fill)}: «${fill.unreadable}». Van las de DofusDB; ` +
        'revísala a mano.',
    )
  }
  for (const fill of result.fills) {
    for (const line of fill.unmatchedItems) {
      lines.push(
        `Objeto sin casar en ${fill.slug}${draft(fill)}: «${line}». No se inventa; revísalo a mano.`,
      )
    }
  }
  const count = (field: RewardDifference['field']) =>
    result.fills.filter((fill) => fill.differences.some((d) => d.field === field)).length
  const drafts = result.fills.filter((fill) => fill.status === 'draft').length
  lines.push(
    `Guías leídas: ${result.guides}. Con campos por llenar: ${result.fills.length} ` +
      `(publicadas: ${result.fills.length - drafts}, borradores: ${drafts}).`,
    `Guías donde gana una cifra de Torre: ${result.fills.filter((f) => f.differences.length).length} ` +
      `(XP: ${count('XP')}, kamas: ${count('kamas')}, objetos: ${count('objeto')}).`,
    `Textos sin leer: ${result.fills.filter((f) => f.unreadable !== undefined).length}. ` +
      `Líneas de objeto sin casar: ${result.fills.reduce((sum, f) => sum + f.unmatchedItems.length, 0)}.`,
    apply
      ? `Guardadas: publicadas ${result.published} y borradores ${result.drafts}.`
      : 'En seco: sin --apply no se escribe nada.',
  )
  return lines
}
