import { useId } from 'react'

import type { GuideBlock } from '@/lib/guides/page'
import { guideStrings } from '@/lib/guides/strings'
import type { TableAlign } from '@/lib/guides/table'

import './game.css'

type TableBlock = Extract<GuideBlock, { kind: 'table' }>

/** La clase de la alineación de una columna; a la izquierda, ninguna. */
const alignClass = (align: TableAlign) => (align === 'start' ? undefined : `gtable__${align}`)

/**
 * Una tabla de Torre (DESIGN.md, Table block): una <table> con sus <th>, en el servidor. La
 * caja lleva el título arriba, fijo, y debajo la región con nombre que se desplaza de lado
 * cuando la tabla no cabe (en el móvil) y que se enfoca para desplazarla con el teclado.
 */
export function GuideTable({ table }: { table: TableBlock }) {
  const titleId = useId()
  const { title, rowHeaders, columns, rows } = table
  // El título nombra la región y la tabla; se oculta a los lectores de pantalla para que no
  // lo lean una vez más como texto suelto.
  const name = title
    ? { 'aria-labelledby': titleId }
    : { 'aria-label': guideStrings.table.regionLabel(columns.map(({ header }) => header)) }

  return (
    <div className="gtable">
      {title && (
        <div className="gtable__title" id={titleId} aria-hidden="true">
          {title}
        </div>
      )}
      {/* Se desplaza con el teclado: sin tabIndex, una tabla ancha no se lee entera sin ratón. */}
      <div className="gtable__scroll" role="region" tabIndex={0} {...name}>
        <table
          className={rowHeaders ? 'gtable__table gtable__table--rows' : 'gtable__table'}
          aria-labelledby={title ? titleId : undefined}
        >
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
    </div>
  )
}
