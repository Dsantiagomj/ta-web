'use client'

import { useAllFormFields, useForm } from '@payloadcms/ui'
import { useRef, useState, type KeyboardEvent } from 'react'

import { moveTo, outlineRows } from '@/lib/admin/step-outline'
import { panelStrings } from '@/lib/admin/strings'

const o = panelStrings.stepOutline

/**
 * El esquema de los pasos de una checklist (A-18): cada paso en una línea, con botones para
 * subirlo o bajarlo y, con el foco en él, Alt con las flechas (o con Inicio y Fin). Mueve las
 * filas del formulario, como el asa de arrastre: cada paso se lleva su identificador y nada
 * cambia hasta guardar.
 */
export function StepOutline() {
  const [fields] = useAllFormFields()
  const { moveFieldRow } = useForm()
  const [status, setStatus] = useState('')
  const list = useRef<HTMLOListElement>(null)
  const rows = outlineRows(fields)
  if (rows.length < 2) return null

  const move = (from: number, to: number) => {
    moveFieldRow({ path: 'steps', moveFromIndex: from, moveToIndex: to })
    setStatus(o.moved(from + 1, to + 1))
    // El paso sigue con el foco en su sitio nuevo, para seguir moviéndolo con el teclado.
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLElement>('li')[to]?.focus())
  }
  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget) return
    const target = moveTo(event, index, rows.length)
    if (target === null) return
    event.preventDefault()
    move(index, target)
  }

  return (
    <details className="ta-outline">
      <summary className="ta-outline__summary">{o.title(rows.length)}</summary>
      <p className="field-description">{o.help}</p>
      <ol className="ta-outline__list" ref={list}>
        {rows.map((row) => (
          <li
            key={row.stepId ?? `nuevo-${row.index}`}
            className="ta-outline__row"
            tabIndex={0}
            aria-label={row.label}
            onKeyDown={onKeyDown(row.index)}
          >
            <span className="ta-outline__label">{row.label}</span>
            <button
              type="button"
              className="btn btn--style-secondary btn--size-small ta-outline__button"
              aria-label={o.up(row.index + 1)}
              disabled={row.index === 0}
              onClick={() => move(row.index, row.index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--style-secondary btn--size-small ta-outline__button"
              aria-label={o.down(row.index + 1)}
              disabled={row.index === rows.length - 1}
              onClick={() => move(row.index, row.index + 1)}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <p role="status" className="ta-outline__status">
        {status}
      </p>
    </details>
  )
}
