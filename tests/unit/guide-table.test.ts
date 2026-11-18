import { describe, expect, it } from 'vitest'

import { tableRowLabel } from '@/lib/admin/row-labels'
import { guideContent } from '@/lib/guides/page'
import { validateTableRows } from '@/lib/guides/table'
import { isNumericCell, parseSpreadsheet } from '@/lib/guides/table-paste'

// El bloque Tabla (backlog D-02): lo que Torre pega desde una hoja de cálculo, lo que el panel
// le deja guardar y lo que la página recibe para pintar la tabla.

describe('parseSpreadsheet', () => {
  it('la primera fila son los encabezados; cada tabulador, una celda; cada línea, una fila', () => {
    const table = parseSpreadsheet('Familiar\tNivel\tBonus\nTofu\t12\t+80 Vitalidad\nBwak\t1\t')
    expect(table).toEqual({
      columns: [
        { header: 'Familiar', align: 'start' },
        { header: 'Nivel', align: 'end' },
        { header: 'Bonus', align: 'start' },
      ],
      rows: [
        ['Tofu', '12', '+80 Vitalidad'],
        ['Bwak', '1', ''],
      ],
    })
  })

  it('acepta los saltos de Windows y quita espacios, filas vacías y la línea final', () => {
    const table = parseSpreadsheet('  A \t B\r\n\r\n x\t y \r\n\r\n')
    expect(table?.columns.map(({ header }) => header)).toEqual(['A', 'B'])
    expect(table?.rows).toEqual([['x', 'y']])
  })

  it('rellena las filas cortas hasta el número de columnas y nombra un encabezado vacío', () => {
    const table = parseSpreadsheet('Nombre\t\tNotas\nUno\nDos\tb\tc\td')
    expect(table?.columns.map(({ header }) => header)).toEqual([
      'Nombre',
      'Columna 2',
      'Notas',
      'Columna 4',
    ])
    expect(table?.rows).toEqual([
      ['Uno', '', '', ''],
      ['Dos', 'b', 'c', 'd'],
    ])
  })

  it('quita las columnas vacías del final, que las hojas copian a veces', () => {
    const table = parseSpreadsheet('A\tB\t\t\nx\ty\t\t\n')
    expect(table?.columns.map(({ header }) => header)).toEqual(['A', 'B'])
    expect(table?.rows).toEqual([['x', 'y']])
  })

  it('lee las celdas entre comillas de Google Sheets y Excel, con saltos y comillas dentro', () => {
    const table = parseSpreadsheet('Nombre\tNota\n"Tofu\nnegro"\t"Dice ""hola"""\nBwak\tx')
    expect(table?.rows).toEqual([
      ['Tofu negro', 'Dice "hola"'],
      ['Bwak', 'x'],
    ])
  })

  it('sin texto, o con una sola fila de encabezados, no hay tabla', () => {
    expect(parseSpreadsheet('')).toBeNull()
    expect(parseSpreadsheet('  \n\t\n')).toBeNull()
    expect(parseSpreadsheet('A\tB\tC')).toBeNull()
  })

  it('alinea a la derecha la columna en la que todo lo escrito son cifras', () => {
    const table = parseSpreadsheet(
      'Nombre\tNivel\tPrecio\tProb.\tRango\tMezcla\n' +
        'a\t12\t1 200\t15%\t1-20\t3\n' +
        'b\t\t1.500,5\t2,5 %\t21–40\tmucho',
    )
    expect(table?.columns.map(({ align }) => align)).toEqual([
      'start',
      'end',
      'end',
      'end',
      'end',
      'start',
    ])
  })
})

describe('isNumericCell', () => {
  it.each(['12', '-3', '+80', '1 200', '1 272', '1.500,5', '15%', '2,5 %', '1-20', '21–40'])(
    '%s es una cifra',
    (value) => expect(isNumericCell(value)).toBe(true),
  )

  it.each(['', 'Tofu', '+80 Vitalidad', '12 PA', 'x2', '1 a 20'])('%s no lo es', (value) =>
    expect(isNumericCell(value)).toBe(false),
  )
})

