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
// Los títulos que llevan varios jefes del juego: no son un nombre de pila («Maestro» no es
// solo el Maestro Cuerbok). Un nombre de pila tiene además cinco letras o más.
const TITLES = new Set([
  'gran',
  'grande',
  'rey',
  'reina',
  'principe',
  'princesa',
  'conde',
  'condesa',
  'duque',
  'duquesa',
  'baron',
  'baronesa',
  'capitan',
  'capitana',
  'maestro',
  'maestra',
  'director',
  'directora',
  'general',
  'comandante',
  'almirante',
  'senor',
  'senora',
  'sir',
  'lord',
  'lady',
  'dama',
  'don',
  'dona',
  'doctor',
  'doctora',
  'profesor',
  'profesora',
  'padre',
  'madre',
  'hermano',
  'hermana',
  'jefe',
  'jefa',
  'real',
  'shogun',
  'emperador',
  'emperatriz',
  'sacerdote',
  'sacerdotisa',
  'guardian',
  'guardiana',
  'caballero',
  'mago',
  'maga',
  'bruja',
  'brujo',
])
const FIRST_NAME_LENGTH = 5
// «Expedición - Torre de Solar», «Expedición de Audacia - Torre de Solar»: el sitio va detrás.
const EXPEDITION = /^Expedición\b[^-]*-\s*/u

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
 * antes las palabras de relleno, y con ellas esa segunda comparación.
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
    // Sin las palabras de relleno, ningún nombre empieza por «mazmorra»: solo en la estricta.
    if (at === -1 || loose) return [specific]
    return [specific, { words: all.slice(at), tiers: ['name'] as Tier[], single: false }]
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

/**
 * Si la nota es una variante del nombre: dos palabras o más, todas en orden, con como mucho
 * una palabra del nombre de más («Ring Eskarlata», Ring del Capitán Eskarlata) y como mucho
 * una palabra con una errata («Ratonera», Raratonera).
 */
function fits(note: string[], name: string[]): boolean {
  const extra = name.length - note.length
  if (note.length < 2 || extra < 0 || extra > 1) return false
  const skips = extra === 0 ? [-1] : name.map((_, index) => index)
  return skips.some((skip) => {
    const kept = name.filter((_, index) => index !== skip)
    let typos = 0
    for (let index = 0; index < note.length; index += 1) {
      if (note[index] === kept[index]) continue
      if (!alike(note[index]!, kept[index]!)) return false
      typos += 1
    }
    return typos <= 1
  })
}

/** Lo que casó: la posición de la mazmorra en la lista, por dónde y, si fue un jefe, cuál. */
interface Hit {
  at: number
  via: DungeonVia
  boss?: string
}

const hitOf = (at: number, { via, boss }: { via: DungeonVia; boss?: string }): Hit => ({
  at,
  via,
  ...(boss && { boss }),
})

/** De varios aciertos, uno por mazmorra; el nombre de la mazmorra gana al de su jefe. */
function byDungeon(hits: Hit[]): Map<number, Hit> {
  const out = new Map<number, Hit>()
  for (const hit of hits) {
    const seen = out.get(hit.at)
    if (!seen || (seen.via === 'boss' && hit.via === 'name')) out.set(hit.at, hit)
  }
  return out
}

interface Candidate {
  at: number
  keys: Map<string, Key[]>
}

/** Lo que solo hace falta cuando la vuelta estricta no encuentra nada. */
interface LooseIndex {
  candidates: Candidate[]
  /** Los nombres de las variantes: los de las mazmorras con jefe y los que no tienen gemela. */
  names: { at: number; names: Named[] }[]
  /** La primera palabra de cada jefe, para los nombres de pila. */
  bosses: { at: number; boss: string; first: string }[]
}

/** Las mazmorras preparadas para casar notas, por posición en la lista. */
export interface DungeonIndex {
  /** Si ya se preparó lo de las vueltas sin relleno y de variantes. */
  readonly looseReady: boolean
}

class Index implements DungeonIndex {
  readonly strict: Candidate[]
  readonly bossed: number[]
  private built: LooseIndex | undefined

