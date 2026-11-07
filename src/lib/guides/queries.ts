// Consultas de la página pública de la guía, por la API local y siempre con los permisos
// de quien mira (AGENTS.md, Payload rules): un visitante solo recibe lo publicado.

import type { Payload } from 'payload'

import type { Npc, Quest, QuestGuide, User } from '@/payload-types'

import type { QuestGuideLink } from './page'
import { isGuideSlug } from './slug'

// La guía, su misión (1), lo que cuelga de la misión: objetos y misiones previas (2), y los
// iconos de esos objetos (3). Los monstruos de los combates (1) traen su imagen (2).
const GUIDE_DEPTH = 3

export interface FindGuideOptions {
  /**
   * Vista previa desde el panel: el último borrador, con los permisos del usuario. Sin
   * usuario no hay borradores: el permiso de lectura solo deja ver lo publicado.
   */
  preview?: { user: User | null }
}

/** La guía de un slug, o null si no existe, no se puede ver o el slug no es de guía. */
export async function findGuideBySlug(
  payload: Payload,
  slug: string,
  { preview }: FindGuideOptions = {},
): Promise<QuestGuide | null> {
  if (!isGuideSlug(slug)) return null
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { slug: { equals: slug } },
    depth: GUIDE_DEPTH,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    ...(preview ? { draft: true, user: preview.user } : { draft: false }),
  })
  return docs[0] ?? null
}

/** Las guías publicadas de estas misiones, para enlazar los prerrequisitos. */
export async function findPublishedGuideLinks(
  payload: Payload,
  questIds: number[],
): Promise<QuestGuideLink[]> {
  if (questIds.length === 0) return []
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { quest: { in: questIds } },
    depth: 0,
    select: { slug: true, quest: true },
    pagination: false,
    overrideAccess: false,
  })
  return docs.flatMap((doc) =>
    typeof doc.quest === 'number' ? [{ questId: doc.quest, slug: doc.slug }] : [],
  )
}

/** La misión siguiente del logro y su guía publicada (o null si no tiene). */
export interface NextQuest {
  quest: Quest
  guide: QuestGuide | null
}

/**
 * La misión de la posición siguiente en el mismo logro (el orden de DofusDB, guardado en
 * cada misión) y su guía publicada, con las imágenes del cuerpo pobladas (depth 1). Sin
 * logro o sin misión siguiente, null.
 */
export async function findNextQuest(
  payload: Payload,
  achievement: { dofusId?: number | null; position?: number | null } | null | undefined,
): Promise<NextQuest | null> {
  if (achievement?.dofusId == null || achievement.position == null) return null
  const { docs } = await payload.find({
    collection: 'quests',
    where: {
      'achievement.dofusId': { equals: achievement.dofusId },
      'achievement.position': { equals: achievement.position + 1 },
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: false,
  })
  const quest = docs[0]
  if (!quest) return null
  const guides = await payload.find({
    collection: 'quest-guides',
    where: { quest: { equals: quest.id } },
    depth: 1,
    limit: 1,
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  return { quest, guide: guides.docs[0] ?? null }
}

/**
 * El PNJ que da la misión, por su ID de DofusDB, con sus renders poblados (depth 1). Son
 * datos públicos del juego; aun así, con los permisos de quien mira.
 */
export async function findQuestGiver(
  payload: Payload,
  npcDofusId: number | null | undefined,
): Promise<Npc | null> {
  if (npcDofusId == null) return null
  const { docs } = await payload.find({
    collection: 'npcs',
    where: { dofusId: { equals: npcDofusId } },
    depth: 1,
    limit: 1,
    pagination: false,
    overrideAccess: false,
  })
  return docs[0] ?? null
}
