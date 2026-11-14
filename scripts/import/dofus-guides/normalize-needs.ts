// Reparte las filas de Necesitarás de una guía de Dofus en los grupos fijos
// (src/lib/dofus-guides/need-groups.ts), con datos y sin adivinar:
// - un objeto, por su supertipo en DofusDB (recursos, equipables, consumibles);
// - una nota bajo un título de Torre que ya es un grupo («Combates»), en ese grupo;
// - si no, un logro, una mazmorra, un combate o un oficio por su nombre en los datos del juego;
// - lo demás, a «Otros», y la importación lo lista.
// Las filas conservan el orden de Torre dentro de cada grupo. Código puro.
import { dungeonMatches, type DungeonNames } from '@/lib/achievements/dungeons'
import {
  headingGroup,
  NEED_GROUPS,
  itemGroup,
  type NeedGroup,
} from '@/lib/dofus-guides/need-groups'
import { needNote } from '@/lib/guides/need-notes'

import { fold } from './fold'

/** Una fila de Necesitarás tal como sale de la página de Torre, antes de repartirla. */
export interface NeedEntry {
  /** El texto plano de la fila, para clasificarla y para el informe. */
  text: string
  /** Los títulos de Torre sobre la fila, del más cercano al más lejano; null si no hay. */
  headings: (string | null)[]
  /** El bloque que se guarda en la guía. */
  block: Record<string, unknown>
  /** El supertipo en DofusDB, si la fila es un objeto del juego. */
  superTypeId?: number | null
  /**
   * El subtítulo de Torre bajo el que va la fila («Dependiendo de tu nivel», «1 x Mazmorra»):
   * las filas seguidas con el mismo subtítulo van juntas, en un mismo grupo, con él encima.
   */
  unit?: string
}

export type PlacementReason =
  | 'tipo de objeto'
  | 'título'
  | 'logro'
  | 'mazmorra'
  | 'combate'
  | 'monstruo'
  | 'oficio'
  | 'subtítulo'
  | 'sin clasificar'

/** A dónde va una fila, desde qué título de Torre y por qué. */
export interface Placement {
  text: string
  from: string | null
  to: NeedGroup
  reason: PlacementReason
}

export interface NeedClassifiers {
  achievement: (text: string) => boolean
  dungeon: (text: string) => boolean
  fight: (text: string) => 'combate' | 'monstruo' | null
  job: (text: string) => boolean
}

/** El texto de una nota sin cantidad («1 x»), sin punto final y sin paréntesis. */
const labelOf = (text: string) =>
  needNote(text.trim())
    .label.replace(/\([^)]*\)/gu, ' ')
    .replace(/[.:]\s*$/u, '')
    .trim()

/**
 * El nombre del logro de una fila «Logro: “Cazamonturas”.», para buscarlo en DofusDB; null si
 * la fila no empieza por «Logro:».
 */
