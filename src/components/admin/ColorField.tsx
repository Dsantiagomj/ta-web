'use client'

import { TextInput, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import type React from 'react'

import { panelStrings } from '@/lib/admin/strings'

const HEX = /^#[0-9a-f]{6}$/i

/**
 * El color del brillo de un Dofus (A-22): un selector de color junto al hexadecimal. El
 * selector escribe en el mismo campo, así que el valor guardado sigue siendo «#2a5aaa».
 */
export const ColorField: TextFieldClientComponent = ({ field, path: pathFromProps, readOnly }) => {
  const path = pathFromProps ?? field.name
  const { value, setValue, showError } = useField<string>({ path })
  const text = typeof value === 'string' ? value : ''
  const label = typeof field.label === 'string' ? field.label : field.name

  return (
    <TextInput
      path={path}
      label={field.label}
      description={field.admin?.description}
      required={field.required}
      readOnly={readOnly}
      showError={showError}
      value={text}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
      className="ta-color"
      BeforeInput={
        <input
          type="color"
          className="ta-color__swatch"
          aria-label={panelStrings.color.pick(label)}
          disabled={readOnly}
          // Sin color válido, el selector abre en negro; el campo sigue vacío hasta elegir.
          value={HEX.test(text) ? text.toLowerCase() : '#000000'}
          onChange={(event) => setValue(event.target.value)}
        />
      }
    />
  )
}
