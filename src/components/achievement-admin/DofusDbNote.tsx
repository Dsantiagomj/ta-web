'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useMemo, useState } from 'react'

import { linkedQuestId } from '@/lib/guides/autofill'
import {
  dofusDbNote,
  type ValueField,
  type ValuesSource,
  type ValuesState,
} from '@/lib/achievements/dofusdb-values'

import { useApiUrl } from '../quest-guide-admin/linked-quest'

type Props = FieldDescriptionClientProps & { source: ValuesSource; field: string }

/** El campo del formulario que enlaza el dato de DofusDB. */
const LINK: Record<ValuesSource, string> = { achievement: 'achievement', group: 'category' }

// El panel lee los valores por la API REST: aquí corre en el navegador. Una petición por
// documento de DofusDB mientras la página siga abierta; si falla, se reintenta.
const requests = new Map<string, Promise<unknown | null>>()

function fetchValues(url: string): Promise<unknown | null> {
  const cached = requests.get(url)
  if (cached) return cached
  const request = fetch(url, { credentials: 'include' })
    .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
    .catch(() => null)
    .then((values) => {
      if (!values) requests.delete(url)
      return values
    })
  requests.set(url, request)
  return request
}

function useValues<S extends ValuesSource>(source: S): ValuesState<S> {
  const id = useFormFields(([fields]) => linkedQuestId(fields[LINK[source]]?.value))
  const apiUrl = useApiUrl()
  const [loaded, setLoaded] = useState<{ id: number; values: unknown } | null>(null)

  // Sincroniza con la API REST de Payload, fuera de React.
  useEffect(() => {
    if (id === null) return
    let active = true
    void fetchValues(`${apiUrl}/dofusdb-values/${source}/${id}`).then((values) => {
      if (active) setLoaded({ id, values })
    })
    return () => {
      active = false
    }
  }, [apiUrl, id, source])

  if (id === null) return { status: 'none' }
  if (loaded?.id !== id) return { status: 'loading' }
  return loaded.values
    ? ({ status: 'ready', values: loaded.values } as ValuesState<S>)
    : { status: 'error' }
}

/**
 * El valor del campo en el formulario como JSON: un texto estable evita volver a pintar la
 * nota con cada cambio. En una lista, sus filas (el valor de un array es su número de filas).
 */
function useFieldValue(path: string, field: string): string {
  return useFormFields(([fields]) => {
    const columns =
      field === 'items' ? ['item', 'quantity'] : field === 'quests' ? ['name', 'quests'] : null
    if (!columns) return JSON.stringify(fields[path]?.value ?? null)
    const count = Number(fields[path]?.value ?? 0)
    const rows = Array.from({ length: count }, (_, index) =>
      Object.fromEntries(
        columns.map((column) => [column, fields[`${path}.${index}.${column}`]?.value ?? null]),
      ),
    )
    return JSON.stringify(rows)
  })
}

/** Bajo un campo copiado de DofusDB: si su valor viene de DofusDB o Torre lo cambió. */
export function DofusDbNote({ path, source, field }: Props) {
  const state = useValues(source)
  const json = useFieldValue(path, field)
  const value = useMemo(() => JSON.parse(json) as unknown, [json])
  return (
    // pre-line: la lista de misiones y la de objetos pueden ser largas
    <div className="field-description" style={{ whiteSpace: 'pre-line' }}>
      {dofusDbNote(source, state, field as ValueField<typeof source>, value)}
    </div>
  )
}
