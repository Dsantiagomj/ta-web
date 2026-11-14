// Reparte las filas de Necesitarás de una guía de Dofus en los grupos fijos
// (src/lib/dofus-guides/need-groups.ts), con datos y sin adivinar:
// - un objeto, por su supertipo en DofusDB (recursos, equipables, consumibles);
// - una nota bajo un título de Torre que ya es un grupo («Combates»), en ese grupo;
// - si no, un logro, una mazmorra, un combate o un oficio por su nombre en los datos del juego;
// - lo demás, a «Otros», y la importación lo lista.
// Las filas conservan el orden de Torre dentro de cada grupo. Código puro.
import { dungeonMatcher, type DungeonNames } from '@/lib/achievements/dungeons'
import {
  byNeedGroup,
  headingGroup,
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
  /** Un subtítulo de Torre («Dependiendo de tu nivel:»): va en el grupo de la fila siguiente. */
  leads?: boolean
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
  const matchDungeon = dungeonMatcher(data.dungeons)
  const monsters = new Set(data.monsters.map(fold))
  const achievements = new Set(data.achievements.map(fold))
  const jobs = new Set(data.jobs.map(fold))
  return {
    achievement: (text) => achievements.has(fold(labelOf(text).replace(/^logro\s*:\s*/iu, ''))),
    // «1 x Mazmorra Le chuko», o una mazmorra de DofusDB por su nombre («Antro del
    // Dragocerdo»). Una llave nombra una mazmorra pero es un objeto: no es una mazmorra.
    dungeon: (text) => {
      const label = labelOf(text)
      if (/^llaves?\b/iu.test(label)) return false
      return /^mazmorras?\b/iu.test(label) || matchDungeon(label) !== null
    },
    // La misma palabra que pinta el icono de combate en la página; o un monstruo por su nombre.
    fight: (text) => {
      if (needNote(text.trim()).combat) return 'combate'
      return monsters.has(fold(labelOf(text))) ? 'monstruo' : null
    },
    job: (text) => {
      const words = fold(text).split(' ')
      return words.some((word) => /^oficios?$/.test(word) || jobs.has(word))
    },
  }
}

/** El grupo de una fila y por qué; un subtítulo se decide después, con la fila siguiente. */
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

/** Las filas en los grupos fijos, en su orden, y a dónde fue cada una. */
export function normalizeNeeds(
  entries: NeedEntry[],
  classify: NeedClassifiers,
): { groups: { name: NeedGroup; rows: Record<string, unknown>[] }[]; placements: Placement[] } {
  const placed = entries.map((entry) => (entry.leads ? null : place(entry, classify)))
  // Un subtítulo va con la primera fila que no es subtítulo después de él.
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    if (placed[index]) continue
    const next = placed.slice(index + 1).find(Boolean)
    placed[index] = { to: next?.to ?? 'otros', reason: 'subtítulo' }
  }
  const byGroup = new Map<NeedGroup, Record<string, unknown>[]>()
  const placements = entries.map((entry, index): Placement => {
    const { to, reason } = placed[index]!
    byGroup.set(to, [...(byGroup.get(to) ?? []), entry.block])
    return { text: entry.text, from: entry.headings.find(Boolean) ?? null, to, reason }
  })
  const groups = [...byGroup].map(([name, rows]) => ({ name, rows })).sort(byNeedGroup)
  return { groups, placements }
}
