// La navegación de una checklist de almas (el Ocre): las etapas o las regiones al lado y una a la
// vez. Lo que se tiene de cada grupo según el tipo elegido, cuáles se ven, el anterior y el
// siguiente, y lo elegido en la dirección (#etapa=3&tipo=jefes, #region=Amakna), que sobrevive a
// recargar y sirve de enlace. Lo usa la isla (souls-ui.ts); sin dependencias, va en su JS.

export type SoulsBy = 'stage' | 'region'
export type SoulsType = 'all' | 'boss' | 'archi'

/** Un grupo (una etapa o una región) con sus almas: lo que la isla lee del HTML. */
export interface NavGroup {
  key: string
  souls: { id: number; type: string }[]
}

export const typeMatches = (type: SoulsType, soulType: string | undefined) =>
  type === 'all' || soulType === type

/** Lo que se tiene de cada grupo, contando solo las almas del tipo elegido. */
export function tallies(
  groups: NavGroup[],
  owned: (id: number) => boolean,
  type: SoulsType,
): Map<string, { owned: number; total: number }> {
  return new Map(
    groups.map((group) => {
      const souls = group.souls.filter((soul) => typeMatches(type, soul.type))
      return [
        group.key,
        { owned: souls.filter((soul) => owned(soul.id)).length, total: souls.length },
      ]
    }),
  )
}

/** Los grupos que tienen almas del tipo elegido, en su orden. */
export const shownKeys = (groups: NavGroup[], type: SoulsType) =>
  groups
    .filter((group) => group.souls.some((soul) => typeMatches(type, soul.type)))
    .map((group) => group.key)

/** El grupo pedido si se ve; si no, el primero que se ve. */
export const pickKey = (keys: string[], wanted: string | null | undefined) =>
  keys.find((key) => key === wanted) ?? keys[0] ?? null

/** El anterior y el siguiente entre los que se ven. */
export function neighbours(keys: string[], key: string | null) {
  const index = key === null ? -1 : keys.indexOf(key)
  if (index < 0) return { prev: null, next: null }
  return { prev: keys[index - 1] ?? null, next: keys[index + 1] ?? null }
}

const TYPE_WORDS: Record<SoulsType, string> = { all: 'todas', boss: 'jefes', archi: 'archis' }
const BY_WORDS: Record<SoulsBy, string> = { stage: 'etapa', region: 'region' }

/** La dirección de lo elegido: «#etapa=3&tipo=jefes». «Todas» no se escribe. */
export function soulsHash(state: { by: SoulsBy; at: string | null; type: SoulsType }): string {
  const params = new URLSearchParams()
  if (state.at !== null) params.set(BY_WORDS[state.by], state.at)
  else params.set('por', BY_WORDS[state.by])
  if (state.type !== 'all') params.set('tipo', TYPE_WORDS[state.type])
  return `#${params}`
}

/** Lo que dice la dirección; una que no es de aquí («#contenido») no dice nada. */
export function readSoulsHash(hash: string): { by?: SoulsBy; at?: string; type?: SoulsType } {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(hash.replace(/^#/, ''))
  } catch {
    return {}
  }
  const found: { by?: SoulsBy; at?: string; type?: SoulsType } = {}
  for (const by of ['stage', 'region'] as const) {
    const at = params.get(BY_WORDS[by])
    if (at) Object.assign(found, { by, at })
  }
  const by = (Object.keys(BY_WORDS) as SoulsBy[]).find((key) => BY_WORDS[key] === params.get('por'))
  if (!found.by && by) found.by = by
  const type = (Object.keys(TYPE_WORDS) as SoulsType[]).find(
    (key) => TYPE_WORDS[key] === params.get('tipo'),
  )
  if (type) found.type = type
  return found
}
