// Qué mazmorra de DofusDB nombra una nota de Necesitarás («Mazmorra Kumijo»), para pintar
// su jefe en «Necesitarás en total» (DESIGN.md, Achievement page components). Código puro:
// casa por el nombre de la mazmorra o el de su jefe, y ante cualquier duda no casa: un jefe
// equivocado es peor que el icono genérico.

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
// Las palabras de relleno que la segunda vuelta quita de notas y nombres: «Ben Ripata» es
// «Ben el Ripata» y «Reina de Ladrones», «Reina de los Ladrones». La palabra «mazmorra» se
// queda en las notas: dice dónde empieza el nombre.
const FILLER = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'llave'])
const IDOL = /^idolos?$/

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

/** Sin las palabras de relleno ni «con ídolo»; keep deja las que se quieren conservar. */
function withoutFiller(list: string[], keep: RegExp | null = null): string[] {
  const out: string[] = []
  for (let index = 0; index < list.length; index += 1) {
    const word = list[index]!
    if (word === 'con' && IDOL.test(list[index + 1] ?? '')) {
      index += 1
      continue
    }
    if (keep?.test(word)) out.push(word)
    else if (!FILLER.has(word) && !DUNGEON_WORD.test(word)) out.push(word)
  }
  return out
}

type Tier = 'name' | 'boss' | 'ending'

/** Por dónde casó una nota: el nombre de la mazmorra o el de uno de sus jefes. */
export type DungeonVia = 'name' | 'boss'

/** Lo que se compara de una nota, y con qué nombres. */
interface Variant {
  words: string[]
  tiers: Tier[]
  /**
   * Si la parte dice «mazmorra» en singular: solo entonces se buscan variantes del nombre, con
   * lo que sigue a esa palabra.
   */
  single: boolean
}

const TIERS: Tier[] = ['name', 'boss', 'ending']

/**
 * Lo que se compara de una nota, fuera del paréntesis y dentro de cada uno («Mazmorra de los
 * 4 Jinetes (Tormenta del Selocalipsis)»): lo que sigue a «Mazmorra» sin las palabras
 * genéricas («Kodámade»), contra todos los nombres; y el texto desde «Mazmorra», solo contra
 * el nombre entero de una mazmorra que empieza así («Mazmorra de los Herreros»). loose quita
 * antes las palabras de relleno.
 */
function noteVariants(label: string, loose: boolean): Variant[] {
  const parts = [label.replace(/\([^)]*\)/gu, ' ')]
  for (const [, inner] of label.matchAll(/\(([^)]*)\)/gu)) parts.push(inner!)
  return parts.flatMap((part): Variant[] => {
    const all = loose ? withoutFiller(words(part), DUNGEON_WORD) : words(part)
    const at = all.findIndex((word) => DUNGEON_WORD.test(word))
    const single = at !== -1 && all[at] === 'mazmorra'
    const rest = withoutGeneric(at === -1 ? all : all.slice(at + 1))
    const specific = { words: rest, tiers: TIERS, single }
    const full = { words: all.slice(at), tiers: ['name'] as Tier[], single: false }
    return at === -1 ? [specific] : [specific, full]
  })
}

/** Los finales de un nombre que lo distinguen: «Kodámade» de «Bambusería de Kodámade». */
function endings(name: string[]): string[] {
  const out: string[] = []
  for (let start = 1; start < name.length; start += 1) {
    if (!GENERIC.has(name[start]!)) out.push(name.slice(start).join(' '))
  }
  return out
}

/** Un nombre de la mazmorra, el suyo o el de un jefe, en palabras. */
interface Named {
  words: string[]
  via: DungeonVia
  boss?: string
}

interface Key {
  tier: Tier
  via: DungeonVia
  boss?: string
}

function namesOf(dungeon: DungeonNames, loose: boolean): Named[] {
  const prepare = (text: string) => (loose ? withoutFiller(words(text)) : words(text))
  return [
    { words: prepare(dungeon.name), via: 'name' },
    ...dungeon.bosses.map((boss): Named => ({ words: prepare(boss), via: 'boss', boss })),
  ]
}

/** Las claves de una mazmorra: su nombre, el de sus jefes y sus finales, con su origen. */
function keysOf(names: Named[]): Map<string, Key[]> {
  const keys = new Map<string, Key[]>()
  const add = (key: string, entry: Key) => keys.set(key, [...(keys.get(key) ?? []), entry])
  for (const { words: list, via, boss } of names) {
    if (list.length === 0) continue
    add(list.join(' '), { tier: via, via, ...(boss && { boss }) })
    for (const ending of endings(list)) add(ending, { tier: 'ending', via, ...(boss && { boss }) })
  }
  return keys
}

