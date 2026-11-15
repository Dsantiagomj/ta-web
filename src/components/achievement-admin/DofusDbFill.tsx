'use client'

import { FieldDescription, useForm, useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'

import {
  formFill,
  type AchievementValues,
  type GroupValues,
  type ValuesSource,
} from '@/lib/achievements/dofusdb-values'
import { linkedQuestId } from '@/lib/guides/autofill'

import { DofusDbFillButton, type FillOutcome } from '../admin/DofusDbFillButton'
import { useApiUrl } from '../quest-guide-admin/linked-quest'
import { fetchValues, LINK } from './values-api'

type Props = FieldDescriptionClientProps & { source: ValuesSource; description: string }

/**
 * La ayuda del enlace de DofusDB de un logro o un metalogro, con el botón «Rellenar desde
 * DofusDB»: copia en el formulario lo que da DofusDB en lo vacío, sin guardar.
 */
export function DofusDbFill({ path, source, description }: Props) {
  const id = useFormFields(([fields]) => linkedQuestId(fields[LINK[source]]?.value))
  const apiUrl = useApiUrl()
  const { addFieldRow, dispatchFields, getDataByPath, setModified } = useForm()

  async function fill(linked: number): Promise<FillOutcome> {
    const values = await fetchValues(`${apiUrl}/dofusdb-values/${source}/${linked}`)
    if (!values) return 'error'
    const planned = formFill(source, values as AchievementValues & GroupValues, (fieldPath) =>
      getDataByPath(fieldPath),
    )
    for (const [fieldPath, value] of Object.entries(planned.values)) {
      dispatchFields({ type: 'UPDATE', path: fieldPath, value, valid: true })
    }
    // Una fila por elemento de la lista, ya con sus valores.
    for (const [listPath, rows] of Object.entries(planned.rows)) {
      rows.forEach((row, rowIndex) => {
        addFieldRow({
          path: listPath,
          rowIndex,
          schemaPath: listPath,
          subFieldState: Object.fromEntries(
            Object.entries(row).map(([name, value]) => [
              name,
              { initialValue: value, value, valid: true },
            ]),
          ),
        })
      })
    }
    if (!Object.keys(planned.values).length && !Object.keys(planned.rows).length) return 'nothing'
    setModified(true)
    return 'filled'
  }

  return (
    <>
      <FieldDescription path={path} description={description} />
      {id !== null && <DofusDbFillButton onFill={() => fill(id)} />}
    </>
  )
}
