'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useState } from 'react'

import { panelStrings } from '@/lib/admin/strings'

type Props = Pick<FieldDescriptionClientProps, 'path'> & { help: string; what: string }

const t = panelStrings.technical

/** Bajo un campo de solo lectura que Torre copia en otro (el identificador de un paso). */
export function CopyValueDescription({ path, help, what }: Props) {
  const value = useFormFields(([fields]) => fields[path]?.value)
  const [copied, setCopied] = useState(false)
  const text = typeof value === 'string' ? value : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Sin permiso para el portapapeles: el valor sigue a la vista para copiarlo a mano.
      setCopied(false)
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
        {copied ? t.copied : ''}
      </span>
    </div>
  )
}