/** Dos palabras iguales, o casi: una errata en una palabra de cinco letras o más. */
function alike(a: string, b: string): boolean {
  if (a === b) return true
  const shortest = Math.min(a.length, b.length)
  if (shortest < 5) return false
  return distance(a, b) <= (shortest >= 8 ? 2 : 1)
}

/** Distancia de edición entre dos palabras. */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
    }
    previous = current
  }
  return previous[b.length]!
}

/** Si todas las palabras de la nota están, en orden y casi iguales, en el nombre. */
function within(note: string[], name: string[]): boolean {
  let at = 0
  for (const word of name) if (at < note.length && alike(note[at]!, word)) at += 1
  return at === note.length
}

/** Lo que casó: la mazmorra, por dónde y, si fue por su jefe, cuál. */
interface Hit<T> {
  dungeon: T
  via: DungeonVia
  boss?: string
}

/** La mazmorra que nombra una nota, cómo casó, y si fue por una variante del nombre. */
export type DungeonMatch<T> =
  | { dungeon: T; via: DungeonVia; boss?: string; approximate: boolean }
  | { dungeon: null; candidates: T[] }

/** De varios aciertos, uno por mazmorra; el nombre de la mazmorra gana al de su jefe. */
function byDungeon<T>(hits: Hit<T>[]): Map<T, Hit<T>> {
  const out = new Map<T, Hit<T>>()
  for (const hit of hits) {
    const seen = out.get(hit.dungeon)
    if (!seen || (seen.via === 'boss' && hit.via === 'name')) out.set(hit.dungeon, hit)
  }
  return out
}

/**
 * Prepara las mazmorras una vez y devuelve, para cada nota, qué mazmorra nombra y cómo, o
 * entre cuáles duda. Tres vueltas, y cada una solo si la anterior no encontró nada; una duda
 * en cualquiera de ellas para: la nota no casa.
 *
 * 1. En cada parte de la nota se compara su principio, del más largo al más corto, con el
 *    nombre entero de cada mazmorra, después con el de sus jefes y al final con el final de
 *    esos nombres («Mazmorra de Grunob» es la del Director Grunob). Un final de una sola
 *    palabra solo vale si es toda la parte: «Mazmorra del Rey Gelatina» no es la del Gran
 *    Rey. Si en una parte casan varias a la vez (un jefe de dos mazmorras, «Real»), esa parte
 *    no da nada y se sigue con las demás. La nota casa solo si las partes que dan una
 *    mazmorra dan la misma.
 * 2. Lo mismo sin las palabras de relleno, en la nota y en los nombres: «Mazmorra Ben
 *    Ripata» es la de Ben el Ripata, «Mazmorra Tynril con ídolo», la del Tynril.
 * 3. Solo si la nota dice «Mazmorra» en singular, una variante del nombre: todas las
 *    palabras que siguen, dos o más, están en orden en el nombre de la mazmorra o en el de
 *    un jefe, aunque falte alguna o tengan una errata («Ring Eskarlata», «Ratonera de la Rata
 *    Negra»); y si ninguna las tiene, la primera es el nombre de pila de un jefe («Anerice la
 *    bebesita»).
 *
 * Las mazmorras sin jefe (las expediciones) no cuentan.
 */
