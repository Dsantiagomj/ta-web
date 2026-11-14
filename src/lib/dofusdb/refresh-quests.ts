import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Dungeon, Item, Monster, Quest } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import type { QuestData } from './fetch-quest-data'
import { mapDungeon, mapItem, mapMonster } from './map-items-monsters'
import { indexLookups, mapQuest } from './map-quest'
import type {
  MappedDungeon,
  MappedItem,
  MappedMonster,
  MappedQuest,
  MappedQuestStage,
  QuantityByDofusId,
  QuestAchievement,
} from './types'

export interface UpsertCounts {
  created: number
  updated: number
  unchanged: number
}

export interface RefreshQuestsCounts {
  quests: UpsertCounts
  items: UpsertCounts
  monsters: UpsertCounts
  /** Las mazmorras, con sus jefes enlazados a monsters. */
  dungeons: UpsertCounts
  /** Referencias a prerrequisitos que no existen en la colección; se omiten. */
  missingPrerequisites: number
  /** Referencias a objetos y monstruos que DofusDB no devolvió ni están guardados; se omiten. */
  missingItems: number
  missingMonsters: number
  /** Jefes de mazmorra que no están en monsters; se omiten. */
  missingBosses: number
}

/**
 * Escrituras a la vez. Cada una ocupa una conexión del pool de Postgres (10 por defecto
 * en pg), así que queda por debajo para dejar sitio a las lecturas.
 */
export const DEFAULT_WRITE_CONCURRENCY = 8

/** DOFUSDB_WRITE_CONCURRENCY de `pnpm data:quests`; vacía, el valor por defecto. */
export function writeConcurrencyFromEnv(env: Record<string, string | undefined>): number {
  const raw = env.DOFUSDB_WRITE_CONCURRENCY?.trim()
  if (!raw) return DEFAULT_WRITE_CONCURRENCY
  // Un valor mal escrito falla en vez de caer en silencio al valor por defecto.
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new Error(`DOFUSDB_WRITE_CONCURRENCY debe ser un entero mayor que 0, no "${raw}"`)
  }
  return Number(raw)
}

export interface RefreshQuestsOptions {
  now?: Date
  log?: (message: string) => void
  /** Escrituras en marcha a la vez; por defecto DEFAULT_WRITE_CONCURRENCY. */
  concurrency?: number
}

type Status = keyof UpsertCounts

function countStatuses(statuses: Iterable<Status>): UpsertCounts {
  const counts = { created: 0, updated: 0, unchanged: 0 }
  for (const status of statuses) counts[status] += 1
  return counts
}

function relationId(value: number | { id: number }): number
function relationId(value: number | { id: number } | null | undefined): number | null
function relationId(value: number | { id: number } | null | undefined): number | null {
  // Una fila cuyo objeto se borró a mano queda en null; cuenta como un cambio.
  if (value == null) return null
  return typeof value === 'number' ? value : value.id
}

// Lo que el script escribe en un objeto o un monstruo, salvo la fecha de refresco.
function storedItem(doc: Item) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    level: doc.level ?? null,
    typeId: doc.typeId ?? null,
    superTypeId: doc.superTypeId ?? null,
    iconId: doc.iconId ?? null,
  }
}

function storedMonster(doc: Monster) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    iconId: doc.iconId ?? null,
    levels: doc.levels ?? [],
    boss: doc.boss ?? false,
    archmonster: doc.archmonster ?? false,
    subAreaId: doc.subAreaId ?? null,
  }
}

// Solo para el progreso: el catálogo de objetos pasa de 20.000 filas.
const CATALOG_LABEL = {
  items: 'Objetos',
  monsters: 'Monstruos',
  subareas: 'Subzonas',
  dungeons: 'Mazmorras',
} as const

function storedDungeon(doc: Dungeon) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    bosses: (doc.bosses ?? []).map((boss) => relationId(boss)),
    level: doc.level ?? null,
  }
}

/**
 * Crea o actualiza las filas de un catálogo del juego por su ID de DofusDB, solo si cambian.
 * Devuelve el ID de Payload de cada ID de DofusDB guardado, también de las filas de
 * pasadas anteriores que DofusDB ya no devuelve: nada se borra.
 */
export async function refreshCatalog<
  T extends { dofusId: number },
  D extends { id: number; dofusId: number },
