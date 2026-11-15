'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useMemo } from 'react'

import {
  isListField,
  summaryNote,
  type LevelRow,
  type NeedRow,
  type NotedField,
  type NotedValue,
} from '@/lib/guides/summary'

import { useLinkedQuest } from './linked-quest'

type Props = FieldDescriptionClientProps & { summaryField: NotedField }

type FormFields = Record<string, { value?: unknown } | undefined>

// El valor de un array en el estado del formulario es su número de filas.
const rowCount = (fields: FormFields, path: string) => Number(fields[path]?.value ?? 0)

function itemRows(fields: FormFields, path: string): NeedRow[] {
  return Array.from({ length: rowCount(fields, path) }, (_, index) => ({
    item: fields[`${path}.${index}.item`]?.value as NeedRow['item'],
    quantity: fields[`${path}.${index}.quantity`]?.value as NeedRow['quantity'],
  }))
}

// Las filas de «Por nivel», cada una con su lista de objetos.
function levelRows(fields: FormFields, path: string): LevelRow[] {
  return Array.from({ length: rowCount(fields, path) }, (_, index) => {
    const value = (name: string) => fields[`${path}.${index}.${name}`]?.value as number | null
    return {
      levelMin: value('levelMin'),
      levelMax: value('levelMax'),
      experience: value('experience'),
      kamas: value('kamas'),
      items: itemRows(fields, `${path}.${index}.items`),
    }
  })
}

/**
 * El valor del campo en el formulario. Para una lista, sus filas como JSON: un texto estable
 * evita volver a pintar la nota con cada cambio del formulario.
 */
function useFieldValue(path: string, field: NotedField): string {
  return useFormFields(([fields]) => {
    if (field === 'rewardLevels') return JSON.stringify(levelRows(fields, path))
    if (isListField(field)) return JSON.stringify(itemRows(fields, path))
    return JSON.stringify(fields[path]?.value ?? null)
  })
}

/** Bajo un campo del resumen: si su valor viene de DofusDB o Torre lo cambió. */
export function SummaryNote({ path, summaryField }: Props) {
  const state = useLinkedQuest()
  const json = useFieldValue(path, summaryField)
  const value = useMemo(() => JSON.parse(json) as NotedValue, [json])
  return (
    // field-note (custom.scss): recompensas, prerrequisitos y lista van en varias líneas
    <div className="field-description field-note">{summaryNote(state, summaryField, value)}</div>
  )
}
