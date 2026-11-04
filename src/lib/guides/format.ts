// Textos del resumen en el formato de las guías de Torre: una línea por dato, con punto
// final y los miles separados por un espacio.

import { guideStrings } from './strings'
import type { LinkedItem, LinkedNeeds, LinkedQuest, LinkedRewards, NamedDoc } from './summary'

const text = guideStrings.summary

// Tipos de objeto del supertipo 14 de DofusDB, «Objetos de misión» (api.dofusdb.fr/item-types).
// El juego los da durante la misión: no son algo que haya que llevar.
const QUEST_ITEM_TYPE_IDS = new Set([
  24, 126, 127, 128, 129, 131, 132, 133, 136, 137, 139, 140, 141, 142, 143, 144, 146, 147, 148, 149,
  150, 155, 156, 168, 171, 198, 201, 202, 205, 213, 215, 220, 225, 242, 253, 254, 260, 268, 272,
  287, 289, 305, 307, 308, 325, 334, 338,
])

/** Separa los miles con un espacio normal, como escribe Torre: 24 316. */
export function formatThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

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

/**
 * Una sugerencia de lo que hay que llevar: objetos (sin los de misión), monstruos y si hay
 * que caminar mapas. Lo que escribe Torre aquí suele ser editorial, como «Literalmente nada».
 */
export function needsText(needs: LinkedNeeds | null | undefined): string | null {
  if (!needs) return null
  const items = (needs.items ?? []).flatMap(({ item, quantity }) => {
    const doc = populated<LinkedItem>(item)
    if (!doc || (doc.typeId != null && QUEST_ITEM_TYPE_IDS.has(doc.typeId))) return []
    return [quantityLine(quantity, doc)]
  })
  return lines([
    ...items,
    ...(needs.monsters ?? []).map(({ monster, quantity }) =>
      quantityLine(quantity, populated(monster)),
    ),
    needs.walksMaps ? text.walksMaps : null,
  ])
}

/** El nivel mínimo para empezar, del criterio PL>N de DofusDB (nivel mayor que N). */
export function requiredLevel(startCriterion: string | null | undefined): number | null {
  const match = startCriterion?.match(/PL>(\d+)/)
  return match ? Number(match[1]) + 1 : null
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
