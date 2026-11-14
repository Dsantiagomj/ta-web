// El informe de las notas de mazmorra en texto (dungeon-report.ts), para `pnpm data:quests`
// y `pnpm data:dungeon-notes`: el recuento, y cada nota una vez, con sus páginas, agrupada
// por cómo casó (por nombre, por jefe, a mano o nada). Código puro.
import type { DungeonNoteReport, DungeonRow } from './dungeon-report'
import type { NoteMatch } from './dungeons'

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

export function dungeonReportLines(report: DungeonNoteReport): string[] {
  const lines = [
    `Filas de mazmorra en las páginas de logro publicadas: ${report.withBoss.length} con su ` +
      `jefe (${report.manual.length} elegidas a mano en el panel) y ${report.generic.length} ` +
      `con el icono genérico.`,
  ]
  // Una nota por texto, con todas sus páginas y si la página pinta su jefe.
  const notes = new Map<string, { row: DungeonRow; pages: string[]; shown: boolean }>()
  const add = (row: DungeonRow, shown: boolean) => {
    const seen = notes.get(row.label)
    if (seen) seen.pages.push(row.page)
    else notes.set(row.label, { row, pages: [row.page], shown })
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
