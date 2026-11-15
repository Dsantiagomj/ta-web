// Las erratas de nombre de objeto en «Recompensas en texto» de Torre («1 x Fragmento de
// Ugahruleta.» por «Ugahlureta»): una línea de objeto que no casa con ningún objeto de
// recompensa de la misión, pero se le parece mucho a uno, con la misma cantidad. Solo se
// cambia el nombre, por el de DofusDB (o el que corrigió Torre en el objeto), y se enlaza su
// fila en los objetos de la guía; el resto del texto queda como lo escribió él. Lo que no es
// una errata clara se queda y se lista con el motivo. Código puro, salvo la carga de abajo;
// lo usa scripts/fix-reward-typos.ts (pnpm guides:reward-typos).
import type { Payload } from 'payload'

import type { Quest, QuestGuide } from '../../payload-types'
import { linkedQuestId } from './autofill'
import { readRewardsText, torreRewards } from './reward-text'
import type { FilledRow, LinkedItem, LinkedQuest, NeedRow } from './summary'

// Tipo 25 de DofusDB: libros. Su título es una obra («La Aurora Púrpura (1.º Parte)…») y
// Torre lo escribe a su manera: no se corrige.
const BOOK_TYPE_ID = 25

/** Una línea corregida: tal cual estaba y como queda, y el objeto que nombra. */
export interface TypoFix {
  before: string
  after: string
  item: number
}

/** Una línea de objeto sin casar que se queda como está, y por qué. */
export type SkippedLine =
  | { line: string; reason: 'book' | 'noMatch' }
  | { line: string; reason: 'quantity'; name: string; dofusDb: number }
  | { line: string; reason: 'ambiguous'; names: string[] }

export interface RewardTypos {
  /** El texto con las erratas corregidas; igual si no hay ninguna. */
  text: string
  fixes: TypoFix[]
  skipped: SkippedLine[]
  /** Los objetos de la guía con las filas que faltaban; sin cambios, nada. */
  rewardItems?: FilledRow[]
}

// Para comparar: sin tildes, mayúsculas ni puntuación final, con el apóstrofo recto.
function comparable(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[\s.,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distancia de edición con trasposiciones de letras vecinas (OSA). */
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2]![j - 2]! + 1)
      }
      rows[i]![j] = best
    }
  }
  return rows[a.length]![b.length]!
}

// Una errata clara: las mismas palabras, cada una con como mucho una letra cambiada por cada
// cinco (dos en «Ugahruleta»; una en «garra», que no es «zarpa»), y dos en total.
const MAX_TOTAL_EDITS = 2

/** Lo lejos que está su nombre del de DofusDB, o Infinity si no es una errata clara. */
function typoDistance(torre: string, dofusDb: string): number {
  const ours = comparable(torre).split(' ')
  const theirs = comparable(dofusDb).split(' ')
  if (ours.length !== theirs.length) return Infinity
  let total = 0
  for (const [index, word] of ours.entries()) {
    const other = theirs[index]!
    const edits = editDistance(word, other)
    if (edits > Math.max(1, Math.floor(Math.max(word.length, other.length) / 5))) return Infinity
    total += edits
  }
  return total <= MAX_TOTAL_EDITS ? total : Infinity
}

type RewardItem = { item: LinkedItem & { id: number }; quantity: number }

function questItems(quest: LinkedQuest | null | undefined): RewardItem[] {
  return (quest?.rewards?.items ?? []).flatMap(({ item, quantity }) =>
    typeof item === 'object' && typeof item.id === 'number'
      ? [{ item: { ...item, id: item.id }, quantity }]
      : [],
  )
}

// «5 x 5 x Honda de jalahondero.»: la cantidad repetida delante del nombre es parte de la errata.
function withoutRepeatedQuantity(name: string, quantity: number): string {
  const repeated = /^(\d+)\s*x\s+(.+)$/i.exec(name)
  return repeated && Number(repeated[1]) === quantity ? repeated[2]! : name
}

const relationId = (item: NeedRow['item']) => (typeof item === 'object' ? item?.id : item)

/**
 * Las erratas de nombre de objeto en su texto de recompensas. Solo mira las líneas de objeto
 * que no casan con un objeto de la misión, como las lista pnpm guides:rewards; un texto que
 * no se lee solo (por niveles) no se toca.
 */
