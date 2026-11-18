// Lo que Torre pega en «Pegar desde una hoja de cálculo» del bloque Tabla (DESIGN.md, Table
// block): las celdas copiadas de Google Sheets, Excel o una tabla de otra web llegan como
// texto, una fila por línea y un tabulador entre celdas. Código puro: lo usa el botón del
// panel, en el navegador, antes de guardar.

import { guideStrings } from './strings'

/** Dónde va el texto de una columna: a la izquierda, centrado o a la derecha (cifras). */
export type TableAlign = 'start' | 'center' | 'end'

export interface PastedTable {
  columns: { header: string; align: TableAlign }[]
  /** Cada fila con tantas celdas como columnas, las que faltaban vacías. */
  rows: string[][]
}

/**
 * Una cifra, sola: «12», «-3», «1 200», «1.500,5», «15 %» o un rango «1-20». Lo que lleva
 * una palabra («+80 Vitalidad», «12 PA») es texto.
 */
export function isNumericCell(value: string): boolean {
  const number = String.raw`[-+−]?\d[\d.,   ]*`
  return new RegExp(`^${number}(\\s*%|\\s*[-–]\\s*${number})?$`).test(value.trim())
}

/**
 * Parte el texto en filas y celdas como lo copian las hojas de cálculo: tabuladores entre
 * celdas y saltos entre filas. Una celda entre comillas puede llevar saltos, tabuladores y
 * comillas dobladas («""»); el salto queda como un espacio, porque una celda es una línea.
 */
function splitCells(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let i = 0
  const source = text.replace(/\r\n?/g, '\n')
  while (i < source.length) {
    const char = source[i]!
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i += 2
        continue
      }
      if (char === '"') quoted = false
      else cell += char
      i += 1
      continue
    }
    if (char === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (char === '\t') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      lines.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
    i += 1
  }
  row.push(cell)
  lines.push(row)
  return lines.map((cells) => cells.map((value) => value.replace(/\s+/g, ' ').trim()))
}

/**
 * La tabla del texto pegado: la primera fila son los encabezados y el resto, las filas.
 * Quita las filas vacías y las columnas vacías del final; un encabezado vacío se llama
 * «Columna N» para que Torre lo vea y lo cambie. Una columna en la que todo lo escrito son
 * cifras va a la derecha. Sin al menos una fila de datos, null.
 */
export function parseSpreadsheet(text: string): PastedTable | null {
  const lines = splitCells(text).filter((cells) => cells.some(Boolean))
  if (lines.length < 2) return null

  let width = Math.max(...lines.map((cells) => cells.length))
  while (width > 1 && lines.every((cells) => !cells[width - 1])) width -= 1

  const [head, ...body] = lines.map((cells) =>
    Array.from({ length: width }, (_, index) => cells[index] ?? ''),
  )
  const columns = head!.map((header, index) => {
    const values = body.map((cells) => cells[index]!).filter(Boolean)
    const numeric = values.length > 0 && values.every(isNumericCell)
    return {
      header: header || guideStrings.admin.table.columnFallback(index + 1),
      align: (numeric ? 'end' : 'start') as TableAlign,
    }
  })
  return { columns, rows: body }
}
