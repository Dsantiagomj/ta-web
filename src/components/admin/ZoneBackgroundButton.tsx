'use client'

import { FieldDescription, useAuth, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useState } from 'react'
import { flushSync } from 'react-dom'

import { panelStrings } from '@/lib/admin/strings'

import { useApiUrl } from '../quest-guide-admin/linked-quest'

const t = panelStrings.zoneBackground

type State = 'working' | 'done' | 'error' | 'noMaps' | 'forbidden' | null

/** Lo que escribió Torre en «Mapa del fondo»: un entero positivo, o null. */
function typedMap(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : null
}

/**
 * La ayuda de «Mapa del fondo» de una subzona, con el botón «Traer fondo de DofusDB»: el
 * servidor trae el render del mapa escrito (o elige uno), lo guarda en Media sin la marca de
 * DofusDB y lo pone de fondo (src/endpoints/zone-background.ts). Solo un administrador lo ve.
 */
export function ZoneBackgroundButton({ path }: FieldDescriptionClientProps) {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const apiUrl = useApiUrl()
  const { dispatchFields } = useForm()
  const mapId = useFormFields(([fields]) => typedMap(fields[path]?.value))
  const [state, setState] = useState<State>(null)

  async function bring() {
    // El aviso se vacía antes, para que un lector de pantalla anuncie cada pulsación.
    flushSync(() => setState('working'))
    try {
      const response = await fetch(`${apiUrl}/subareas/${id}/zone-background`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId }),
      })
      if (response.status === 403) return setState('forbidden')
      if (response.status === 404) return setState('noMaps')
      if (!response.ok) return setState('error')
      const saved = (await response.json()) as { mapId: number; mediaId: number }
      // Ya está guardado: el formulario enseña lo nuevo sin marcarse como cambiado.
      for (const [field, value] of [
        ['background', saved.mediaId],
        [path, saved.mapId],
      ] as const) {
        dispatchFields({ type: 'UPDATE', path: field, value, initialValue: value, valid: true })
      }
      setState('done')
    } catch {
      setState('error')
    }
  }

  const isAdmin = (user as { role?: string } | null)?.role === 'admin'
  return (
    <>
      <FieldDescription path={path} description={t.mapIdHelp} />
      {id != null && isAdmin && (
        <div className="ta-fill">
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small ta-fill__button"
            disabled={state === 'working'}
            onClick={bring}
          >
            {t.button}
          </button>
          <span role="status" className="ta-fill__status">
            {state ? t[state] : ''}
          </span>
        </div>
      )}
    </>
  )
}
