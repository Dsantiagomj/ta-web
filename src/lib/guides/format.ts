// Textos del resumen en el formato de las guías de Torre: una línea por dato, con punto
// final y los miles separados por un espacio.

import { requiredTerms } from '../dofusdb/criterion'

import { formatThousands } from './display'
import { guideStrings } from './strings'
import type { LinkedItem, LinkedNeeds, LinkedQuest, LinkedRewards, NamedDoc } from './summary'

// Vive en display.ts, sin dependencias, para que la isla de las guías no arrastre este módulo.
export { formatThousands }

const text = guideStrings.summary

// Supertipo 14 de DofusDB, «Objetos de misión»: el juego los da durante la misión, no
// son algo que haya que llevar.
const QUEST_ITEM_SUPER_TYPE_ID = 14

function lines(entries: (string | null)[]): string | null {
  const present = entries.filter((entry): entry is string => Boolean(entry))
  return present.length ? present.map(text.line).join('\n') : null
}

// Una relación sin poblar no tiene nombre: se salta en vez de mostrar un ID.
function populated<T extends NamedDoc>(relation: number | T): T | null {
  return typeof relation === 'object' && relation.name ? relation : null
}

function quantityLine(quantity: number, doc: NamedDoc | null): string | null {
  return doc?.name ? text.quantity(quantity, doc.name) : null
}

/** Experiencia, kamas y objetos. Torre lista los objetos al revés que DofusDB. */
export function rewardsText(rewards: LinkedRewards | null | undefined): string | null {
  if (!rewards) return null
  const items = [...(rewards.items ?? [])].reverse()
  return lines([
    rewards.experience ? text.experience(formatThousands(rewards.experience)) : null,
    rewards.kamas ? text.kamas(formatThousands(rewards.kamas)) : null,
    ...items.map(({ item, quantity }) => quantityLine(quantity, populated(item))),
  ])
}

/** Un objeto que pide la misión, poblado, con su cantidad. */
export interface NeededItem {
  item: LinkedItem & { id: number }
  quantity: number
}

/**
 * Los objetos que pide la misión, en el orden de DofusDB, sin los de misión: esos los da
 * el propio juego. Los monstruos y los mapas no caben en la lista de objetos.
 */
export function neededItems(needs: LinkedNeeds | null | undefined): NeededItem[] {
  return (needs?.items ?? []).flatMap(({ item, quantity }) => {
    const doc = populated<LinkedItem>(item)
    if (typeof doc?.id !== 'number') return []
    if (doc.superTypeId === QUEST_ITEM_SUPER_TYPE_ID) return []
    return [{ item: { ...doc, id: doc.id }, quantity }]
  })
}

/** Una línea por objeto, «2 x Nombre.», para mostrar la lista en una nota. */
export function itemsText(needed: NeededItem[]): string | null {
  return lines(needed.map(({ item, quantity }) => quantityLine(quantity, item)))
}

/**
 * El nivel mínimo para empezar, del criterio PL>N de DofusDB (nivel mayor que N). Solo
 * si se exige siempre: un PL> entre alternativas con | no es obligatorio.
 */
export function requiredLevel(startCriterion: string | null | undefined): number | null {
  for (const term of requiredTerms(startCriterion)) {
    const match = /^PL>(\d+)$/.exec(term)
    if (match) return Number(match[1]) + 1
  }
  return null
}

/** El nivel mínimo, si lo hay, y las misiones que hay que terminar antes. */
export function prerequisitesText(
  quest: Pick<LinkedQuest, 'startCriterion' | 'prerequisites'>,
): string | null {
  const level = requiredLevel(quest.startCriterion)
  return lines([
    level ? text.requiredLevel(level) : null,
    ...(quest.prerequisites ?? []).map((prerequisite) => populated(prerequisite)?.name ?? null),
  ])
}
