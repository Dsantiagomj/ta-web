'use client'

import { FieldError, SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import {
  objectiveOptions,
  objectivePickerOptions,
  siblingPath,
} from '@/lib/admin/checklist-pickers'
import { relationId } from '@/lib/admin/row-labels'
import { panelStrings } from '@/lib/admin/strings'

import { fetchLinkedQuest, useApiUrl } from '../quest-guide-admin/linked-quest'

type Option = { value: string; label: string }
type Loaded = { quest: number; options: Option[] } | { quest: number; failed: true }
const p = panelStrings.pickers

/**
 * El objetivo antes del que para un «detente aquí», elegido por su texto (A-19) entre los de la
 * misión de su fila, etapa tras etapa. Se guarda lo mismo que antes: su índice desde 0. El
 * guardado siempre se ve y se puede quitar, también mientras cargan o si ya no está.
 */
export const StopObjectiveField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<number | null>({ path })
  const questId = useFormFields(([fields]) => relationId(fields[siblingPath(path, 'quest')]?.value))
  const apiUrl = useApiUrl()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)

  // La API de Payload, con la caché de las guías de misión: la misión elegida y sus etapas, cada
  // vez que cambia o al reintentar. Una petición fallida no se queda en la caché.
  useEffect(() => {
    if (questId === null) return
    let alive = true
    fetchLinkedQuest(apiUrl, questId).then((quest) => {
      if (!alive) return
      const stages = (quest as { stages?: Parameters<typeof objectiveOptions>[0] } | null)?.stages
      setLoaded(
        quest
          ? { quest: questId, options: objectiveOptions(stages) }
          : { quest: questId, failed: true },
      )
    })
    return () => {
      alive = false
    }
  }, [apiUrl, questId, attempt])

  const current = loaded && loaded.quest === questId ? loaded : null
  const failed = Boolean(current && 'failed' in current)
  const loadedOptions = current && 'options' in current ? current.options : []
  const options = objectivePickerOptions(loadedOptions, value ?? null)
  const note =
    questId === null
      ? value != null
        ? p.questCleared
        : p.questFirst
      : !current
        ? p.loading
        : failed
          ? p.failed
          : loadedOptions.length === 0
            ? p.noObjectives
            : field.admin?.description

  return (
    <SelectInput
      path={path}
      name={field.name}
      label={field.label}
      description={note}
      AfterInput={
        failed ? (
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
            onClick={() => setAttempt((n) => n + 1)}
          >
            {p.retry}
          </button>
        ) : undefined
      }
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
