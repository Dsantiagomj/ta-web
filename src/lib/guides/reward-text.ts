// Las recompensas que Torre escribió en su texto («2 625 000 XP.», «43 980 kamas.», «10 x
// Perla de las profundidades.»), leídas para los campos de la guía. Solo se lee lo que no
// admite dos lecturas: un texto por niveles, una XP con algo más o dos XP no se leen, y
// quedan para revisarlos a mano. Código puro: lo usan la importación y la carga de una vez.

import type { FilledLevel, FilledRow, LinkedItem, LinkedQuest, LinkedRewards } from './summary'

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
  return populatedItems(quest?.rewards?.items)
}

function populatedItems(items: LinkedRewards['items']): RewardItem[] {
  return [...(items ?? [])]
    .reverse()
    .flatMap(({ item, quantity }) =>
      typeof item === 'object' && typeof item.id === 'number'
        ? [{ item: { ...item, id: item.id }, quantity }]
        : [],
    )
}

/** El objeto de DofusDB que nombra su línea, por su nombre o por la corrección de Torre. */
function findItem(given: RewardItem[], line: RewardLine): RewardItem | undefined {
  const name = comparable(line.name)
  return given.find(
    ({ item }) =>
      comparable(item.name ?? '') === name ||
      (item.correction?.name && comparable(item.correction.name) === name),
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
      const match = findItem(given, line)
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

// «Si eres nivel 1 a 109:» y sus cifras en las líneas de debajo, como lo deja la importación
// (en su página cada tramo es un elemento de lista con sus cifras en una sublista), o detrás
// de los dos puntos. Las guías importadas antes de que la importación leyera bien las
// sublistas guardan «Si eres nivel 1 a 109: 1 329 586 XP.14 041 kamas.5 x Cupón chocolate.»
// y debajo las mismas cifras otra vez; se leen igual mientras sigan así.
const TIER = /^(?:si eres (?:de )?)?nivel(?:es)? (\d+) a (\d+)\s*:\s*(.*)$/i
// Corta tras el punto de una palabra («XP.14 041»), no en los miles con punto (1.329.586).
const TIER_PARTS = /(?<=[^\d\s]\.)\s*(?=\d)/

/** Un tramo leído del texto de Torre. */
interface ReadTier {
  levelMin: number
  levelMax: number
  experience?: number
  kamas?: number
  items: RewardLine[]
}

/** Los tramos de su texto; la primera línea que no se lee sola, o ninguno sin dos tramos. */
function readTiers(
  text: string | null | undefined,
): { tiers: ReadTier[] } | { unreadable: string } {
  const tiers: ReadTier[] = []
  // Cada cifra una vez por tramo: repetida igual (el texto de antes del arreglo), vale; otra,
  // no se lee.
  const add = (tier: ReadTier, part: string): boolean => {
    const experience = EXPERIENCE.exec(part)
    const kamas = KAMAS.exec(part)
    const item = ITEM.exec(part)
    if (experience) {
      const value = amount(experience[1]!)
      if (tier.experience !== undefined && tier.experience !== value) return false
      tier.experience = value
    } else if (kamas) {
      const value = amount(kamas[1]!)
      if (tier.kamas !== undefined && tier.kamas !== value) return false
      tier.kamas = value
    } else if (item) {
      const line = { quantity: amount(item[1]!), name: item[2]!.trim(), line: part }
      const same = tier.items.find((seen) => comparable(seen.name) === comparable(line.name))
      if (same && same.quantity !== line.quantity) return false
      if (!same) tier.items.push(line)
    } else {
      return false
    }
    return true
  }
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const header = TIER.exec(line)
    if (header) {
      tiers.push({ levelMin: Number(header[1]), levelMax: Number(header[2]), items: [] })
    }
    // Lo de antes del primer tramo («Depende del nivel:», un emote) no es de ningún tramo.
    const current = tiers.at(-1)
    if (!current) continue
    const parts = header ? header[3]!.split(TIER_PARTS) : [line]
    for (const part of parts.map((entry) => entry.trim()).filter(Boolean)) {
      if (!add(current, part)) return { unreadable: part }
    }
  }
  return { tiers: tiers.length >= 2 ? tiers : [] }
}

/** Los tramos de nivel que Torre escribió, para «Por nivel». */
export interface TorreLevelRewards {
  /** Con dos tramos o más que se leen; si no, nada. */
  levels?: FilledLevel[]
  /** La línea que impide leer sus tramos. */
  unreadable?: string
  /** Sus líneas de objeto sin objeto de DofusDB con ese nombre en el tramo. */
  unmatchedItems: string[]
}

/**
 * Los tramos del texto de Torre («Si eres nivel 1 a 109: …»). Sus cifras ganan; lo que no
 * escribe de un tramo lo pone el mismo tramo de DofusDB. Los objetos son los del tramo de
 * DofusDB, con la cantidad que él escribió para el mismo objeto; uno suyo que DofusDB no da
 * en ese tramo no se inventa y se lista.
 */
export function torreLevelRewards(
  text: string | null | undefined,
  quest: LinkedQuest | null | undefined,
): TorreLevelRewards {
  const read = readTiers(text)
  if ('unreadable' in read) return { unreadable: read.unreadable, unmatchedItems: [] }
  if (!read.tiers.length) return { unmatchedItems: [] }
  const unmatchedItems: string[] = []
  const levels = read.tiers.map((tier): FilledLevel => {
    const given = quest?.rewards?.byLevel?.find(
      (candidate) => candidate.levelMin === tier.levelMin && candidate.levelMax === tier.levelMax,
    )
    const items = populatedItems(given?.items)
    const quantities = new Map<number, number>()
    for (const line of tier.items) {
      const match = findItem(items, line)
      if (match) quantities.set(match.item.id, line.quantity)
      else unmatchedItems.push(line.line)
    }
    return {
      levelMin: tier.levelMin,
      levelMax: tier.levelMax,
      experience: tier.experience ?? given?.experience ?? null,
      kamas: tier.kamas ?? given?.kamas ?? null,
      items: items.map(({ item, quantity }) => ({
        item: item.id,
        quantity: quantities.get(item.id) ?? quantity,
      })),
    }
  })
  return { levels, unmatchedItems }
}
