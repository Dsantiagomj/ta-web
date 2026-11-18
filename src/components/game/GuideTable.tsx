import { useId } from 'react'

import type { GuideBlock } from '@/lib/guides/page'
import { guideStrings } from '@/lib/guides/strings'
import type { TableAlign } from '@/lib/guides/table'

import './game.css'

type TableBlock = Extract<GuideBlock, { kind: 'table' }>

/** La clase de la alineación de una columna; a la izquierda, ninguna. */
const alignClass = (align: TableAlign) => (align === 'start' ? undefined : `gtable__${align}`)

/**
 * Una tabla de Torre (DESIGN.md, Table block): una <table> con su <caption> y sus <th>, en el
 * servidor. Va dentro de una región con nombre que se desplaza de lado cuando la tabla no
 * cabe (en el móvil), y que se enfoca con el teclado para desplazarla sin ratón.
 */
export function GuideTable({ table }: { table: TableBlock }) {
  const captionId = useId()
  const { title, rowHeaders, columns, rows } = table
  const name = title
    ? { 'aria-labelledby': captionId }
    : { 'aria-label': guideStrings.table.regionLabel(columns.map(({ header }) => header)) }

  return (
    // Se desplaza con el teclado: sin tabIndex, una tabla ancha no se lee entera sin ratón.
    <div className="gtable" role="region" tabIndex={0} {...name}>
      <table className={rowHeaders ? 'gtable__table gtable__table--rows' : 'gtable__table'}>
        {title && <caption id={captionId}>{title}</caption>}
        <thead>
          <tr>
            {columns.map(({ header, align }, index) => (
              <th key={index} scope="col" className={alignClass(align)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((text, index) => {
                const className = alignClass(columns[index]!.align)
                return rowHeaders && index === 0 ? (
                  <th key={index} scope="row" className={className}>
                    {text}
                  </th>
                ) : (
                  <td key={index} className={className}>
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
