'use client'

import { FieldError, TextInput, useField, useFormSubmitted, withCondition } from '@payloadcms/ui'
import type { TextFieldClientComponent, TextFieldClientProps } from 'payload'
import { useCallback, useState } from 'react'

import { validateColor } from '@/lib/dofus-guides/color'
import { validateOptionalVideoUrl, validateVideoUrl } from '@/lib/guides/video'

type Validate = (value: unknown) => true | string

/**
 * El campo de texto de Payload (su TextInput, con su etiqueta, su ayuda, lo que va antes y
 * después del campo y sus estilos) que valida en el navegador y dice por qué bajo el campo:
 * en cuanto Torre sale de él y después de guardar. Payload no valida en el navegador al
 * guardar (disableValidationOnSubmit) y, si la vuelta del form-state acaba antes del clic,
 * del rechazo del servidor solo enseña el aviso «El siguiente campo es inválido: …», sin el
 * mensaje bajo el campo. Aquí el mensaje sale del valor, no del estado del formulario; la
 * misma regla corre en el servidor al guardar, que sigue siendo quien decide.
 */
export function validatedTextField(validate: Validate): TextFieldClientComponent {
  function ValidatedTextField({ field, path: pathFromProps, readOnly }: TextFieldClientProps) {
    const fieldValidate = useCallback((value: unknown) => validate(value), [])
    const {
      customComponents: { AfterInput, BeforeInput, Description, Label } = {},
      disabled,
      path,
      setValue,
      showError,
      value,
    } = useField<string>({ potentiallyStalePath: pathFromProps, validate: fieldValidate })
    const submitted = useFormSubmitted()
    const [left, setLeft] = useState(false)
    const result = validate(value)
    const message = result === true ? undefined : result
    const show = Boolean(message) && (left || submitted)
    const admin = field.admin ?? {}

    return (
      // La envoltura solo escucha cuándo sale el foco; no ocupa sitio (custom.scss).
      <div className="ta-validated" onBlur={() => setLeft(true)}>
        <TextInput
          AfterInput={AfterInput}
          BeforeInput={BeforeInput}
          className={admin.className}
          Description={Description}
          description={admin.description}
          Error={<FieldError path={path} message={message} showError={show} />}
          htmlAttributes={{ autoComplete: admin.autoComplete || undefined }}
          Label={Label}
          label={field.label}
          localized={field.localized}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
          path={path}
          placeholder={admin.placeholder}
          readOnly={readOnly || disabled}
          required={field.required}
          showError={show || showError}
          style={admin.style}
          value={value || ''}
        />
      </div>
    )
  }
  return withCondition(ValidatedTextField)
}

/** El color del brillo de un Dofus o de una tarjeta de checklist (ColorField). */
export const ColorTextField = validatedTextField(validateColor)

/** El enlace de YouTube obligatorio de los bloques de vídeo. */
export const VideoUrlField = validatedTextField(validateVideoUrl)

/** El vídeo opcional de una guía de Dofus. */
export const OptionalVideoUrlField = validatedTextField(validateOptionalVideoUrl)