export function dungeonMatches<T extends DungeonNames>(
  dungeons: T[],
): (label: string) => DungeonMatch<T> {
  const withBosses = dungeons.filter((dungeon) => dungeon.bosses.length > 0)
  const passes = [false, true].map((loose) => ({
    loose,
    candidates: withBosses.map((dungeon) => ({
      dungeon,
      keys: keysOf(namesOf(dungeon, loose)),
    })),
  }))
  const looseNames = withBosses.map((dungeon) => ({ dungeon, names: namesOf(dungeon, true) }))

  function matchVariant(
    { words: list, tiers }: Variant,
    candidates: (typeof passes)[number]['candidates'],
  ): Hit<T>[] {
    for (let length = list.length; length > 0; length -= 1) {
      const phrase = list.slice(0, length)
      const count = significant(phrase)
      if (count === 0) continue
      const prefix = phrase.join(' ')
      for (const tier of tiers) {
        if (tier === 'ending' && count < 2 && length < list.length) continue
        const hits = candidates.flatMap(({ dungeon, keys }) =>
          (keys.get(prefix) ?? [])
            .filter((key) => key.tier === tier)
            .map((key): Hit<T> => ({ dungeon, via: key.via, ...(key.boss && { boss: key.boss }) })),
        )
        if (hits.length > 0) return [...byDungeon(hits).values()]
      }
    }
    return []
  }

  /**
   * Lo que da la tercera vuelta para las partes de la nota: primero las palabras en orden; si
   * ninguna mazmorra las tiene, el nombre de pila de un jefe.
   */
  function approximate(parts: string[][]): Hit<T>[] {
    const look = (test: (list: string[], named: Named) => boolean) =>
      parts.flatMap((list) =>
        looseNames.flatMap(({ dungeon, names }) =>
          names.flatMap((named): Hit<T>[] =>
            test(list, named)
              ? [{ dungeon, via: named.via, ...(named.boss && { boss: named.boss }) }]
              : [],
          ),
        ),
      )
    const inOrder = look((list, { words: name }) => list.length >= 2 && within(list, name))
    if (inOrder.length > 0) return inOrder
    return look(
      (list, { words: name, via }) =>
        via === 'boss' && list[0]!.length >= 4 && alike(list[0]!, name[0] ?? ''),
    )
  }

  const verdict = (found: Map<T, Hit<T>>, doubt: T[], fuzzy: boolean): DungeonMatch<T> | null => {
    if (found.size === 1) {
      const { dungeon, via, boss } = [...found.values()][0]!
      return { dungeon, via, ...(boss && { boss }), approximate: fuzzy }
    }
    if (found.size > 1) return { dungeon: null, candidates: [...found.keys()] }
    if (doubt.length > 0) return { dungeon: null, candidates: [...new Set(doubt)] }
    return null
  }

  return (label) => {
    for (const { loose, candidates } of passes) {
      const found: Hit<T>[] = []
      const doubt: T[] = []
      for (const variant of noteVariants(label, loose)) {
        const hits = matchVariant(variant, candidates)
        if (hits.length === 1) found.push(hits[0]!)
        else doubt.push(...hits.map((hit) => hit.dungeon))
      }
      const result = verdict(byDungeon(found), doubt, false)
      if (result) return result
    }
    const parts = noteVariants(label, true).filter(
      (variant) => variant.single && variant.words.length > 0,
    )
    const hits = approximate(parts.map((variant) => variant.words))
    return verdict(byDungeon(hits), [], true) ?? { dungeon: null, candidates: [] }
  }
}

/** La mazmorra que nombra una nota, o null: dungeonMatches sin decir cómo casó. */
export function dungeonMatcher<T extends DungeonNames>(dungeons: T[]): (label: string) => T | null {
  const explain = dungeonMatches(dungeons)
  return (label) => explain(label).dungeon
}

/** La mazmorra que nombra una nota, o null (dungeonMatcher, para una sola nota). */
export function matchDungeon<T extends DungeonNames>(label: string, dungeons: T[]): T | null {
  return dungeonMatcher(dungeons)(label)
}

/** Cómo se eligió la mazmorra de una nota: a mano en el panel, por nombre, por jefe o nada. */
export type DungeonChoice<T> =
  | { how: 'manual'; dungeon: T }
  | { how: DungeonVia; dungeon: T; boss?: string; approximate: boolean }
  | { how: 'none'; dungeon: null; candidates: T[] }

/**
 * La mazmorra de cada nota: la que Torre eligió a mano para ella, si sigue existiendo, y si
 * no, la que casa por nombre o por jefe (dungeonMatches). picked da el ID de la elegida, o
 * undefined. Sin elección y sin una mazmorra que case sola, ninguna (how: 'none'), con las
 * candidatas si las hubo: la fila lleva el icono genérico.
 */
export function dungeonChooser<T extends DungeonNames & { id: number }>(
  dungeons: T[],
  picked: (label: string) => number | undefined,
): (label: string) => DungeonChoice<T> {
  const byId = new Map(dungeons.map((dungeon) => [dungeon.id, dungeon]))
  const explain = dungeonMatches(dungeons)
  return (label) => {
    const id = picked(label)
    const chosen = id === undefined ? undefined : byId.get(id)
    if (chosen) return { how: 'manual', dungeon: chosen }
    const found = explain(label)
    if ('candidates' in found) return { how: 'none', dungeon: null, candidates: found.candidates }
    const { via, ...rest } = found
    return { how: via, ...rest }
  }
}

/** Cómo casó una nota, por nombres y sin las mazmorras enteras: lo que dice el informe. */
export type NoteMatch =
  | { how: 'manual'; dungeon: string }
  | { how: DungeonVia; dungeon: string; boss?: string; approximate: boolean }
  | { how: 'none'; candidates?: string[] }

/** DungeonChoice en nombres; una nota sin candidatas no lleva la lista. */
export function noteMatch(choice: DungeonChoice<DungeonNames>): NoteMatch {
  if (choice.how === 'none') {
    const candidates = choice.candidates.map((dungeon) => dungeon.name)
    return candidates.length > 0 ? { how: 'none', candidates } : { how: 'none' }
  }
  if (choice.how === 'manual') return { how: 'manual', dungeon: choice.dungeon.name }
  const { how, dungeon, boss, approximate } = choice
  return { how, dungeon: dungeon.name, ...(boss && { boss }), approximate }
}
