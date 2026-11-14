'use client'

import { useForm, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { liveStatus, moveTo, outlineSignature, type OutlineRow } from '@/lib/admin/step-outline'
import { panelStrings } from '@/lib/admin/strings'

const o = panelStrings.stepOutline

/**
 * El esquema de los pasos de una checklist (A-18): cada paso en una línea, con botones para
 * subirlo o bajarlo y, con el foco en él, Alt con las flechas (o con Inicio y Fin). Mueve las
 * filas del formulario, como el asa de arrastre: cada paso se lleva su identificador y nada
 * cambia hasta guardar. Solo se vuelve a pintar cuando cambia lo que enseña (outlineSignature).
 */
export const StepOutline: UIFieldClientComponent = ({ field }) => {
  const signature = useFormFields(([fields]) => outlineSignature(fields))
  const rows = useMemo(() => JSON.parse(signature) as OutlineRow[], [signature])
  const { moveFieldRow } = useForm()
  const [moved, setMoved] = useState<{ message: string; signature: string } | null>(null)
  const list = useRef<HTMLOListElement>(null)
  if (rows.length < 2) return null

  const move = (from: number, to: number) => {
    moveFieldRow({ path: 'steps', moveFromIndex: from, moveToIndex: to })
    // El aviso vale para el esquema tal como queda: cualquier otro cambio lo borra.
    const after = [...rows]
    after.splice(to, 0, ...after.splice(from, 1))
    const next = after.map((row, index) => ({ ...row, index }))
    setMoved({ message: o.moved(from + 1, to + 1), signature: expectedSignature(next) })
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
  const label = typeof field.label === 'string' ? field.label : o.label

  return (
    <details className="ta-outline">
      <summary className="ta-outline__summary">
        {label} ({rows.length})
      </summary>
      <p className="field-description">{o.help}</p>
      <ol className="ta-outline__list" ref={list}>
        {rows.map((row) => (
          <li
            key={row.id ?? `fila-${row.index}`}
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
        {liveStatus(moved, signature)}
      </p>
    </details>
  )
}

/**
 * La firma que tendrá el esquema tras mover un paso: los nombres llevan su número («Paso 2: …»),
 * que cambia con la posición.
 */
function expectedSignature(rows: OutlineRow[]) {
  return JSON.stringify(
    rows.map((row) => ({ ...row, label: row.label.replace(/^(\S+) \d+/, `$1 ${row.index + 1}`) })),
  )
}
