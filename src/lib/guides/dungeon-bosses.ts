// La imagen del jefe de la mazmorra que nombra cada nota de Necesitarás: la leen la página de
// logro («Necesitarás en total»), su informe de mazmorras (`pnpm data:quests`) y la guía de
// Dofus (DESIGN.md, Achievement page components y Dofus guides components). Casa con
// dungeonChooser (dungeons.ts) y trae solo las imágenes de los jefes casados.

import type { Payload } from 'payload'

import { corrected, hiddenByTorre } from '@/lib/game-data/correction'
import type { Media } from '@/payload-types'

import { dungeonChooser, noteMatch, type NoteMatch } from './dungeons'
import { needKey } from './need-notes'

/** Cómo casó una nota de mazmorra, y la imagen de su jefe si la tiene en Media. */
export interface NoteDungeon {
  match: NoteMatch
  image?: Media
}

export interface DungeonOptions {
  /** Los permisos de un visitante (por defecto), o todos para un script. */
  overrideAccess?: boolean
  /**
   * Las mazmorras elegidas a mano en las guías de misión, por la clave de la nota
   * (dungeonPicks, src/lib/achievements/page.ts).
   */
  picks?: Map<string, number>
}

/**
 * La imagen del jefe de la mazmorra que nombra cada nota, por la clave de la nota (needKey).
 * labels son las notas que la página pinta como mazmorra, sin cantidad: quien llama decide
 * cuáles son (una página de logro, las que dicen «mazmorra»; una guía de Dofus, además las
 * de su grupo Mazmorras). La mazmorra es la que Torre eligió a mano para esa nota y, si no eligió
 * ninguna, la que casa con el nombre de la nota (dungeonChooser), sin imágenes; luego trae
 * solo los jefes de esas mazmorras, y de cada una se queda con el primero que tiene imagen.
 * Una nota sin mazmorra, o cuya mazmorra no tiene jefe con imagen, no está: la página le
 * pone el icono genérico.
 */
export async function readDungeonBosses(
  payload: Payload,
  labels: string[],
  options: DungeonOptions = {},
): Promise<Map<string, Media>> {
  const notes = await chooseDungeonBosses(payload, labels, options)
  return new Map([...notes].flatMap(([key, { image }]) => (image ? [[key, image]] : [])))
}

/**
 * Como readDungeonBosses, para todas las notas que le pasan: cómo casó cada una (a mano, por
 * nombre, por jefe o nada, con las candidatas si dudó) y la imagen del jefe si la tiene: la
 * del jefe por el que casó, y si no tiene, la del primero de la mazmorra que la tenga.
 */
export async function chooseDungeonBosses(
  payload: Payload,
  labels: string[],
  { overrideAccess = false, picks = new Map() }: DungeonOptions = {},
): Promise<Map<string, NoteDungeon>> {
  const result = new Map<string, NoteDungeon>()
  const notes = [...new Set(labels)]
  if (notes.length === 0) return result
  // Con lo que Torre corrigió: el nombre (casa con sus notas), su imagen y lo que ocultó.
  const dungeonImages = new Map<number, Media>()
  const dungeons = (
    await payload.find({
      collection: 'dungeons',
      select: { name: true, bosses: true, correction: true },
      populate: { monsters: { name: true, correction: true } },
      depth: 1,
      pagination: false,
      overrideAccess,
    })
  ).docs.flatMap((raw) => {
    if (hiddenByTorre(raw)) return []
    const doc = corrected(raw)
    const image = doc.correction?.image
    if (image && typeof image === 'object') dungeonImages.set(doc.id, image)
    const list = (doc.bosses ?? []).flatMap((boss) =>
      typeof boss === 'object' && !hiddenByTorre(boss) ? [corrected(boss)] : [],
    )
    return [
      {
        id: doc.id,
        name: doc.name,
        bosses: list.flatMap((boss) => boss.name ?? []),
        bossList: list.map((boss) => ({ id: boss.id, name: boss.name ?? null })),
      },
    ]
  })
  const choose = dungeonChooser(dungeons, (label) => picks.get(needKey(label)))
  const chosen = new Map<string, number[]>()
  for (const label of notes) {
    const choice = choose(label)
    result.set(needKey(label), { match: noteMatch(choice) })
    if (!choice.dungeon) continue
    // La imagen que Torre subió para la mazmorra gana a la de sus jefes.
    const own = dungeonImages.get(choice.dungeon.id)
    if (own) {
      result.set(needKey(label), { ...result.get(needKey(label))!, image: own })
      continue
    }
    // Si casó por un jefe concreto, su imagen va primero; detrás, los demás en su orden.
    const { bossList } = choice.dungeon
    const boss = 'boss' in choice ? choice.boss : undefined
    const named = bossList.filter((entry) => boss !== undefined && entry.name === boss)
    const ids = [...named, ...bossList.filter((entry) => !named.includes(entry))]
    chosen.set(
      needKey(label),
      ids.map((entry) => entry.id),
    )
  }
  const ids = [...new Set([...chosen.values()].flat())]
  if (ids.length === 0) return result
  const { docs } = await payload.find({
    collection: 'monsters',
    where: {
      id: { in: ids },
      or: [{ image: { exists: true } }, { 'correction.image': { exists: true } }],
    },
    select: { image: true, correction: true },
    depth: 1,
    pagination: false,
    overrideAccess,
  })
  const images = new Map(
    docs.flatMap((raw) => {
      const doc = corrected(raw)
      return typeof doc.image === 'object' && doc.image ? [[doc.id, doc.image]] : []
    }),
  )
  for (const [key, bossIds] of chosen) {
    const image = bossIds.map((id) => images.get(id)).find(Boolean)
    if (image) result.set(key, { ...result.get(key)!, image })
  }
  return result
}
