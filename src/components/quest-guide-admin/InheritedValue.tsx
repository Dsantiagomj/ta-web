'use client'

import type { FieldDescriptionClientProps } from 'payload'

import { inheritedHint, type SummaryField } from '@/lib/guides/summary'

import { useLinkedQuest } from './linked-quest'

type Props = FieldDescriptionClientProps & { summaryField: SummaryField }

/** Bajo un campo del resumen: lo que da DofusDB, que se muestra si Torre lo deja vacío. */
export function InheritedValue({ summaryField }: Props) {
  const state = useLinkedQuest()
  return (
    // pre-line: las recompensas y los prerrequisitos van en varias líneas
    <div className="field-description" style={{ whiteSpace: 'pre-line' }}>
      {inheritedHint(state, summaryField)}
    </div>
  )
}
