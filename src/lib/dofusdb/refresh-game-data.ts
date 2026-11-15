// El refresco entero de los datos del juego desde DofusDB, en el orden en que se necesitan:
// objetos, monstruos, mazmorras y misiones; subzonas; logros; PNJ; los metalogros y páginas
// de logro que falten, y las imágenes que pinta alguna guía. Lo corren `pnpm data:refresh`,
// la tarea programada de Railway y el botón del panel (src/lib/game-data/refresh-runs.ts).
// Solo escribe lo que cambia, nunca borra, y escribe sin cuenta: la «Corrección de Torre»
// de cada dato se queda como está (src/collections/torre-correction.ts).
import type { Payload } from 'payload'

import { ensureAchievementPages, type EnsurePagesCounts } from '../achievements/ensure-pages'
import { createDofusDbClient } from './client'
import { fetchQuestData, type QuestData } from './fetch-quest-data'
import { type FetchImage, gameImageTargets, refreshGameImages } from './game-images'
import { refreshAchievements } from './refresh-achievements'
import { refreshNpcs } from './refresh-npcs'
import { DEFAULT_WRITE_CONCURRENCY, refreshQuests, type UpsertCounts } from './refresh-quests'
import { refreshSubAreas } from './refresh-subareas'

/** Las colecciones que escribe el refresco, en su orden. */
export const GAME_DATA_COLLECTIONS = [
  'quests',
  'items',
  'monsters',
  'dungeons',
  'subareas',
  'achievement-categories',
  'achievements',
  'npcs',
] as const
export type GameDataCollection = (typeof GAME_DATA_COLLECTIONS)[number]

export interface GameDataSummary {
  collections: Record<GameDataCollection, UpsertCounts>
  /** Iconos, renders e imágenes: subidos, encontrados ya en Media y que DofusDB no sirvió. */
  images: { imported: number; reused: number; failed: number }
  /** Metalogros y páginas de logro creados «En preparación». */
  newPages: EnsurePagesCounts
  /** Referencias de DofusDB a filas que no existen; se omiten. */
  missing: {
    prerequisites: number
    items: number
    monsters: number
    bosses: number
    quests: number
  }
}

export interface RefreshGameDataOptions {
  /** De dónde salen los datos; por defecto, la API pública de DofusDB. */
  fetchData?: () => Promise<QuestData>
  /** Descarga de iconos, renders e imágenes; por defecto, de DofusDB. */
  fetchImage?: FetchImage
  concurrency?: number
  log?: (message: string) => void
  now?: Date
}

/**
 * Refresca todos los datos del juego y devuelve lo que hizo en cada colección. Lanza si
 * DofusDB no responde, la base falla o demasiadas filas de una colección no se guardan;
 * lo ya guardado se queda y el siguiente refresco sigue desde ahí.
 */
export async function refreshGameData(
  payload: Payload,
  options: RefreshGameDataOptions = {},
): Promise<GameDataSummary> {
  const log = options.log ?? (() => {})
  const concurrency = options.concurrency ?? DEFAULT_WRITE_CONCURRENCY
  const now = options.now ?? new Date()
  const fetchData = options.fetchData ?? (() => fetchQuestData(createDofusDbClient({ log })))
  const write = { concurrency, log, now }

  log('Descargando los datos de DofusDB…')
  const data = await fetchData()

  log('Guardando objetos, monstruos, mazmorras y misiones…')
  const quests = await refreshQuests(payload, data, write)

  log('Guardando las subzonas con su área…')
  const subareas = await refreshSubAreas(
    payload,
    { subAreas: data.subAreas ?? [], areas: data.areas ?? [] },
    write,
  )

  log('Guardando los logros de misiones y eventos e importando sus iconos…')
  const achievements = await refreshAchievements(
    payload,
    { achievements: data.achievements ?? [], categories: data.achievementCategories ?? [] },
    { ...write, fetchImage: options.fetchImage },
  )

  log('Guardando los PNJ e importando sus renders…')
  const npcs = await refreshNpcs(payload, data.npcs, {
    log,
    now,
    fetchRender: options.fetchImage,
  })

  // Después de los PNJ: el representante por defecto de un metalogro es quien da la primera
  // misión. Los que ya existen son de Torre y no se tocan.
  const newPages = await ensureAchievementPages(payload, { log })

  log('Importando los iconos de los objetos y las imágenes de los monstruos…')
  const images = await refreshGameImages(payload, {
    ...(await gameImageTargets(payload)),
    fetchImage: options.fetchImage,
    log,
  })

  return {
    collections: {
      quests: quests.quests,
      items: quests.items,
      monsters: quests.monsters,
      dungeons: quests.dungeons,
      subareas,
      'achievement-categories': achievements.categories,
      achievements: achievements.achievements,
      npcs: npcs.npcs,
    },
    images: {
      imported: achievements.icons.imported + npcs.renders.imported + images.imported,
      reused: achievements.icons.reused + npcs.renders.reused + images.reused,
      failed: achievements.icons.failed + npcs.renders.failed + images.failed,
    },
    newPages,
    missing: {
      prerequisites: quests.missingPrerequisites,
      items: quests.missingItems + achievements.missingItems,
      monsters: quests.missingMonsters,
      bosses: quests.missingBosses,
      quests: achievements.missingQuests,
    },
  }
}

/** Filas que no se pudieron guardar, en todas las colecciones. Una imagen que falta no cuenta. */
export function rowFailures(summary: GameDataSummary): number {
  return GAME_DATA_COLLECTIONS.reduce(
    (total, collection) => total + summary.collections[collection].failed,
    0,
  )
}

// El nombre de cada colección y la terminación que concuerda con él: misiones creadas,
// objetos creados.
const LABELS: Record<GameDataCollection, [string, 'as' | 'os']> = {
  quests: ['Misiones', 'as'],
  items: ['Objetos', 'os'],
  monsters: ['Monstruos', 'os'],
  dungeons: ['Mazmorras', 'as'],
  subareas: ['Subzonas', 'as'],
  'achievement-categories': ['Categorías de logros', 'as'],
  achievements: ['Logros', 'os'],
  npcs: ['PNJ', 'os'],
}

/** El resumen para el registro y el panel: una línea por colección y lo demás al final. */
export function summaryLines(summary: GameDataSummary): string[] {
  const lines = GAME_DATA_COLLECTIONS.map((collection) => {
    const [label, ending] = LABELS[collection]
    const { created, updated, unchanged, failed } = summary.collections[collection]
    return (
      `${label}: ${created} cread${ending}, ${updated} actualizad${ending}, ` +
      `${unchanged} sin cambios, ${failed} fallid${ending}.`
    )
  })
  const { images, newPages, missing } = summary
  lines.push(
    `Imágenes: ${images.imported} importadas, ${images.reused} recuperadas de Media y ` +
      `${images.failed} sin imagen.`,
    `Nuevos en el panel, en preparación: ${newPages.groups} metalogros y ${newPages.pages} ` +
      `páginas de logro.`,
    `Referencias omitidas: ${missing.prerequisites} prerrequisitos, ${missing.items} objetos, ` +
      `${missing.monsters} monstruos, ${missing.quests} misiones y ${missing.bosses} jefes ` +
      `que no existen.`,
  )
  return lines
}
