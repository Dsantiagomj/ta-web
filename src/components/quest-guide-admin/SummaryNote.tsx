'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'

import { summaryNote, type FillableField } from '@/lib/guides/summary'

import { useLinkedQuest } from './linked-quest'

type Props = FieldDescriptionClientProps & { summaryField: FillableField }

/** Bajo un campo del resumen: si su valor viene de DofusDB o Torre lo cambió. */
export function SummaryNote({ path, summaryField }: Props) {
  const state = useLinkedQuest()
  const value = useFormFields(([fields]) => fields[path]?.value) as string | number | null
  return (
    // pre-line: las recompensas y los prerrequisitos van en varias líneas
    <div className="field-description" style={{ whiteSpace: 'pre-line' }}>
      {summaryNote(state, summaryField, value)}
    </div>
  )
}
