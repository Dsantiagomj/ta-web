// Lo que la importación delta decide de una página nueva de Torre sin mirar la base: si es una
// guía de misión y con qué misión de DofusDB casa. El cruce es el del inventario de la
// migración (analyze.py, que escribió out/quest_matches.csv): por el slug, con y sin la ñ que
// Squarespace quita, y por el título normalizado. Código puro.

const stripAccents = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '')

/** Para comparar nombres: sin acentos ni signos, en minúsculas. */
export function normalizeName(text: string): string {
  return stripAccents(text.toLowerCase().replace(/’/g, "'"))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Los slugs que Squarespace pudo dar a un nombre: sin acentos, y con la ñ quitada o como n. */
export function slugVariants(name: string): string[] {
  const variants = ['', 'n'].map((replacement) =>
    stripAccents(name.toLowerCase().replace(/ñ/g, replacement))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  )
  return [...new Set(variants)].filter(Boolean)
}

/** El título sin el prefijo de tipo de Torre («Logro:», «Misión:»…). */
const cleanTitle = (title: string) =>
  title.trim().replace(/^(logro|misi[oó]n|metalogro|aprendizaje|formaci[oó]n)\s*:\s*/i, '')

export interface QuestRef {
  dofusId: number
  name: string
}

export interface QuestMatch {
  questIds: number[]
  ambiguous: boolean
}

/** El cruce de una página con las misiones de DofusDB: por su slug y por sus títulos. */
export function questMatcher(quests: QuestRef[]) {
  const bySlug = new Map<string, Set<number>>()
  const byName = new Map<string, Set<number>>()
  const add = (index: Map<string, Set<number>>, key: string, id: number) => {
    if (!key) return
    index.set(key, (index.get(key) ?? new Set()).add(id))
  }
  for (const { dofusId, name } of quests) {
    for (const slug of slugVariants(name)) add(bySlug, slug, dofusId)
    add(byName, normalizeName(name), dofusId)
  }
  return (slug: string, titles: string[]): QuestMatch => {
    const ids = new Set<number>()
    for (const key of new Set([slug, slug.replace(/-\d+$/, '')])) {
      for (const id of bySlug.get(key) ?? []) ids.add(id)
    }
    for (const title of titles.flatMap((title) => [title, cleanTitle(title)])) {
      for (const id of byName.get(normalizeName(title)) ?? []) ids.add(id)
    }
    const questIds = [...ids].sort((a, b) => a - b)
    return { questIds, ambiguous: questIds.length > 1 }
  }
}

const MARKERS = [/prerrequisito/, /necesitaras/, /recompensa/]
const COORDINATES = /\[\s*-?\d+\s*,\s*-?\d+\s*\]/

/**
 * Si el texto de una página es el de una guía de misión, como la clasificaba el inventario: dos
 * de las tres etiquetas del resumen, o Prerrequisitos con coordenadas.
 */
export function looksLikeQuestGuide(text: string): boolean {
  const plain = stripAccents(text.toLowerCase())
  const markers = MARKERS.filter((marker) => marker.test(plain)).length
  return markers >= 2 || (MARKERS[0]!.test(plain) && COORDINATES.test(plain))
}

/**
 * Las páginas de Torre que nunca son guías de misión, aunque su texto lo parezca: checklists,
 * sus páginas de datos, metalogros y logros.
 */
export function neverQuestGuide(slug: string): boolean {
  return /^(checklist|metalogro|logro-)/.test(slug) || slug.endsWith('-datos')
}