>(
  payload: Payload,
  collection: keyof typeof CATALOG_LABEL,
  rows: T[],
  stored: (doc: D) => T,
  refreshedAt: string,
  concurrency: number,
  log: (message: string) => void,
): Promise<{ counts: UpsertCounts; ids: Map<number, number> }> {
  const existing = await payload.find({
    collection,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc as unknown as D]))
  // Por si DofusDB repite una fila: cuenta una vez.
  const unique = new Map(rows.map((row) => [row.dofusId, row]))

  // Payload no estrecha el tipo de data con una unión de colecciones; las filas ya tienen
  // la forma de la colección que toca.
  const save = async (row: T): Promise<{ dofusId: number; id: number; status: Status }> => {
    const doc = byDofusId.get(row.dofusId)
    const data = { ...row, refreshedAt } as never
    if (!doc) {
      const created = await payload.create({ collection, data, depth: 0, overrideAccess: true })
      return { dofusId: row.dofusId, id: created.id, status: 'created' }
    }
    if (!isDeepStrictEqual(stored(doc), row)) {
      await payload.update({ collection, id: doc.id, data, depth: 0, overrideAccess: true })
      return { dofusId: row.dofusId, id: doc.id, status: 'updated' }
    }
    return { dofusId: row.dofusId, id: doc.id, status: 'unchanged' }
  }

  const label = CATALOG_LABEL[collection]
  let done = 0
  const results = await mapWithConcurrency([...unique.values()], concurrency, async (row) => {
    const result = await save(row)
    done += 1
    if (done % 2000 === 0) log(`${label} guardados: ${done} de ${unique.size}`)
    return result
  })

  const ids = new Map([...byDofusId].map(([dofusId, doc]) => [dofusId, doc.id]))
  for (const { dofusId, id } of results) ids.set(dofusId, id)
  return { counts: countStatuses(results.map((result) => result.status)), ids }
}

/** El grupo achievement de la colección: sin logro, todos sus campos vacíos. */
function achievementGroup(achievement: QuestAchievement | null) {
  return {
    dofusId: achievement?.dofusId ?? null,
    name: achievement?.name ?? null,
    slug: achievement?.slug ?? null,
    position: achievement?.position ?? null,
    total: achievement?.total ?? null,
  }
}

// Lo que el script escribe en una misión, salvo prerrequisitos y fecha de refresco.
function storedFields(doc: Quest) {
  const rows = <K extends 'item' | 'monster'>(
    list: ({ quantity: number } & Record<K, number | { id: number } | null>)[] | null | undefined,
    key: K,
  ) => (list ?? []).map((row) => ({ [key]: relationId(row[key]), quantity: row.quantity }))
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
    zone: doc.zone ?? null,
    achievement: achievementGroup(
      doc.achievement?.dofusId != null
        ? {
            dofusId: doc.achievement.dofusId,
            name: doc.achievement.name ?? '',
            slug: doc.achievement.slug ?? '',
            position: doc.achievement.position ?? 0,
            total: doc.achievement.total ?? 0,
          }
        : null,
    ),
    rewards: {
      experience: doc.rewards?.experience ?? null,
      experienceMin: doc.rewards?.experienceMin ?? null,
      kamas: doc.rewards?.kamas ?? null,
      items: rows(doc.rewards?.items, 'item'),
      emoteIds: doc.rewards?.emoteIds ?? [],
      spellIds: doc.rewards?.spellIds ?? [],
      titleIds: doc.rewards?.titleIds ?? [],
      jobIds: doc.rewards?.jobIds ?? [],
    },
    needs: {
      items: rows(doc.needs?.items, 'item'),
      monsters: rows(doc.needs?.monsters, 'monster'),
      walksMaps: doc.needs?.walksMaps ?? false,
    },
    stages: storedStages(doc.stages),
  }
}

// Las etapas guardadas sin los IDs de fila de Payload, en la forma de questStages.
function storedStages(stages: Quest['stages']): MappedQuestStage[] {
  return (stages ?? []).map((stage) => ({
    dofusId: stage.dofusId,
    name: stage.name ?? null,
    objectives: (stage.objectives ?? []).map((objective) => ({
      dofusId: objective.dofusId,
      kind: objective.kind,
      text: objective.text ?? null,
      npcId: objective.npcId ?? null,
      monsterId: objective.monsterId ?? null,
      itemId: objective.itemId ?? null,
      quantity: objective.quantity ?? null,
      mapId: objective.mapId ?? null,
      x: objective.x ?? null,
      y: objective.y ?? null,
      subAreaId: objective.subAreaId ?? null,
    })),
  }))
}

function prerequisiteIds(doc: Quest): number[] {
  return (doc.prerequisites ?? []).map((prerequisite) => relationId(prerequisite))
}

