// El informe de las notas de mazmorra en texto (dungeon-report.ts), para `pnpm data:quests`
// y `pnpm data:dungeon-notes`: el recuento de cada tipo de página (logros, guías de Dofus y
// guías de misión), y cada nota una vez, con sus páginas, agrupada por cómo casó (por
// nombre, por jefe, a mano o nada). Código puro.
import { needKey } from '@/lib/guides/need-notes'

import type { DungeonNoteReport, DungeonRow } from './dungeon-report'
import type { NoteMatch } from '@/lib/guides/dungeons'

type How = NoteMatch['how']

const GROUPS: { how: How; title: string }[] = [
  { how: 'name', title: 'Por nombre' },
  { how: 'boss', title: 'Por jefe' },
  { how: 'manual', title: 'A mano en el panel' },
  { how: 'none', title: 'Sin mazmorra, icono genérico' },
]

/** «A y B», «A, B y C». */
function list(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}

function describe(label: string, match: NoteMatch, shown: boolean): string {
  if (match.how === 'none') {
    const doubt = match.candidates?.length ? `: duda entre ${list(match.candidates)}` : ''
    return `«${label}»${doubt}`
  }
  const parts = [match.dungeon]
  if (match.how !== 'manual') {
    if (match.boss) parts.push(`por ${match.boss}`)
    if (match.approximate) parts.push('nombre parecido')
  }
  const missing = shown ? '' : '; su jefe no tiene imagen: icono genérico'
  return `«${label}» → ${parts.join(', ')}${missing}`
}

const SOURCES: { source: DungeonRow['source']; title: string; picks: boolean }[] = [
  { source: 'achievement', title: 'las páginas de logro publicadas', picks: true },
  // Las guías de Dofus no tienen mazmorras elegidas a mano.
  { source: 'dofus', title: 'las guías de Dofus publicadas', picks: false },
  { source: 'quest', title: 'las guías de misión publicadas', picks: true },
]

export function dungeonReportLines(report: DungeonNoteReport): string[] {
  const rows = [...report.withBoss, ...report.generic]
  const lines = SOURCES.map(({ source, title, picks }) => {
    const count = (list: DungeonRow[]) => list.filter((row) => row.source === source).length
    // Las elegidas a mano, con imagen o sin ella: las mismas que lista su grupo.
    const manual = rows.filter((row) => row.source === source && row.match.how === 'manual')
    const tail = picks ? `; ${manual.length} con la mazmorra elegida a mano en el panel` : ''
    return (
      `Filas de mazmorra en ${title}: ${count(report.withBoss)} con su jefe y ` +
      `${count(report.generic)} con el icono genérico${tail}.`
    )
  })
  // Una nota por su clave (needKey) y por cómo casó, con todas sus páginas y si la página
  // pinta su jefe: la misma nota casa distinto en una guía que eligió su mazmorra a mano. Se
  // muestra como la escribió la primera página; los slugs son únicos entre colecciones.
  const notes = new Map<string, { row: DungeonRow; pages: string[]; shown: boolean }>()
  const add = (row: DungeonRow, shown: boolean) => {
    const { how } = row.match
    const dungeon = how === 'none' ? '' : row.match.dungeon
    const key = JSON.stringify([needKey(row.label), how, dungeon])
    const seen = notes.get(key)
    if (seen) seen.pages.push(row.page)
    else notes.set(key, { row, pages: [row.page], shown })
  }
  for (const row of report.withBoss) add(row, true)
  for (const row of report.generic) add(row, false)
  for (const { how, title } of GROUPS) {
    const group = [...notes.values()].filter(({ row }) => row.match.how === how)
    if (group.length === 0) continue
    lines.push(`${title} (${group.length} ${group.length === 1 ? 'nota' : 'notas'}):`)
    for (const { row, pages, shown } of group)
      lines.push(`  ${describe(row.label, row.match, shown)} (${pages.join(', ')})`)
  }
  return lines
}