  constructor(private readonly dungeons: DungeonNames[]) {
    this.bossed = dungeons.flatMap((dungeon, at) => (dungeon.bosses.length > 0 ? [at] : []))
    this.strict = this.bossed.map((at) => ({ at, keys: keysOf(namesOf(dungeons[at]!, false)) }))
  }

  get looseReady(): boolean {
    return this.built !== undefined
  }

  loose(): LooseIndex {
    if (this.built) return this.built
    const { dungeons, bossed } = this
    const named = bossed.map((at) => ({ at, names: namesOf(dungeons[at]!, true) }))
    // Una mazmorra sin jefe (una expedición, un templo sin jefe en DofusDB) no casa nunca, pero
    // si se parece a la nota causa duda. Una expedición de una mazmorra que está ya cuenta como
    // ella.
    const twins = new Set(named.map(({ names }) => names[0]!.words.join(' ')))
    const bossless = dungeons.flatMap((dungeon, at) => {
      if (dungeon.bosses.length > 0) return []
      const list = withoutFiller(words(dungeon.name.replace(EXPEDITION, '')))
      return list.length === 0 || twins.has(list.join(' '))
        ? []
        : [{ at, names: [{ words: list, via: 'name' as const }] }]
    })
    this.built = {
      candidates: named.map(({ at, names }) => ({ at, keys: keysOf(names) })),
      names: [...named, ...bossless].sort((a, b) => a.at - b.at),
      bosses: named.flatMap(({ at, names }) =>
        names.flatMap(({ words: list, boss }) =>
          boss && list[0] ? [{ at, boss, first: list[0] }] : [],
        ),
      ),
    }
    return this.built
  }
}

// Las mazmorras cambian solo con `pnpm data:quests`: cada página de logro lee las mismas, y el
// índice se reutiliza mientras sus nombres y jefes no cambien.
let cached: { signature: string; index: Index } | undefined

const signatureOf = (dungeons: DungeonNames[]) =>
  dungeons.map(({ name, bosses }) => `${name}\u0001${bosses.join('\u0002')}`).join('\u0003')

function indexFor(dungeons: DungeonNames[]): Index {
  const signature = signatureOf(dungeons)
  if (cached?.signature !== signature) cached = { signature, index: new Index(dungeons) }
  return cached.index
}

/** El índice de un juego de mazmorras: el mismo para los mismos nombres y jefes. */
export function dungeonIndex(dungeons: DungeonNames[]): DungeonIndex {
  return indexFor(dungeons)
}

/** La mazmorra que nombra una nota y cómo casó, o entre cuáles duda. */
export type DungeonMatch<T> =
  | { how: DungeonVia; dungeon: T; boss?: string; approximate: boolean }
  | { how: 'none'; dungeon: null; candidates: T[] }

/** Lo que dan las partes de una nota: las que dan una sola mazmorra y las que dudan. */
function collect(parts: Hit[][]): { found: Map<number, Hit>; doubt: number[] } {
  const found: Hit[] = []
  const doubt: number[] = []
  for (const hits of parts) {
    const each = byDungeon(hits)
    if (each.size === 1) found.push(...each.values())
    else doubt.push(...each.keys())
  }
  return { found: byDungeon(found), doubt: [...new Set(doubt)] }
}

/** El principio más largo de una parte que casa con algún nombre (vueltas 1 y 2). */
function strictHits({ words: list, tiers }: Variant, candidates: Candidate[]): Hit[] {
  for (let length = list.length; length > 0; length -= 1) {
    const phrase = list.slice(0, length)
    const count = significant(phrase)
    if (count === 0) continue
    const prefix = phrase.join(' ')
    for (const tier of tiers) {
      if (tier === 'ending' && count < 2 && length < list.length) continue
      const hits = candidates.flatMap(({ at, keys }) =>
        (keys.get(prefix) ?? []).filter((key) => key.tier === tier).map((key) => hitOf(at, key)),
      )
      if (hits.length > 0) return hits
    }
  }
  return []
}

/**
 * Las variantes de una parte (vuelta 3): primero el nombre entero con como mucho una palabra
 * de más y una errata (fits); si ningún nombre vale, un nombre de pila que solo tiene un jefe
 * de todo el juego, y que no es un título.
 */
