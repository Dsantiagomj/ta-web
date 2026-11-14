import { describe, expect, it } from 'vitest'

import { dungeonReportLines } from '@/lib/achievements/dungeon-report-lines'
import type { DungeonNoteReport, DungeonRow } from '@/lib/achievements/dungeon-report'

// Lo que imprime `pnpm data:quests` (y `pnpm data:dungeon-notes`) de cada nota de mazmorra:
// a qué mazmorra va y cómo casó, para que Torre vea qué falta escribir o elegir a mano.

const row = (page: string, label: string, match: DungeonRow['match']): DungeonRow => ({
  page,
  label,
  match,
})

const kumijo = row('logro-a', 'Mazmorra Kumijo', {
  how: 'boss',
  dungeon: 'Casa de los Espíritus',
  boss: 'Kumijo',
  approximate: false,
})
const ripata = (page: string) =>
  row(page, 'Mazmorra Ben Ripata', {
    how: 'boss',
    dungeon: 'Restos del Roca Negra',
    boss: 'Ben el Ripata',
    approximate: false,
  })
const ring = row('logro-b', 'Mazmorra Ring Eskarlata', {
  how: 'name',
  dungeon: 'Ring del Capitán Eskarlata',
  approximate: true,
})
const anerice = row('logro-b', 'Mazmorra Anerice la bebesita', {
  how: 'boss',
  dungeon: 'Mansión de Kuatropatas',
  boss: "Anerice la Fab'huquesa",
  approximate: true,
})
const kodamade = row('logro-a', 'Mazmorra Kodámade', {
  how: 'name',
  dungeon: 'Bambusería de Kodámade',
  approximate: false,
})
const manual = row('logro-c', 'Mazmorra de Torre', { how: 'manual', dungeon: 'Antro del Cil' })
// Casa, pero su jefe no tiene imagen en Media: la página le pone el icono genérico.
const grunob = row('logro-c', 'Mazmorra de Grunob', {
  how: 'boss',
  dungeon: 'Akademia de los Goblins',
  boss: 'Director Grunob',
  approximate: false,
})
const generic = row('logro-c', 'Mazmorras nivel 200', { how: 'none' })
const doubt = row('logro-a', 'Mazmorra Blop Real', {
  how: 'none',
  candidates: ['Enclave de los Blops', 'Antro del Blop Multicolor Real'],
})

const REPORT: DungeonNoteReport = {
  withBoss: [kumijo, ripata('logro-a'), ripata('logro-b'), ring, anerice, kodamade, manual],
  manual: [manual],
  generic: [grunob, generic, doubt],
}

describe('dungeonReportLines', () => {
  it('cada nota una vez, con sus páginas, agrupada por cómo casó', () => {
    expect(dungeonReportLines(REPORT)).toEqual([
      'Filas de mazmorra en las páginas de logro publicadas: 7 con su jefe (1 elegidas a mano ' +
        'en el panel) y 3 con el icono genérico.',
      'Por nombre (2 notas):',
      '  «Mazmorra Ring Eskarlata» → Ring del Capitán Eskarlata, nombre parecido (logro-b)',
      '  «Mazmorra Kodámade» → Bambusería de Kodámade (logro-a)',
      'Por jefe (4 notas):',
      '  «Mazmorra Kumijo» → Casa de los Espíritus, por Kumijo (logro-a)',
      '  «Mazmorra Ben Ripata» → Restos del Roca Negra, por Ben el Ripata (logro-a, logro-b)',
      "  «Mazmorra Anerice la bebesita» → Mansión de Kuatropatas, por Anerice la Fab'huquesa, " +
        'nombre parecido (logro-b)',
      '  «Mazmorra de Grunob» → Akademia de los Goblins, por Director Grunob; su jefe no tiene ' +
        'imagen: icono genérico (logro-c)',
      'A mano en el panel (1 nota):',
      '  «Mazmorra de Torre» → Antro del Cil (logro-c)',
      'Sin mazmorra, icono genérico (2 notas):',
      '  «Mazmorras nivel 200» (logro-c)',
      '  «Mazmorra Blop Real»: duda entre Enclave de los Blops y Antro del Blop Multicolor ' +
        'Real (logro-a)',
    ])
  })

  it('sin filas, solo el recuento', () => {
    expect(dungeonReportLines({ withBoss: [], manual: [], generic: [] })).toEqual([
      'Filas de mazmorra en las páginas de logro publicadas: 0 con su jefe (0 elegidas a mano ' +
        'en el panel) y 0 con el icono genérico.',
    ])
  })
})