/** Cambia los IDs de DofusDB por los de Payload; los que no están se omiten y se cuentan. */
function linkRows<K extends 'item' | 'monster'>(
  list: QuantityByDofusId[],
  key: K,
  ids: Map<number, number>,
) {
  const rows: (Record<K, number> & { quantity: number })[] = []
  let missing = 0
  for (const { dofusId, quantity } of list) {
    const id = ids.get(dofusId)
    if (id === undefined) missing += 1
    else rows.push({ [key]: id, quantity } as Record<K, number> & { quantity: number })
  }
  return { rows, missing }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/**
 * Crea o actualiza objetos, monstruos y misiones por su ID de DofusDB. Es el único que
 * escribe en esas colecciones, por eso usa overrideAccess. Primero objetos, monstruos y
 * mazmorras (sus jefes son monstruos),
 * porque las recompensas y requisitos de las misiones apuntan a sus IDs de Payload; luego
 * las misiones, y al final los prerrequisitos, que necesitan los IDs de todas. Solo escribe
 * lo que cambia, así que repetirlo con los mismos datos no toca nada. Dentro de cada paso
 * escribe varias filas a la vez: cada escritura son varias idas y vueltas a la base, y
 * una a una tardaban media hora contra Neon.
 */
export async function refreshQuests(
  payload: Payload,
  data: QuestData,
  options: RefreshQuestsOptions = {},
): Promise<RefreshQuestsCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const log = options.log ?? (() => {})
  const concurrency = options.concurrency ?? DEFAULT_WRITE_CONCURRENCY
  const lookups = indexLookups(data.npcs, data.mapPositions, data)

  const items = await refreshCatalog<MappedItem, Item>(
    payload,
    'items',
    data.items.map(mapItem),
    storedItem,
    refreshedAt,
    concurrency,
    log,
  )
  log(`Objetos guardados: ${items.ids.size}`)
  const monsters = await refreshCatalog<MappedMonster, Monster>(
    payload,
    'monsters',
    data.monsters.map(mapMonster),
    storedMonster,
    refreshedAt,
    concurrency,
    log,
  )
  log(`Monstruos guardados: ${monsters.ids.size}`)

  // Las mazmorras, con sus jefes por el ID de Payload de los monstruos recién guardados.
  let missingBosses = 0
  const dungeons = await refreshCatalog<MappedDungeon, Dungeon>(
    payload,
    'dungeons',
    (data.dungeons ?? []).map((raw) => {
      const mapped = mapDungeon(raw, monsters.ids)
      missingBosses += mapped.missingBosses
      return mapped.dungeon
    }),
    storedDungeon,
    refreshedAt,
    concurrency,
    log,
  )

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

  // Solo para el progreso: los totales salen de lo que devuelve cada escritura.
  let done = 0
  const saved = await mapWithConcurrency([...quests.values()], concurrency, async (quest) => {
    const { prerequisiteDofusIds: _prerequisites, rewards, needs, achievement, ...rest } = quest
    const rewardItems = linkRows(rewards.items, 'item', items.ids)
    const needItems = linkRows(needs.items, 'item', items.ids)
    const needMonsters = linkRows(needs.monsters, 'monster', monsters.ids)
    const fields = {
      ...rest,
      achievement: achievementGroup(achievement),
      rewards: { ...rewards, items: rewardItems.rows },
      needs: { items: needItems.rows, monsters: needMonsters.rows, walksMaps: needs.walksMaps },
    }
    const doc = byDofusId.get(quest.dofusId)
    let result: { doc: Quest; status: Status }
    if (!doc) {
      const created = await payload.create({
        collection: 'quests',
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      result = { doc: created, status: 'created' }
    } else if (!isDeepStrictEqual(storedFields(doc), fields)) {
      const updated = await payload.update({
        collection: 'quests',
        id: doc.id,
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      result = { doc: updated, status: 'updated' }
    } else {
      result = { doc, status: 'unchanged' }
    }
    done += 1
    if (done % 250 === 0) log(`Misiones guardadas: ${done} de ${quests.size}`)
    return {
      ...result,
      quest,
      missingItems: rewardItems.missing + needItems.missing,
      missingMonsters: needMonsters.missing,
    }
  })
  for (const { doc } of saved) byDofusId.set(doc.dofusId, doc)

  // Los prerrequisitos van después de crear todas las misiones: apuntan a sus IDs.
  const linked = await mapWithConcurrency(saved, concurrency, async ({ quest, doc, status }) => {
    const ids: number[] = []
    let missing = 0
    for (const dofusId of quest.prerequisiteDofusIds) {
      const target = byDofusId.get(dofusId)
      if (target) ids.push(target.id)
      else missing += 1
    }
    if (isDeepStrictEqual(prerequisiteIds(doc), ids)) return { status, missing }

    await payload.update({
      collection: 'quests',
      id: doc.id,
      data: { prerequisites: ids, refreshedAt },
      depth: 0,
      overrideAccess: true,
    })
    return { status: status === 'unchanged' ? ('updated' as const) : status, missing }
  })

  return {
    quests: countStatuses(linked.map((result) => result.status)),
    items: items.counts,
    monsters: monsters.counts,
    dungeons: dungeons.counts,
    missingPrerequisites: sum(linked.map((result) => result.missing)),
    missingItems: sum(saved.map((result) => result.missingItems)),
    missingMonsters: sum(saved.map((result) => result.missingMonsters)),
    missingBosses,
  }
}
