'use client'

import { FieldError, SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'

import { ownStepIndex, refOptions, stepsSignature } from '@/lib/admin/checklist-pickers'
import { panelStrings } from '@/lib/admin/strings'

type Option = { value: string; label: string }
const p = panelStrings.pickers

/**
 * Los pasos que cierra, avanza o termina un paso, elegidos por su nombre (A-19) en vez de
 * copiar su identificador. Se guarda lo mismo: el stepId de cada uno. Se suscribe solo a los
 * pasos (stepsSignature) y a su propio identificador, no a todo el formulario.
 */
export const StepRefField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string | string[] | null>({ path })
  const signature = useFormFields(([fields]) => stepsSignature(fields))
  const own = ownStepIndex(path)
  const ownId = useFormFields(([fields]) =>
    own === null ? null : fields[`steps.${own}.stepId`]?.value,
  )
  const steps = useMemo(() => JSON.parse(signature) as Option[], [signature])
  const hasMany = Boolean(field.hasMany)
  const chosen = Array.isArray(value) ? value : value ? [value] : []
  const options = refOptions(steps, ownId, chosen)
  return (
    <SelectInput
      path={path}
      name={field.name}
      label={field.label}
      description={field.admin?.description}
      hasMany={hasMany}
      isClearable
      readOnly={readOnly}
      options={options}
      placeholder={hasMany ? p.chooseSteps : p.chooseStep}
      value={hasMany ? chosen : (chosen[0] ?? '')}
      showError={showError}
      Error={<FieldError path={path} showError={showError} />}
      onChange={(selected) => {
        const list = (Array.isArray(selected) ? selected : selected ? [selected] : []) as Option[]
        const values = list.map((option) => String(option.value))
        setValue(hasMany ? values : (values[0] ?? null))
      }}
    />
  )
}
