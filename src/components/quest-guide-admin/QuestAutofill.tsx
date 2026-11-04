'use client'

import { FieldDescription, useDocumentInfo, useForm } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useRef } from 'react'

import { availableSlug } from '@/lib/guides/autofill'
import { NEEDS_PATH, plannedFormFill, stillEmpty } from '@/lib/guides/form-fill'
import { guideStrings } from '@/lib/guides/strings'

import { fetchLinkedQuest, slugTaken, useApiUrl, useSelectedQuestId } from './linked-quest'

/**
 * Descripción del campo de misiones. Al elegir otra misión, rellena en el formulario el
 * título, el slug, el SEO y el resumen que estén vacíos, sin esperar a guardar. Al
 * guardar, el hook fillFromQuest hace lo mismo en el servidor por si esto no llegó a correr.
 */
export function QuestAutofill({ path }: FieldDescriptionClientProps) {
  const questId = useSelectedQuestId()
  const apiUrl = useApiUrl()
  const { id: docId } = useDocumentInfo()
  const { addFieldRow, dispatchFields, getDataByPath, setModified } = useForm()
  // La misión con la que se abrió la guía no rellena nada: solo un cambio de Torre.
  const lastQuestId = useRef(questId)

  useEffect(() => {
    if (questId === lastQuestId.current) return
    lastQuestId.current = questId
    if (questId === null) return

    void (async () => {
      const quest = await fetchLinkedQuest(apiUrl, questId)
      if (!quest || lastQuestId.current !== questId) return
      const read = (fieldPath: string) => getDataByPath(fieldPath)
      const planned = plannedFormFill(read, quest)
      const { slug } = planned.values
      if (typeof slug === 'string') {
        planned.values.slug = await availableSlug(slug, (candidate) =>
          slugTaken(apiUrl, candidate, docId),
        )
      }
      if (lastQuestId.current !== questId) return

      // Torre pudo escribir mientras se comprobaba el slug: solo se rellena lo que sigue vacío.
      const { values, needsItems } = stillEmpty(planned, read)
      for (const [fieldPath, value] of Object.entries(values)) {
        dispatchFields({ type: 'UPDATE', path: fieldPath, value, valid: true })
      }
      // Una fila por objeto, ya con su objeto y su cantidad.
      needsItems.forEach(({ item, quantity }, rowIndex) => {
        addFieldRow({
          path: NEEDS_PATH,
          rowIndex,
          schemaPath: NEEDS_PATH,
          subFieldState: {
            item: { initialValue: item, value: item, valid: true },
            quantity: { initialValue: quantity, value: quantity, valid: true },
          },
        })
      })
      if (Object.keys(values).length || needsItems.length) setModified(true)
    })()
  }, [addFieldRow, apiUrl, docId, dispatchFields, getDataByPath, questId, setModified])

  return <FieldDescription path={path} description={guideStrings.admin.questsDescription} />
}
