'use client'

import { FieldError, SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import { objectiveOptions, siblingPath } from '@/lib/admin/checklist-pickers'
import { relationId } from '@/lib/admin/row-labels'
import { panelStrings } from '@/lib/admin/strings'

import { useApiUrl } from '../quest-guide-admin/linked-quest'

type Option = { value: string; label: string }
type Loaded = { quest: number; options: Option[] } | { quest: number; failed: true }
const p = panelStrings.pickers

/**
 * El objetivo donde para un «detente aquí», elegido por su texto (A-19) entre los de la misión
 * de su fila, etapa tras etapa. Se guarda lo mismo que antes: su índice desde 0.
 */
export const StopObjectiveField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<number | null>({ path })
  const questId = useFormFields(([fields]) => relationId(fields[siblingPath(path, 'quest')]?.value))
  const apiUrl = useApiUrl()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  // La API de Payload: las etapas de la misión elegida, cada vez que cambia.
  useEffect(() => {
    if (questId === null) return
    let alive = true
    fetch(`${apiUrl}/quests/${questId}?depth=0&select[stages]=true`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((doc: { stages?: Parameters<typeof objectiveOptions>[0] }) => {
        if (alive) setLoaded({ quest: questId, options: objectiveOptions(doc.stages) })
      })
      .catch(() => {
        if (alive) setLoaded({ quest: questId, failed: true })
      })
    return () => {
      alive = false
    }
  }, [apiUrl, questId])

  const current = loaded && loaded.quest === questId ? loaded : null
  const options = current && 'options' in current ? current.options : []
  const note =
    questId === null
      ? p.questFirst
      : !current
        ? p.loading
        : 'failed' in current
          ? p.failed
          : options.length === 0
            ? p.noObjectives
            : field.admin?.description

  return (
    <SelectInput
      path={path}
      name={field.name}
      label={field.label}
      description={note}
      isClearable
      readOnly={readOnly || options.length === 0}
      options={options}
      placeholder={p.chooseObjective}
      value={value == null ? '' : String(value)}
      showError={showError}
      Error={<FieldError path={path} showError={showError} />}
      onChange={(selected) => {
        const option = (Array.isArray(selected) ? selected[0] : selected) as Option | null
        setValue(option ? Number(option.value) : null)
      }}
    />
  )
}