export function achievementName(text: string): string | null {
  const match = /^logro\s*:\s*(.+)$/iu.exec(labelOf(text))
  return match ? match[1]!.replace(/^[“”"«»'\s]+|[“”"«»'\s.]+$/gu, '') || null : null
}

/** Los clasificadores de las notas, a partir de los datos del juego que hay en la base. */
export function needClassifiers(data: {
  dungeons: DungeonNames[]
  monsters: string[]
  achievements: string[]
  jobs: string[]
}): NeedClassifiers {
  const matchDungeon = dungeonMatches(data.dungeons)
  const monsters = new Set(data.monsters.map(fold))
  const achievements = new Set(data.achievements.map(fold))
  const jobs = data.jobs.map(fold).filter(Boolean)
  /** Cómo casa con una mazmorra: por su nombre, por un jefe o nada. */
  const dungeonVia = (label: string) => {
    const found = matchDungeon(label)
    return found.how === 'none' ? null : found.how
  }
  return {
    achievement: (text) => achievements.has(fold(labelOf(text).replace(/^logro\s*:\s*/iu, ''))),
    // Lo que dice «Mazmorra» o «Llave» («1 x Mazmorra Le chuko», «1 x Llave del Ring
    // Eskarlata»), o el nombre de una mazmorra de DofusDB («Antro del Dragocerdo»). El nombre
    // de un jefe solo es un combate.
    dungeon: (text) => {
      const label = labelOf(text)
      return /^(mazmorras?|llaves?)\b/iu.test(label) || dungeonVia(label) === 'name'
    },
    // La misma palabra que pinta el icono de combate en la página; o un monstruo o un jefe de
    // mazmorra por su nombre.
    fight: (text) => {
      if (needNote(text.trim()).combat) return 'combate'
      const label = labelOf(text)
      return monsters.has(fold(label)) || dungeonVia(label) === 'boss' ? 'monstruo' : null
    },
    // La palabra «oficio» o un oficio de DofusDB entero, en la fila sin su paréntesis.
    job: (text) => {
      const label = ` ${fold(labelOf(text))} `
      return / oficios? /.test(label) || jobs.some((job) => label.includes(` ${job} `))
    },
  }
}

/** El grupo de una fila y por qué. */
function place(entry: NeedEntry, classify: NeedClassifiers): Omit<Placement, 'text' | 'from'> {
  const heading = entry.headings.map(headingGroup).find((group) => group !== null) ?? null
  if (entry.block.blockType === 'needItem') {
    const byType = itemGroup(entry.superTypeId)
    if (byType) return { to: byType, reason: 'tipo de objeto' }
    if (heading && heading !== 'otros') return { to: heading, reason: 'título' }
    return { to: 'otros', reason: 'sin clasificar' }
  }
  if (heading && heading !== 'otros') return { to: heading, reason: 'título' }
  if (classify.achievement(entry.text)) return { to: 'logros', reason: 'logro' }
  if (classify.dungeon(entry.text)) return { to: 'mazmorras', reason: 'mazmorra' }
  const fight = classify.fight(entry.text)
  if (fight) return { to: 'combates', reason: fight }
  if (classify.job(entry.text)) return { to: 'oficios', reason: 'oficio' }
  return { to: 'otros', reason: 'sin clasificar' }
}

/** Un grupo de Necesitarás: el grupo fijo, el subtítulo de Torre si lo hay y sus filas. */
export interface NormalizedGroup {
  name: NeedGroup
  subtitle?: string
  rows: Record<string, unknown>[]
}

/** Un subtítulo cuyas filas no van todas al mismo grupo. */
export interface MixedUnit {
  subtitle: string
  groups: NeedGroup[]
}

/**
 * Las filas en los grupos fijos y a dónde fue cada una. Las filas de un subtítulo de Torre
 * van juntas, al grupo de más de la mitad de ellas, o a «Otros» si no hay mayoría; se avisa de
 * las que no iban todas al mismo. En cada grupo, las filas sueltas y cada subtítulo, en el
 * orden de Torre.
 */
export function normalizeNeeds(
  entries: NeedEntry[],
  classify: NeedClassifiers,
): {
  groups: NormalizedGroup[]
  /** Los mismos grupos con el texto de cada fila, para el informe. */
  outline: { name: NeedGroup; subtitle?: string; rows: string[] }[]
  placements: Placement[]
  mixed: MixedUnit[]
} {
  const placed = entries.map((entry) => place(entry, classify))
  const mixed: MixedUnit[] = []
  for (let start = 0; start < entries.length;) {
    const unit = entries[start]!.unit
    let end = start + 1
    while (end < entries.length && unit !== undefined && entries[end]!.unit === unit) end += 1
    if (unit !== undefined) {
      const run = placed.slice(start, end)
      const counts = new Map<NeedGroup, number>()
      for (const { to } of run) counts.set(to, (counts.get(to) ?? 0) + 1)
      const [top] = [...counts].sort(([, a], [, b]) => b - a)
      const to = top![1] * 2 > run.length ? top![0] : 'otros'
      if (counts.size > 1) {
        const groups = NEED_GROUPS.filter((group) => counts.has(group))
        mixed.push({ subtitle: unit, groups })
      }
      for (let index = start; index < end; index += 1) {
        if (placed[index]!.to !== to) placed[index] = { to, reason: 'subtítulo' }
      }
    }
    start = end
  }

  const byName = new Map<NeedGroup, Map<string, NormalizedGroup & { texts: string[] }>>()
  const placements = entries.map((entry, index): Placement => {
    const { to, reason } = placed[index]!
    const parts = byName.get(to) ?? new Map<string, NormalizedGroup & { texts: string[] }>()
    byName.set(to, parts)
    const key = entry.unit ?? ''
    const part = parts.get(key) ?? {
      name: to,
      ...(entry.unit && { subtitle: entry.unit }),
      rows: [],
      texts: [],
    }
    parts.set(key, part)
    part.rows.push(entry.block)
    part.texts.push(entry.text)
    return { text: entry.text, from: entry.headings.find(Boolean) ?? null, to, reason }
  })
  const parts = NEED_GROUPS.flatMap((name) => [...(byName.get(name)?.values() ?? [])])
  const groups = parts.map(({ texts: _texts, ...group }) => group)
  const outline = parts.map(({ rows: _rows, texts, ...group }) => ({ ...group, rows: texts }))
  return { groups, outline, placements, mixed }
}
