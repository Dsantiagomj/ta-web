// El bloque Tabla del cuerpo de las guías y las páginas (DESIGN.md, Table block): lo que se
// comprueba al guardar y cómo pasa de lo guardado a lo que pinta la página. Código puro.

import { guideStrings } from './strings'
import type { TableAlign } from './table-paste'

export type { TableAlign } from './table-paste'

type Cell = { text?: string | null }
type Row = { cells?: Cell[] | null }
type Column = { header?: string | null; align?: TableAlign | null }

/** El bloque Tabla como lo guarda Payload. */
export interface TableBlockDoc {
  blockType: 'table'
  id?: string | null
  title?: string | null
  rowHeaders?: boolean | null
  columns?: Column[] | null
  rows?: Row[] | null
}

/** La tabla lista para su componente (GuideTable). */
export interface TableView {
  title?: string
  rowHeaders: boolean
  columns: { header: string; align: TableAlign }[]
  /** Cada fila con una celda por columna. */
  rows: string[][]
}

const ALIGNS = new Set<TableAlign>(['start', 'center', 'end'])

/**
 * Las filas no pueden tener más celdas que columnas: la que sobra no tendría encabezado.
 * En el formulario Payload pasa como valor el número de filas, así que se leen del bloque.
 */
export function validateTableRows(
  value: unknown,
  { siblingData }: { siblingData?: { columns?: unknown; rows?: unknown } },
): true | string {
  const rows = Array.isArray(siblingData?.rows)
    ? (siblingData.rows as Row[])
    : Array.isArray(value)
      ? (value as Row[])
      : []
  const columns = Array.isArray(siblingData?.columns) ? siblingData.columns.length : 0
  const index = rows.findIndex((row) => (row?.cells?.length ?? 0) > columns)
  if (index < 0) return true
  return guideStrings.admin.table.tooManyCells(index + 1, rows[index]!.cells!.length, columns)
}

/** La tabla guardada como la pinta la página; sin columnas o sin filas, nada. */
export function tableView(block: TableBlockDoc): TableView | null {
  const columns = (block.columns ?? []).map((column) => ({
    header: column.header?.trim() ?? '',
    align: column.align && ALIGNS.has(column.align) ? column.align : ('start' as const),
  }))
  const rows = (block.rows ?? []).map((row) =>
    columns.map((_, index) => row.cells?.[index]?.text?.trim() ?? ''),
  )
  if (columns.length === 0 || rows.length === 0) return null
  const title = block.title?.trim()
  return { ...(title && { title }), rowHeaders: Boolean(block.rowHeaders), columns, rows }
}
