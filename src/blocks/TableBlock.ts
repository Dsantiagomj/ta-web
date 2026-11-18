import type { ArrayFieldValidation, Block } from 'payload'
import { array } from 'payload/shared'

import { rowLabel } from '../collections/row-label'
import { blockImages } from '../lib/admin/block-thumbnails'
import { guideStrings } from '../lib/guides/strings'
import { validateTableRows } from '../lib/guides/table'

const s = guideStrings.admin.table

/** Ninguna fila con más celdas que columnas; luego, lo de siempre (minRows, required). */
const validateRows: ArrayFieldValidation = (value, options) => {
  const cells = validateTableRows(value, options)
  return cells === true ? array(value, options) : cells
}

// Una tabla de Torre (DESIGN.md, Table block): las columnas con su encabezado y su
// alineación, y las filas con una celda de texto por columna. Para no escribir 146 filas a
// mano, «Pegar desde una hoja de cálculo» las rellena en el formulario desde lo copiado en
// Google Sheets o Excel (src/components/admin/TablePaste.tsx); ese recuadro no se guarda.
export const TableBlock: Block = {
  slug: 'table',
  interfaceName: 'TableBlock',
  admin: { images: blockImages('table') },
  labels: { singular: s.singular, plural: s.plural },
  fields: [
    {
      name: 'title',
      label: s.title,
      type: 'text',
      localized: true,
      admin: { description: s.titleDescription },
    },
    {
      name: 'paste',
      label: s.paste,
      type: 'ui',
      admin: { components: { Field: '/components/admin/TablePaste#TablePaste' } },
    },
    {
      name: 'rowHeaders',
      label: s.rowHeaders,
      type: 'checkbox',
      defaultValue: false,
      admin: { description: s.rowHeadersDescription },
    },
    {
      name: 'columns',
      label: s.columns,
      labels: { singular: s.column, plural: s.columns },
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: s.alignDescription,
        components: rowLabel('TextRowLabel', { singular: s.column, field: 'header' }),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'header',
              label: s.header,
              type: 'text',
              required: true,
              localized: true,
              admin: { width: '60%' },
            },
            {
              name: 'align',
              label: s.align,
              type: 'select',
              required: true,
              defaultValue: 'start',
              options: (['start', 'center', 'end'] as const).map((value) => ({
                label: s.alignOptions[value],
                value,
              })),
              admin: { width: '40%' },
            },
          ],
        },
      ],
    },
    {
      name: 'rows',
      label: s.rows,
      labels: { singular: s.row, plural: s.rows },
      type: 'array',
      required: true,
      minRows: 1,
      validate: validateRows,
      admin: { initCollapsed: true, components: rowLabel('TableRowLabel') },
      fields: [
        {
          name: 'cells',
          label: s.cells,
          labels: { singular: s.cell, plural: s.cells },
          type: 'array',
          admin: {
            description: s.cellsDescription,
            components: rowLabel('TextRowLabel', { singular: s.cell, field: 'text' }),
          },
          fields: [{ name: 'text', label: s.cellText, type: 'text', localized: true }],
        },
      ],
    },
  ],
}
