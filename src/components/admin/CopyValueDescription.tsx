'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

import { panelStrings } from '@/lib/admin/strings'

type Props = Pick<FieldDescriptionClientProps, 'path'> & { help: string; what: string }

const t = panelStrings.technical

/** Lo que tarda en borrarse «Copiado». */
export const COPIED_RESET_MS = 3000

/** Bajo un campo de solo lectura que Torre copia en otro (el identificador de un paso). */
export function CopyValueDescription({ path, help, what }: Props) {
  const value = useFormFields(([fields]) => fields[path]?.value)
  const text = typeof value === 'string' ? value : ''
  // El valor copiado, no un sí o no: si el campo cambia, el aviso deja de valer solo.
  const [copied, setCopied] = useState<{ value: string } | null>(null)
  const showCopied = copied !== null && copied.value === text

  // Sincroniza con el reloj del navegador: «Copiado» se borra a los pocos segundos.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    // El aviso se vacía antes de volver a decir «Copiado», para que un lector de pantalla
    // anuncie cada copia y no solo la primera.
    flushSync(() => setCopied(null))
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ value: text })
    } catch {
      // Sin permiso para el portapapeles: el valor sigue a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="field-description ta-copy">
      <span>{help}</span>
      {text && (
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small ta-copy__button"
          aria-label={t.copyLabel(what)}
          onClick={copy}
        >
          {t.copy}
        </button>
      )}
      <span role="status" className="ta-copy__status">
        {showCopied ? t.copied : ''}
      </span>
    </div>
  )
}