function approximateHits(list: string[], { names, bosses }: LooseIndex): Hit[] {
  const inOrder = names.flatMap(({ at, names: own }) =>
    own.filter((named) => fits(list, named.words)).map((named) => hitOf(at, named)),
  )
  if (inOrder.length > 0) return inOrder
  const first = list[0]!
  if (first.length < FIRST_NAME_LENGTH || TITLES.has(first) || GENERIC.has(first)) return []
  const owners = bosses.filter((boss) => alike(first, boss.first))
  return owners.length === 1 ? [{ at: owners[0]!.at, via: 'boss', boss: owners[0]!.boss }] : []
}

/**
 * Prepara las mazmorras (una vez por juego de nombres y jefes, dungeonIndex) y devuelve, para
 * cada nota, qué mazmorra nombra y cómo, o entre cuáles duda. Tres vueltas, y cada una solo si
 * la anterior no encontró nada; una duda en cualquiera de ellas para: la nota no casa.
 *
 * 1. En cada parte de la nota se compara su principio, del más largo al más corto, con el
 *    nombre entero de cada mazmorra, después con el de sus jefes y al final con el final de
 *    esos nombres («Mazmorra de Grunob» es la del Director Grunob). Un final de una sola
 *    palabra solo vale si es toda la parte: «Mazmorra del Rey Gelatina» no es la del Gran
 *    Rey.
 * 2. Lo mismo sin las palabras de relleno, en la nota y en los nombres: «Mazmorra Ben
 *    Ripata» es la de Ben el Ripata, «Mazmorra Tynril con ídolo», la del Tynril.
 * 3. Solo en las partes que dicen «Mazmorra» en singular, una variante del nombre: todas las
 *    palabras que siguen, dos o más, en orden en el nombre de una mazmorra o de un jefe, con
 *    como mucho una palabra de más y una errata («Ring Eskarlata», «Ratonera de la Rata
 *    Negra»); y si ningún nombre las tiene, el nombre de pila de un solo jefe («Anerice la
 *    bebesita»). Aquí cuentan también las mazmorras sin jefe que no son la expedición de otra:
 *    nunca casan, pero si se parecen, hay duda.
 *
 * En cada vuelta, una parte que da varias mazmorras duda; la nota casa si las partes que dan
 * una sola dan la misma, y si no hay ninguna así, duda entre las que salieron.
 */
export function dungeonMatches<T extends DungeonNames>(
  dungeons: T[],
): (label: string) => DungeonMatch<T> {
  const index = indexFor(dungeons)
  const bossed = new Set(index.bossed)

  const verdict = (
    { found, doubt }: ReturnType<typeof collect>,
    approximate: boolean,
  ): DungeonMatch<T> | null => {
    if (found.size === 1) {
      const { at, via, boss } = [...found.values()][0]!
      if (!bossed.has(at)) return { how: 'none', dungeon: null, candidates: [dungeons[at]!] }
      return { how: via, dungeon: dungeons[at]!, ...(boss && { boss }), approximate }
    }
    const candidates = found.size > 1 ? [...found.keys()] : doubt
    return candidates.length > 0
      ? { how: 'none', dungeon: null, candidates: candidates.map((at) => dungeons[at]!) }
      : null
  }

  return (label) => {
    const strict = collect(noteVariants(label, false).map((v) => strictHits(v, index.strict)))
    const first = verdict(strict, false)
    if (first) return first
    const loose = index.loose()
    const variants = noteVariants(label, true)
    const second = verdict(collect(variants.map((v) => strictHits(v, loose.candidates))), false)
    if (second) return second
    const parts = variants.filter((variant) => variant.single && variant.words.length > 0)
    const third = verdict(collect(parts.map((v) => approximateHits(v.words, loose))), true)
    return third ?? { how: 'none', dungeon: null, candidates: [] }
  }
}

/** Cómo se eligió la mazmorra de una nota: a mano en el panel, o como la casó dungeonMatches. */
export type DungeonChoice<T> = { how: 'manual'; dungeon: T } | DungeonMatch<T>

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
    return chosen ? { how: 'manual', dungeon: chosen } : explain(label)
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
