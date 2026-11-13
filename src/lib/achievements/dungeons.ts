// Qué mazmorra de DofusDB nombra una nota de Necesitarás («Mazmorra Kumijo»), para pintar
// su jefe en «Necesitarás en total» (DESIGN.md, Achievement page components). Código puro:
// casa por nombre, y una nota que no nombra una sola mazmorra no se casa con ninguna.

/** Una mazmorra con los nombres de sus jefes, en español. */
export interface DungeonNames {
  name: string
  bosses: string[]
}

// Palabras que unen un nombre («Guarida de Lasoberaña»): un final que empieza por una de
// ellas no distingue nada.
const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'el'])
const DUNGEON_WORD = /^mazmorras?$/

/** Las palabras de un texto, sin mayúsculas, tildes ni signos; el apóstrofo se queda. */
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘`´]/gu, "'")
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function withoutConnectors(list: string[]): string[] {
  let start = 0
  while (start < list.length && CONNECTORS.has(list[start]!)) start += 1
  return list.slice(start)
}

/**
 * Lo que se compara de una nota: el texto desde «Mazmorra» y lo que va detrás («de
 * Lasoberaña» sin el «de»), fuera del paréntesis y, después, dentro de cada paréntesis
 * («Mazmorra de los 4 Jinetes (Tormenta del Selocalipsis)»).
 */
function noteVariants(label: string): string[][] {
  const parts = [label.replace(/\([^)]*\)/gu, ' ')]
  for (const [, inner] of label.matchAll(/\(([^)]*)\)/gu)) parts.push(inner!)
  return parts.flatMap((part) => {
    const all = words(part)
    const at = all.findIndex((word) => DUNGEON_WORD.test(word))
    if (at === -1) return [all]
    return [all.slice(at), withoutConnectors(all.slice(at + 1))]
  })
}

type Tier = 'name' | 'boss' | 'ending'

/** Los finales de un nombre que lo distinguen: «Kodámade» de «Bambusería de Kodámade». */
function endings(name: string[]): string[] {
  const out: string[] = []
  for (let start = 1; start < name.length; start += 1) {
    if (!CONNECTORS.has(name[start]!)) out.push(name.slice(start).join(' '))
  }
  return out
}

function keysOf(dungeon: DungeonNames): Record<Tier, Set<string>> {
  const name = words(dungeon.name)
  const bosses = dungeon.bosses.map(words)
  return {
    name: new Set([name.join(' ')]),
    boss: new Set(bosses.map((boss) => boss.join(' '))),
    ending: new Set([name, ...bosses].flatMap(endings)),
  }
}

const TIERS: Tier[] = ['name', 'boss', 'ending']

/**
 * La mazmorra que nombra una nota, o null. Se compara el principio de lo que sigue a
 * «Mazmorra», del más largo al más corto, con el nombre de cada mazmorra, después con el de
 * sus jefes y al final con el final de esos nombres («Mazmorra de Grunob» es la del
 * Director Grunob). Si a la vez casan varias, gana la que tiene menos jefes (Trono de
 * Sangre antes que la Tormenta del Selocalipsis, que reúne a cuatro); si aun así quedan
 * varias, la nota no se casa: nunca se adivina. Las mazmorras sin jefe (las expediciones)
 * no cuentan.
 */
export function matchDungeon<T extends DungeonNames>(label: string, dungeons: T[]): T | null {
  const candidates = dungeons
    .filter((dungeon) => dungeon.bosses.length > 0)
    .map((dungeon) => ({ dungeon, keys: keysOf(dungeon) }))
  if (candidates.length === 0) return null
  for (const variant of noteVariants(label)) {
    for (let length = variant.length; length > 0; length -= 1) {
      const prefix = variant.slice(0, length).join(' ')
      for (const tier of TIERS) {
        const found = candidates.filter(({ keys }) => keys[tier].has(prefix))
        if (found.length === 0) continue
        const fewest = Math.min(...found.map(({ dungeon }) => dungeon.bosses.length))
        const best = found.filter(({ dungeon }) => dungeon.bosses.length === fewest)
        return best.length === 1 ? best[0]!.dungeon : null
      }
    }
  }
  return null
}
