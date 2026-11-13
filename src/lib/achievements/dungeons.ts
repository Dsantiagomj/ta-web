// Qué mazmorra de DofusDB nombra una nota de Necesitarás («Mazmorra Kumijo»), para pintar
// su jefe en «Necesitarás en total» (DESIGN.md, Achievement page components). Código puro:
// casa por nombre, y ante cualquier duda no casa: un jefe equivocado es peor que el icono
// genérico.

/** Una mazmorra con los nombres de sus jefes, en español. */
export interface DungeonNames {
  name: string
  bosses: string[]
}

// Palabras que no nombran ninguna mazmorra en concreto: «Llave de la mazmorra del Kimbo» es
// «Kimbo». Una frase hecha solo de ellas no casa, y un final que empieza por una de ellas
// («de Kodámade», «mazmorra») no distingue nada.
const GENERIC = new Set(['mazmorra', 'mazmorras', 'llave', 'de', 'del', 'la', 'las', 'los', 'el'])
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

const significant = (list: string[]) => list.filter((word) => !GENERIC.has(word)).length

function withoutGeneric(list: string[]): string[] {
  let start = 0
  while (start < list.length && GENERIC.has(list[start]!)) start += 1
  return list.slice(start)
}

type Tier = 'name' | 'boss' | 'ending'

/** Lo que se compara de una nota, y con qué nombres. */
interface Variant {
  words: string[]
  tiers: Tier[]
}

/**
 * Lo que se compara de una nota, fuera del paréntesis y dentro de cada uno («Mazmorra de los
 * 4 Jinetes (Tormenta del Selocalipsis)»): lo que sigue a «Mazmorra» sin las palabras
 * genéricas («Kodámade»), contra todos los nombres; y el texto desde «Mazmorra», solo contra
 * el nombre entero de una mazmorra que empieza así («Mazmorra de los Herreros»).
 */
function noteVariants(label: string): Variant[] {
  const parts = [label.replace(/\([^)]*\)/gu, ' ')]
  for (const [, inner] of label.matchAll(/\(([^)]*)\)/gu)) parts.push(inner!)
  return parts.flatMap((part): Variant[] => {
    const all = words(part)
    const at = all.findIndex((word) => DUNGEON_WORD.test(word))
    const specific = { words: withoutGeneric(at === -1 ? all : all.slice(at + 1)), tiers: TIERS }
    return at === -1 ? [specific] : [specific, { words: all.slice(at), tiers: ['name'] }]
  })
}

const TIERS: Tier[] = ['name', 'boss', 'ending']

/** Los finales de un nombre que lo distinguen: «Kodámade» de «Bambusería de Kodámade». */
function endings(name: string[]): string[] {
  const out: string[] = []
  for (let start = 1; start < name.length; start += 1) {
    if (!GENERIC.has(name[start]!)) out.push(name.slice(start).join(' '))
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

/**
 * Prepara las mazmorras una vez (sus nombres normalizados) y devuelve con qué mazmorra casa
 * cada nota, o null. En cada parte de la nota se compara su principio, del más largo al más
 * corto, con el nombre entero de cada mazmorra, después con el de sus jefes y al final con
 * el final de esos nombres («Mazmorra de Grunob» es la del Director Grunob). Un final de una
 * sola palabra solo vale si es toda la parte: «Mazmorra del Rey Gelatina» no es la del Gran
 * Rey. Si en una parte casan varias a la vez (un jefe de dos mazmorras, «Real»), esa parte
 * no da nada y se sigue con las demás. La nota casa solo si las partes que dan una mazmorra
 * dan la misma. Las mazmorras sin jefe (las expediciones) no cuentan.
 */
export function dungeonMatcher<T extends DungeonNames>(dungeons: T[]): (label: string) => T | null {
  const candidates = dungeons
    .filter((dungeon) => dungeon.bosses.length > 0)
    .map((dungeon) => ({ dungeon, keys: keysOf(dungeon) }))

  function matchVariant({ words: list, tiers }: Variant): T | null {
    for (let length = list.length; length > 0; length -= 1) {
      const phrase = list.slice(0, length)
      const count = significant(phrase)
      if (count === 0) continue
      const prefix = phrase.join(' ')
      for (const tier of tiers) {
        if (tier === 'ending' && count < 2 && length < list.length) continue
        const found = candidates.filter(({ keys }) => keys[tier].has(prefix))
        if (found.length === 0) continue
        return found.length === 1 ? found[0]!.dungeon : null
      }
    }
    return null
  }

  return (label) => {
    if (candidates.length === 0) return null
    const found = new Set(noteVariants(label).flatMap((variant) => matchVariant(variant) ?? []))
    return found.size === 1 ? [...found][0]! : null
  }
}

/** La mazmorra que nombra una nota, o null (dungeonMatcher, para una sola nota). */
export function matchDungeon<T extends DungeonNames>(label: string, dungeons: T[]): T | null {
  return dungeonMatcher(dungeons)(label)
}
