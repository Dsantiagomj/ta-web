'use client'

import { FieldDescription, useDocumentInfo, useForm } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useRef } from 'react'

import { autofillFromQuest, availableSlug } from '@/lib/guides/autofill'
import { guideStrings } from '@/lib/guides/strings'
import { FILLABLE_FIELDS, summaryToFill } from '@/lib/guides/summary'

import { fetchLinkedQuest, slugTaken, useApiUrl, useSelectedQuestId } from './linked-quest'

/**
 * Descripción del campo de misiones. Al elegir otra misión, rellena en el formulario el
 * título, el slug, el SEO y el resumen que estén vacíos, sin esperar a guardar. Al guardar, el hook
 * fillFromQuest hace lo mismo en el servidor por si esto no llegó a correr.
 */
export function QuestAutofill({ path }: FieldDescriptionClientProps) {
  const questId = useSelectedQuestId()
  const apiUrl = useApiUrl()
  const { id: docId } = useDocumentInfo()
  const { dispatchFields, getDataByPath, setModified } = useForm()
  // La misión con la que se abrió la guía no rellena nada: solo un cambio de Torre.
  const lastQuestId = useRef(questId)

  useEffect(() => {
    if (questId === lastQuestId.current) return
    lastQuestId.current = questId
    if (questId === null) return

    void (async () => {
      const quest = await fetchLinkedQuest(apiUrl, questId)
      if (!quest || lastQuestId.current !== questId) return
      const fill = autofillFromQuest(
        {
          title: getDataByPath<string>('title'),
          slug: getDataByPath<string>('slug'),
          metaTitle: getDataByPath<string>('seo.metaTitle'),
          metaDescription: getDataByPath<string>('seo.metaDescription'),
        },
        quest,
      )
      const slug =
        fill.slug && (await availableSlug(fill.slug, (slug) => slugTaken(apiUrl, slug, docId)))
      if (lastQuestId.current !== questId) return

      const summaryFill = summaryToFill(
        Object.fromEntries(
          FILLABLE_FIELDS.map((field) => [field, getDataByPath<string>(`summary.${field}`)]),
        ),
        quest,
      )

      const values: [string, string | number | null | undefined][] = [
        ['title', fill.title],
        ['slug', slug],
        ['seo.metaTitle', fill.metaTitle],
        ['seo.metaDescription', fill.metaDescription],
        ...Object.entries(summaryFill).map(([field, value]): [string, string | number | null] => [
          `summary.${field}`,
          value,
        ]),
      ]
      let changed = false
      for (const [fieldPath, value] of values) {
        if (value === null || value === undefined || value === '') continue
        dispatchFields({ type: 'UPDATE', path: fieldPath, value, valid: true })
        changed = true
      }
      if (changed) setModified(true)
    })()
  }, [apiUrl, docId, dispatchFields, getDataByPath, questId, setModified])

  return <FieldDescription path={path} description={guideStrings.admin.questsDescription} />
}
