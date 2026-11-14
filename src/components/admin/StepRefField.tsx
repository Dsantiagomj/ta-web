'use client'

import { FieldError, SelectInput, useAllFormFields, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

import { stepRefOptions } from '@/lib/admin/checklist-pickers'
import { panelStrings } from '@/lib/admin/strings'

type Option = { value: string; label: string }
const p = panelStrings.pickers

/**
 * Los pasos que cierra, avanza o termina un paso, elegidos por su nombre (A-19) en vez de
 * copiar su identificador. Se guarda lo mismo: el stepId de cada uno. Un paso nuevo sale aquí
 * al guardarlo, cuando tiene identificador.
 */
export const StepRefField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string | string[] | null>({ path })
  const [fields] = useAllFormFields()
  const hasMany = Boolean(field.hasMany)
  const chosen = Array.isArray(value) ? value : value ? [value] : []
  const options = stepRefOptions(fields, path, chosen)
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
