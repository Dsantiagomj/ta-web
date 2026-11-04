'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useMemo } from 'react'

import { summaryNote, type NeedRow, type NotedField, type NotedValue } from '@/lib/guides/summary'

import { useLinkedQuest } from './linked-quest'

type Props = FieldDescriptionClientProps & { summaryField: NotedField }

/**
 * El valor del campo en el formulario. Para la lista de Necesitarás, sus filas como JSON:
 * un texto estable evita volver a pintar la nota con cada cambio del formulario.
 */
function useFieldValue(path: string, isList: boolean): string {
  return useFormFields(([fields]) => {
    if (!isList) return JSON.stringify(fields[path]?.value ?? null)
    const rows: NeedRow[] = []
    // El valor de un array en el estado del formulario es su número de filas.
    const count = Number(fields[path]?.value ?? 0)
    for (let index = 0; index < count; index += 1) {
      rows.push({
        item: fields[`${path}.${index}.item`]?.value as NeedRow['item'],
        quantity: fields[`${path}.${index}.quantity`]?.value as NeedRow['quantity'],
      })
    }
    return JSON.stringify(rows)
  })
}

/** Bajo un campo del resumen: si su valor viene de DofusDB o Torre lo cambió. */
export function SummaryNote({ path, summaryField }: Props) {
  const state = useLinkedQuest()
  const json = useFieldValue(path, summaryField === 'needs')
  const value = useMemo(() => JSON.parse(json) as NotedValue, [json])
  return (
    // pre-line: las recompensas, los prerrequisitos y la lista van en varias líneas
    <div className="field-description" style={{ whiteSpace: 'pre-line' }}>
      {summaryNote(state, summaryField, value)}
    </div>
  )
}
