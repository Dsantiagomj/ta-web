import { Fragment } from 'react'

import './ui.css'

/**
 * Una cifra con los miles separados por un espacio fino que no se parte (U+202F): «1 272»,
 * nunca «1.272» ni partido en dos líneas (DESIGN.md, Typography: Numbers). Montserrat y
 * Lilita One no tienen ese carácter, así que va en su propio span, que le da su ancho.
 */
export function Amount({ value }: { value: number }) {
  const groups = String(value).split(/(?=(?:\d{3})+$)/)
  return (
    <span className="amount">
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="amount__th">{' '}</span>}
          {group}
        </Fragment>
      ))}
    </span>
  )
}
