import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Quest } from '../../payload-types'
import type { QuestData } from './fetch-quest-data'
import { indexLookups, mapQuest } from './map-quest'
import type { MappedQuest } from './types'

export interface RefreshQuestsCounts {
  created: number
  updated: number
  unchanged: number
  /** Referencias a prerrequisitos que no existen en la colección; se omiten. */
  missingPrerequisites: number
}

export interface RefreshQuestsOptions {
  now?: Date
  log?: (message: string) => void
}

type Status = 'created' | 'updated' | 'unchanged'

// Lo que el script escribe en una misión, salvo prerrequisitos y fecha de refresco.
function storedFields(doc: Quest) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    levelMin: doc.levelMin ?? null,
    levelMax: doc.levelMax ?? null,
    categoryId: doc.categoryId ?? null,
    startCriterion: doc.startCriterion ?? null,
    startPositions: (doc.startPositions ?? []).map((position) => ({
      npcId: position.npcId ?? null,
      npcName: position.npcName ?? null,
      mapId: position.mapId ?? null,
      x: position.x ?? null,
      y: position.y ?? null,
    })),
  }
}

function prerequisiteIds(doc: Quest): number[] {
  return (doc.prerequisites ?? []).map((prerequisite) =>
    typeof prerequisite === 'number' ? prerequisite : prerequisite.id,
  )
}

/**
 * Crea o actualiza las misiones por su ID de DofusDB. Es el único que escribe en quests,
 * por eso usa overrideAccess. En dos pasadas: primero las misiones y luego los
 * prerrequisitos, que necesitan los IDs de Payload de todas. Solo escribe lo que cambia,
 * así que repetirlo con los mismos datos no toca nada.
 */
export async function refreshQuests(
  payload: Payload,
  data: QuestData,
  options: RefreshQuestsOptions = {},
): Promise<RefreshQuestsCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const log = options.log ?? (() => {})
  const lookups = indexLookups(data.npcs, data.mapPositions)

  // Por si DofusDB repite una misión entre páginas: cuenta una vez.
  const quests = new Map<number, MappedQuest>()
  for (const raw of data.quests) quests.set(raw.id, mapQuest(raw, lookups))

  const existing = await payload.find({
    collection: 'quests',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))
  const status = new Map<number, Status>()

  let done = 0
  for (const quest of quests.values()) {
    const { prerequisiteDofusIds: _prerequisites, ...fields } = quest
    const doc = byDofusId.get(quest.dofusId)
    if (!doc) {
      const created = await payload.create({
        collection: 'quests',
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      byDofusId.set(quest.dofusId, created)
      status.set(quest.dofusId, 'created')
    } else if (!isDeepStrictEqual(storedFields(doc), fields)) {
      const updated = await payload.update({
        collection: 'quests',
        id: doc.id,
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      byDofusId.set(quest.dofusId, updated)
      status.set(quest.dofusId, 'updated')
    } else {
      status.set(quest.dofusId, 'unchanged')
    }
    done += 1
    if (done % 250 === 0) log(`Misiones guardadas: ${done} de ${quests.size}`)
  }

  let missingPrerequisites = 0
  for (const quest of quests.values()) {
    const ids: number[] = []
    for (const dofusId of quest.prerequisiteDofusIds) {
      const target = byDofusId.get(dofusId)
      if (target) ids.push(target.id)
      else missingPrerequisites += 1
    }
    const doc = byDofusId.get(quest.dofusId)!
    if (isDeepStrictEqual(prerequisiteIds(doc), ids)) continue

    await payload.update({
      collection: 'quests',
      id: doc.id,
      data: { prerequisites: ids, refreshedAt },
      depth: 0,
      overrideAccess: true,
    })
    if (status.get(quest.dofusId) === 'unchanged') status.set(quest.dofusId, 'updated')
  }

  const counts = { created: 0, updated: 0, unchanged: 0, missingPrerequisites }
  for (const value of status.values()) counts[value] += 1
  return counts
}
