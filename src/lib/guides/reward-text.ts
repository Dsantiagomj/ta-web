// Las recompensas que Torre escribió en su texto («2 625 000 XP.», «43 980 kamas.», «10 x
// Perla de las profundidades.»), leídas para los campos de la guía. Solo se lee lo que no
// admite dos lecturas: un texto por niveles, una XP con algo más o dos XP no se leen, y
// quedan para revisarlos a mano. Código puro: lo usan la importación y la carga de una vez.

import type { FilledRow, LinkedItem, LinkedQuest } from './summary'

/** Una línea de objeto de Torre: su cantidad, el nombre y la línea tal cual. */
export interface RewardLine {
  quantity: number
  name: string
  line: string
}

export type ReadRewards =
  | {
      unreadable?: undefined
      experience?: number
      kamas?: number
      items: RewardLine[]
      /** Lo que no es XP, kamas ni objeto, tal cual, en su orden. */
      notes: string[]
    }
  /** La primera línea que no se lee sola. */
  | { unreadable: string }

// Una cifra con los miles separados por espacios (normales, duros o estrechos) o puntos.
const AMOUNT = String.raw`(\d{1,3}(?:[\s.  ]\d{3})+|\d+)`
const EXPERIENCE = new RegExp(String.raw`^${AMOUNT}\s*xp\.?$`, 'i')
const KAMAS = new RegExp(String.raw`^${AMOUNT}\s*kamas\.?$`, 'i')
const ITEM = new RegExp(String.raw`^${AMOUNT}\s*x\s+(.+?)\.?$`, 'i')
// Lo que dice el nivel («Si eres nivel 1 a 109:», «Al 200: …») reparte por niveles.
const TIERS = /\bnivel(es)?\b|^al \d/i
// Habla de XP o kamas sin ser una línea de solo eso: «… XP (en total)», «… XP repartidos».
const REWARD_WORD = /\b(xp|kamas?|experiencia)\b/i
const BARE_AMOUNT = new RegExp(String.raw`^${AMOUNT}\.?$`)

const amount = (text: string) => Number(text.replace(/\D/g, ''))

/** Las líneas de recompensas de Torre, o la primera que no se lee sola. */
export function readRewardsText(text: string | null | undefined): ReadRewards {
  const read: Extract<ReadRewards, { notes: string[] }> = { items: [], notes: [] }
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (TIERS.test(line)) return { unreadable: line }
    const experience = EXPERIENCE.exec(line)
    const kamas = KAMAS.exec(line)
    const item = ITEM.exec(line)
    if (experience) {
      if (read.experience !== undefined) return { unreadable: line }
      read.experience = amount(experience[1]!)
    } else if (kamas) {
      if (read.kamas !== undefined) return { unreadable: line }
      read.kamas = amount(kamas[1]!)
    } else if (item) {
      read.items.push({ quantity: amount(item[1]!), name: item[2]!.trim(), line })
    } else if (REWARD_WORD.test(line) || BARE_AMOUNT.test(line)) {
      return { unreadable: line }
    } else {
      read.notes.push(line)
    }
  }
  return read
}

// Para casar nombres: sin tildes, mayúsculas, puntuación final ni espacios de más, y con el
// apóstrofo recto de DofusDB.
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

/** Lo que Torre da a los campos de recompensa de la guía. */
export interface TorreRewards {
  /** Solo lo que salió de su texto; lo demás lo rellena DofusDB (summaryToFill). */
  fields: {
    rewardExperience?: number
    rewardKamas?: number
    rewardItems?: FilledRow[]
    rewardNotes?: string
  }
  /** La línea que impide leer el texto: entonces no da nada. */
  unreadable?: string
  /** Objetos de DofusDB de los que escribió otra cantidad. */
  quantityChanges: { name: string; from: number; to: number }[]
  /** Sus líneas de objeto sin objeto de DofusDB con ese nombre: no se inventan. */
  unmatchedItems: string[]
}

type RewardItem = { item: LinkedItem & { id: number }; quantity: number }

/** Los objetos de recompensa poblados de la misión, en el orden de Torre. */
function questItems(quest: LinkedQuest | null | undefined): RewardItem[] {
  return [...(quest?.rewards?.items ?? [])]
    .reverse()
    .flatMap(({ item, quantity }) =>
      typeof item === 'object' && typeof item.id === 'number'
        ? [{ item: { ...item, id: item.id }, quantity }]
        : [],
    )
}

/**
 * Las recompensas del texto de Torre para los campos de la guía. Sus cifras ganan. Los
 * objetos son los de DofusDB, con la cantidad que él escribió para el mismo objeto; uno suyo
 * que DofusDB no da no se inventa. Sin objetos de DofusDB, sus líneas de objeto quedan como
 * notas, igual que se leían en su texto.
 */
export function torreRewards(
  text: string | null | undefined,
  quest: LinkedQuest | null | undefined,
): TorreRewards {
  const result: TorreRewards = { fields: {}, quantityChanges: [], unmatchedItems: [] }
  const read = readRewardsText(text)
  if (read.unreadable !== undefined) return { ...result, unreadable: read.unreadable }

  if (read.experience !== undefined) result.fields.rewardExperience = read.experience
  if (read.kamas !== undefined) result.fields.rewardKamas = read.kamas

  const given = questItems(quest)
  let notes = read.notes
  if (given.length) {
    const quantities = new Map<number, number>()
    for (const line of read.items) {
      const name = comparable(line.name)
      const match = given.find(
        ({ item }) =>
          comparable(item.name ?? '') === name ||
          (item.correction?.name && comparable(item.correction.name) === name),
      )
      if (!match) result.unmatchedItems.push(line.line)
      else if (line.quantity !== match.quantity) {
        quantities.set(match.item.id, line.quantity)
        result.quantityChanges.push({
          name: match.item.name ?? line.name,
          from: match.quantity,
          to: line.quantity,
        })
      }
    }
    if (quantities.size) {
      result.fields.rewardItems = given.map(({ item, quantity }) => ({
        item: item.id,
        quantity: quantities.get(item.id) ?? quantity,
      }))
    }
  } else if (read.items.length) {
    // Sus objetos y sus notas, en el orden en que los escribió.
    const kept = new Set([...read.items.map(({ line }) => line), ...read.notes])
    notes = (text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => kept.has(line))
  }
  if (notes.length) result.fields.rewardNotes = notes.join('\n')
  return result
}