export function rewardTypos(
  text: string | null | undefined,
  quest: LinkedQuest | null | undefined,
  rewardItems: NeedRow[] | null | undefined,
): RewardTypos {
  const original = text ?? ''
  const result: RewardTypos = { text: original, fixes: [], skipped: [] }
  const read = readRewardsText(original)
  if (read.unreadable !== undefined) return result
  const unmatched = new Set(torreRewards(original, quest).unmatchedItems)
  const given = questItems(quest)
  const rows = (rewardItems ?? []).flatMap(({ item, quantity }) => {
    const id = relationId(item)
    return id != null && quantity != null ? [{ item: id, quantity }] : []
  })
  let rowsChanged = false

  for (const line of read.items) {
    if (!unmatched.has(line.line)) continue
    const name = withoutRepeatedQuantity(line.name, line.quantity)
    const scored = given
      .map((reward) => {
        const names = [reward.item.correction?.name, reward.item.name].filter(
          (candidate): candidate is string => Boolean(candidate),
        )
        return { reward, distance: Math.min(...names.map((other) => typoDistance(name, other))) }
      })
      .filter(({ distance }) => distance !== Infinity)
    if (!scored.length) {
      result.skipped.push({ line: line.line, reason: 'noMatch' })
      continue
    }
    const best = Math.min(...scored.map(({ distance }) => distance))
    const closest = scored.filter(({ distance }) => distance === best).map(({ reward }) => reward)
    if (closest.length > 1) {
      const names = closest.map(({ item }) => item.name ?? String(item.id))
      result.skipped.push({ line: line.line, reason: 'ambiguous', names })
      continue
    }
    const { item, quantity } = closest[0]!
    const shownName = item.correction?.name || item.name || ''
    if (item.typeId === BOOK_TYPE_ID) {
      result.skipped.push({ line: line.line, reason: 'book' })
      continue
    }
    if (quantity !== line.quantity) {
      result.skipped.push({
        line: line.line,
        reason: 'quantity',
        name: shownName,
        dofusDb: quantity,
      })
      continue
    }
    const after = line.line.replace(line.name, shownName)
    result.text = result.text.replace(line.line, after)
    result.fixes.push({ before: line.line, after, item: item.id })
    // Vacía, la web enseña los objetos de DofusDB: una fila sola escondería los demás.
    if (rows.length && !rows.some((row) => row.item === item.id)) {
      rows.push({ item: item.id, quantity })
      rowsChanged = true
    }
  }
  if (rowsChanged) result.rewardItems = rows
  return result
}

export interface GuideTypos {
  slug: string
  status: 'published' | 'draft'
  fixes: TypoFix[]
  skipped: SkippedLine[]
}

export interface FixRewardTyposResult {
  /** Guías leídas, por su última versión. */
  guides: number
  /** Las que tienen alguna línea de objeto sin casar. */
  typos: GuideTypos[]
  published: number
  drafts: number
}

/**
 * Recorre todas las guías por su última versión, como pnpm guides:rewards: si lo último es
 * lo publicado, guarda publicado; si es un borrador, el borrador. Sin apply solo cuenta.
 * Repetida, no cambia nada: una línea corregida ya casa.
 */
export async function fixRewardTypos(
  payload: Payload,
  options: { apply: boolean },
): Promise<FixRewardTyposResult> {
  const result: FixRewardTyposResult = { guides: 0, typos: [], published: 0, drafts: 0 }
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
  // depth 1: el nombre, la corrección y el tipo de cada objeto de recompensa.
  const quests = questIds.length
    ? await payload.find({
        collection: 'quests',
        where: { id: { in: questIds } },
        pagination: false,
        depth: 1,
        select: { rewards: true },
        populate: { items: { name: true, correction: true, typeId: true } },
        overrideAccess: true,
      })
    : { docs: [] as Quest[] }
  const questById = new Map(quests.docs.map((quest) => [quest.id, quest as LinkedQuest]))

  for (const guide of guides.docs as QuestGuide[]) {
    result.guides += 1
    const quest = questById.get(linkedQuestId(guide.quest) ?? -1) ?? null
    const summary = guide.summary ?? {}
    const found = rewardTypos(summary.rewards, quest, summary.rewardItems as NeedRow[])
    if (!found.fixes.length && !found.skipped.length) continue
    const published = guide._status === 'published'
    result.typos.push({
      slug: guide.slug,
      status: published ? 'published' : 'draft',
      fixes: found.fixes,
      skipped: found.skipped,
    })
    if (!options.apply || !found.fixes.length) continue
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: {
        summary: {
          rewards: found.text,
          ...(found.rewardItems && { rewardItems: found.rewardItems }),
        },
        _status: published ? 'published' : 'draft',
      },
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
  }
  return result
}

function skippedText(skipped: SkippedLine): string {
  switch (skipped.reason) {
    case 'book':
      return 'es un libro; su título no se corrige.'
    case 'quantity':
      return `se parece a «${skipped.name}», pero DofusDB da ${skipped.dofusDb}.`
    case 'ambiguous':
      return `se parece igual a ${skipped.names.map((name) => `«${name}»`).join(' y ')}.`
    case 'noMatch':
      return 'ningún objeto de la misión se le parece.'
  }
}

/** El informe: cada cambio como «slug: antes → después», lo que se queda y los totales. */
export function rewardTyposReport(result: FixRewardTyposResult, apply: boolean): string[] {
  const draft = (guide: GuideTypos) => (guide.status === 'draft' ? ' (borrador)' : '')
  const fixed = result.typos.filter((guide) => guide.fixes.length)
  const drafts = fixed.filter((guide) => guide.status === 'draft').length
  const fixes = fixed.reduce((sum, guide) => sum + guide.fixes.length, 0)
  const skipped = result.typos.reduce((sum, guide) => sum + guide.skipped.length, 0)
  return [
    ...fixed.flatMap((guide) =>
      guide.fixes.map((fix) => `${guide.slug}${draft(guide)}: ${fix.before} → ${fix.after}`),
    ),
    'Se quedan como están:',
    ...result.typos.flatMap((guide) =>
      guide.skipped.map(
        (line) => `${guide.slug}${draft(guide)}: «${line.line}»: ${skippedText(line)}`,
      ),
    ),
    `Guías leídas: ${result.guides}. Erratas por corregir: ${fixes}, en ${fixed.length} guías ` +
      `(publicadas: ${fixed.length - drafts}, borradores: ${drafts}). Líneas que se quedan: ${skipped}.`,
    apply
      ? `Guardadas: publicadas ${result.published} y borradores ${result.drafts}.`
      : 'En seco: sin --apply no se escribe nada.',
  ]
}
