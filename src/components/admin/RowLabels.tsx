'use client'

import { useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import {
  fetchRelationTitle,
  relationIds,
  relationRowLabel,
  segmentRowLabel,
  stepRowLabel,
  textRowLabel,
} from '@/lib/admin/row-labels'

import { useApiUrl } from '../quest-guide-admin/linked-quest'

type Row = Record<string, unknown> | undefined

// Las etiquetas de las filas de los arrays del panel: con 40 pasos, Torre encuentra el que
// busca por su texto, no por «Paso 17» (src/lib/admin/row-labels.ts).

/** Un paso de una checklist: el texto de su primer tramo, o su zona. */
export function ChecklistStepLabel() {
  const { data, rowNumber } = useRowLabel<Row>()
  return <span>{stepRowLabel(data, rowNumber)}</span>
}

/** Un tramo del texto de un paso: su tipo, si no es normal, y su texto. */
export function SegmentLabel() {
  const { data, rowNumber } = useRowLabel<Row>()
  return <span>{segmentRowLabel(data, rowNumber)}</span>
}

/** Una fila que se llama por uno de sus campos de texto. */
export function TextRowLabel({ singular, field }: { singular: string; field: string }) {
  const { data, rowNumber } = useRowLabel<Row>()
  return <span>{textRowLabel(singular, field)(data, rowNumber)}</span>
}

type RelationProps = {
  singular: string
  /** El campo de texto de la fila que gana, si está escrito (el nombre de un tramo). */
  textField?: string
  /** El campo que enlaza el documento cuyo nombre se enseña si no hay texto. */
  relationField: string
  relationTo: string
}

/**
 * Una fila que se llama por su texto o, sin él, por el nombre del documento que enlaza. Si
 * enlaza varios (misiones alternativas), nombra el primero y dice cuántos más hay; un texto
 * propio («Misión de clase») ya nombra el grupo y va solo.
 */
export function RelationRowLabel({
  singular,
  textField,
  relationField,
  relationTo,
}: RelationProps) {
  const { data, rowNumber } = useRowLabel<Row>()
  const apiUrl = useApiUrl()
  const own = textField ? data?.[textField] : undefined
  const ownText = typeof own === 'string' && own.trim() ? own : undefined
  const ids = relationIds(data?.[relationField])
  const id = ownText ? null : (ids[0] ?? null)
  const [loaded, setLoaded] = useState<{ id: number; title: string | null } | null>(null)

  // Sincroniza con la API REST de Payload, fuera de React: el nombre del documento enlazado.
  useEffect(() => {
    if (id === null) return
    let active = true
    void fetchRelationTitle(apiUrl, relationTo, id).then((title) => {
      if (active) setLoaded({ id, title })
    })
    return () => {
      active = false
    }
  }, [apiUrl, id, relationTo])

  const title = loaded && loaded.id === id ? loaded.title : null
  return (
    <span>
      {ownText
        ? relationRowLabel(singular, rowNumber, ownText, 1)
        : relationRowLabel(singular, rowNumber, title ?? undefined, ids.length)}
    </span>
  )
}
