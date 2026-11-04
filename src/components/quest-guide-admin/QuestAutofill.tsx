'use client'

import { FieldDescription, useDocumentInfo, useForm } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useRef } from 'react'

import { autofillFromQuest, availableSlug } from '@/lib/guides/autofill'
import { guideStrings } from '@/lib/guides/strings'
import { FILLABLE_FIELDS, summaryToFill, type NeedRow } from '@/lib/guides/summary'

import { fetchLinkedQuest, slugTaken, useApiUrl, useSelectedQuestId } from './linked-quest'

const NEEDS_PATH = 'summary.needs.items'

/**
 * Descripción del campo de misiones. Al elegir otra misión, rellena en el formulario el
 * título, el slug, el SEO y el resumen que estén vacíos, sin esperar a guardar. Al guardar, el hook
 * fillFromQuest hace lo mismo en el servidor por si esto no llegó a correr.
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

      const { needs, ...summaryFill } = summaryToFill(
        {
          ...Object.fromEntries(
            FILLABLE_FIELDS.map((field) => [field, getDataByPath<string>(`summary.${field}`)]),
          ),
          needs: { items: getDataByPath<NeedRow[] | null>(NEEDS_PATH) },
        },
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
      // Una fila por objeto, ya con su objeto y su cantidad.
      needs?.items.forEach(({ item, quantity }, rowIndex) => {
        addFieldRow({
          path: NEEDS_PATH,
          rowIndex,
          schemaPath: NEEDS_PATH,
          subFieldState: {
            item: { initialValue: item, value: item, valid: true },
            quantity: { initialValue: quantity, value: quantity, valid: true },
          },
        })
        changed = true
      })
      if (changed) setModified(true)
    })()
  }, [addFieldRow, apiUrl, docId, dispatchFields, getDataByPath, questId, setModified])

  return <FieldDescription path={path} description={guideStrings.admin.questsDescription} />
}
