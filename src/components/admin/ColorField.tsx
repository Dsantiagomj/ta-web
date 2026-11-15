'use client'

import { useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { useEffect, useRef } from 'react'

import { panelStrings } from '@/lib/admin/strings'
import { HEX_COLOR } from '@/lib/dofus-guides/color'

import { ColorTextField } from './ValidatedTextField'

/**
 * El color del brillo de un Dofus (A-22): el campo de texto de Payload, con su etiqueta, su
 * ayuda, sus errores y sus estilos, que además valida el color en el navegador y dice por
 * qué bajo el campo (ValidatedTextField). El selector va delante (`beforeInput`, ColorSwatch).
 */
export const ColorField = ColorTextField

type SwatchProps = Pick<TextFieldClientProps, 'field' | 'path' | 'readOnly'>

/**
 * El selector de color, que escribe en el mismo campo: se sigue guardando «#2a5aaa». Mientras
 * se arrastra no toca el formulario; escribe una vez, al soltar o cerrar el selector.
 */
export function ColorSwatch({ field, path, readOnly }: SwatchProps) {
  const { value, setValue, disabled } = useField<string>({ path: path ?? field.name })
  const ref = useRef<HTMLInputElement>(null)
  // Sin color válido, el selector abre en negro; el campo sigue vacío hasta elegir.
  const hex = typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : '#000000'
  const label = typeof field.label === 'string' ? field.label : field.name

  // Sincroniza con el selector nativo: enseña el color cuando se escribe a mano en el campo.
  useEffect(() => {
    if (ref.current && ref.current.value !== hex) ref.current.value = hex
  }, [hex])

  // Sincroniza con el selector nativo: «change» llega al soltar; «input», en cada movimiento.
  useEffect(() => {
    const input = ref.current
    if (!input) return
    const commit = () => setValue(input.value)
    input.addEventListener('change', commit)
    return () => input.removeEventListener('change', commit)
  }, [setValue])

  return (
    <input
      ref={ref}
      type="color"
      className="ta-color__swatch"
      aria-label={panelStrings.color.pick(label)}
      disabled={readOnly || disabled}
      defaultValue={hex}
    />
  )
}