describe('validateTableRows', () => {
  const columns = [{ header: 'A' }, { header: 'B' }]

  it('acepta filas con tantas celdas como columnas o menos', () => {
    const rows = [{ cells: [{ text: '1' }, { text: '2' }] }, { cells: [{ text: '3' }] }]
    expect(validateTableRows(rows, { siblingData: { columns, rows } })).toBe(true)
  })

  it('dice qué fila tiene más celdas que columnas', () => {
    const rows = [{ cells: [{ text: '1' }] }, { cells: [{ text: '1' }, { text: '2' }, {}] }]
    expect(validateTableRows(rows, { siblingData: { columns, rows } })).toBe(
      'La fila 2 tiene 3 celdas y la tabla 2 columnas: añade una columna o quita la celda que sobra.',
    )
  })

  it('en el formulario el valor es el número de filas: lee las filas de los datos del bloque', () => {
    const rows = [{ cells: [{ text: '1' }, { text: '2' }, { text: '3' }] }]
    expect(validateTableRows(1, { siblingData: { columns, rows } })).toMatch(/^La fila 1 tiene 3/)
  })

  it('sin filas, lo decide minRows', () => {
    expect(validateTableRows(undefined, { siblingData: { columns } })).toBe(true)
  })
})

describe('tableRowLabel', () => {
  it('nombra la fila por sus primeras celdas, separadas por un punto medio', () => {
    expect(
      tableRowLabel(
        { cells: [{ text: 'Tofu' }, { text: ' 12 ' }, { text: '' }, { text: 'x' }] },
        2,
      ),
    ).toBe('Fila 3: Tofu · 12 · x')
  })

  it('sin texto queda el número', () => {
    expect(tableRowLabel({ cells: [] }, 0)).toBe('Fila 1')
    expect(tableRowLabel(undefined, 4)).toBe('Fila 5')
  })
})

describe('guideContent con una tabla', () => {
  const guide = { title: 'Familiares', slug: 'familiares' }

  it('pasa el título, las columnas y las filas, rellenando las celdas que faltan', () => {
    const { intro } = guideContent({
      ...guide,
      body: [
        {
          blockType: 'table',
          id: 't',
          title: '  Familiares  ',
          rowHeaders: true,
          columns: [
            { header: 'Familiar', align: 'start' },
            { header: 'Nivel', align: 'end' },
            { header: 'Zona', align: null },
          ],
          rows: [
            { cells: [{ text: 'Tofu' }, { text: '12' }, { text: 'Astrub' }] },
            { cells: [{ text: 'Bwak ' }, { text: null }] },
          ],
        },
      ],
    })
    expect(intro).toEqual([
      {
        kind: 'table',
        key: 't',
        title: 'Familiares',
        rowHeaders: true,
        columns: [
          { header: 'Familiar', align: 'start' },
          { header: 'Nivel', align: 'end' },
          { header: 'Zona', align: 'start' },
        ],
        rows: [
          ['Tofu', '12', 'Astrub'],
          ['Bwak', '', ''],
        ],
      },
    ])
  })

  it('sin columnas o sin filas no pinta nada, y sin título no lleva título', () => {
    const empty = (columns: unknown[], rows: unknown[]) =>
      guideContent({
        ...guide,
        body: [{ blockType: 'table', id: 't', columns, rows } as never],
      }).intro
    expect(empty([], [{ cells: [{ text: 'a' }] }])).toEqual([])
    expect(empty([{ header: 'A' }], [])).toEqual([])
    expect(empty([{ header: 'A' }], [{ cells: [{ text: 'a' }] }])[0]).toEqual({
      kind: 'table',
      key: 't',
      rowHeaders: false,
      columns: [{ header: 'A', align: 'start' }],
      rows: [['a']],
    })
  })
})
