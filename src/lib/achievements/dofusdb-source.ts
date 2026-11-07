// Lo que DofusDB da para una página de logro o un metalogro, leído de las colecciones del
// juego. Lo usan los hooks de relleno y el endpoint de las notas del panel, así que las dos
// cosas dicen siempre lo mismo.

import type { Payload, PayloadRequest } from 'payload'

import type { Achievement, Item, Npc, Quest } from '../../payload-types'
import type { AchievementValues, GroupValues, PolyRef, Ref } from './dofusdb-values'
import { groupSection } from './dofusdb-values'

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

/** El metalogro de una categoría de DofusDB, si ya existe. */
async function groupOfCategory(
  payload: Payload,
  categoryId: number | null,
  req?: PayloadRequest,
): Promise<Ref | null> {
  if (categoryId === null) return null
  const { docs } = await payload.find({
    collection: 'achievement-groups',
    where: { category: { equals: categoryId } },
    select: { name: true },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  return docs[0] ? { id: docs[0].id, name: docs[0].name } : null
}

/** Lo que DofusDB da para una página de logro; null si el logro no existe. */
export async function achievementValues(
  payload: Payload,
  achievementId: number,
  req?: PayloadRequest,
): Promise<AchievementValues | null> {
  const achievement = (await payload.findByID({
    collection: 'achievements',
    id: achievementId,
    // depth 1: los nombres de las misiones y de los objetos
    depth: 1,
    disableErrors: true,
    overrideAccess: true,
    req,
  })) as Achievement | null
  if (!achievement) return null
  const ref = (doc: Quest | Item | number) =>
    typeof doc === 'object' ? [{ id: doc.id, name: doc.name }] : []
  return {
    name: achievement.name,
    group: await groupOfCategory(payload, relationId(achievement.category), req),
    order: achievement.order ?? null,
    points: achievement.points ?? null,
    experience: achievement.rewards?.experience ?? null,
    kamas: achievement.rewards?.kamas ?? null,
    items: (achievement.rewards?.items ?? []).flatMap(({ item, quantity }) =>
      ref(item).map((found) => ({ item: found, quantity })),
    ),
    quests: (achievement.quests ?? []).map((row) => ({
      name: row.name ?? null,
      quests: (row.quests ?? []).flatMap(ref),
    })),
  }
}

/**
 * Quien da la primera misión del primer logro con misiones de la categoría, en el orden
 * del juego: el PNJ que el índice pinta en la tarjeta mientras Torre no elija otro.
 */
async function firstQuestGiver(
  payload: Payload,
  categoryId: number,
  req?: PayloadRequest,
): Promise<PolyRef | null> {
  const { docs } = await payload.find({
    collection: 'achievements',
    where: { category: { equals: categoryId } },
    sort: ['order', 'dofusId'],
    // Sin select: con él, Payload no trae las relaciones de dentro del array.
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const questId = docs
    .flatMap((doc) => doc.quests ?? [])
    .flatMap((row) => row.quests ?? [])
    .map(relationId)
    .find((id) => id !== null)
  if (questId == null) return null
  const quest = (await payload.findByID({
    collection: 'quests',
    id: questId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
  })) as Quest | null
  const npcId = quest?.startPositions?.find((position) => position.npcId != null)?.npcId
  if (npcId == null) return null
  const npcs = await payload.find({
    collection: 'npcs',
    where: { dofusId: { equals: npcId } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const npc = npcs.docs[0] as Npc | undefined
  return npc ? { relationTo: 'npcs', id: npc.id, name: npc.name } : null
}

/** Lo que DofusDB da para un metalogro; null si la categoría no existe. */
export async function groupValues(
  payload: Payload,
  categoryId: number,
  req?: PayloadRequest,
): Promise<GroupValues | null> {
  const category = await payload.findByID({
    collection: 'achievement-categories',
    id: categoryId,
    depth: 1,
    disableErrors: true,
    overrideAccess: true,
    req,
  })
  if (!category) return null
  const parent = typeof category.parent === 'object' ? category.parent : null
  // La raíz, subiendo por las madres (Misiones o Eventos): decide si es de temporada.
  let root = parent
  for (let depth = 0; root && root.parent != null && depth < 10; depth += 1) {
    root = await payload.findByID({
      collection: 'achievement-categories',
      id: relationId(root.parent as number | { id: number })!,
      depth: 0,
      disableErrors: true,
      overrideAccess: true,
      req,
    })
  }
  return {
    name: category.name,
    order: category.order ?? null,
    section: groupSection({
      order: category.order,
      parentDofusId: parent?.dofusId ?? null,
      rootDofusId: root?.dofusId ?? null,
    }),
    representative: await firstQuestGiver(payload, category.id, req),
  }
}
