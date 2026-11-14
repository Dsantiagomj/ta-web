'use client'

import { useConfig, useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { isPageState } from '@/lib/achievements/strings'
import { publishStatus, type PublishedVersion } from '@/lib/admin/publish-status'
import { panelStrings } from '@/lib/admin/strings'

type Fetched = { key: string; value: PublishedVersion | null | 'error' }

/**
 * Arriba de la barra lateral: lo que ve un visitante, en una línea (A-16). Lo que se ve sale
 * de la versión publicada, que pide a la API; el borrador solo añade «cambios sin publicar».
 */
export function PublishStatus() {
  const { id, collectionSlug, unpublishedVersionCount, savedDocumentData, isTrashed } =
    useDocumentInfo()
  const modified = useFormModified()
  const {
    config: {
      serverURL,
      routes: { api },
    },
  } = useConfig()

  const saved = id !== undefined && id !== null
  const url =
    saved && collectionSlug && !isTrashed
      ? `${serverURL ?? ''}${api}/${collectionSlug}/${id}?depth=0&draft=false`
      : null
  // Cada guardado o publicación cambia updatedAt: entonces se vuelve a preguntar.
  const key = url ? `${url}|${String(savedDocumentData?.updatedAt ?? '')}` : null
  const [fetched, setFetched] = useState<Fetched | null>(null)

  // Sincroniza con la API de Payload: la versión publicada no está en el formulario.
  useEffect(() => {
    if (!url || !key) return
    const controller = new AbortController()
    fetch(url, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status))
        const doc = (await response.json()) as Record<string, unknown>
        const value: PublishedVersion | null =
          doc._status === 'published'
            ? {
                state: isPageState(doc.state) ? doc.state : undefined,
                legacyHref: typeof doc.legacyHref === 'string' ? doc.legacyHref : null,
              }
            : null
        setFetched({ key, value })
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetched({ key, value: 'error' })
      })
    return () => controller.abort()
  }, [url, key])

  const status = publishStatus({
    collection: collectionSlug ?? '',
    saved,
    trashed: Boolean(isTrashed),
    published: fetched && fetched.key === key ? fetched.value : undefined,
    unpublishedVersionCount,
    modified,
  })

  return (
    <div className={`field-type ta-publish ta-publish--${status.tone}`}>
      <p className="field-label ta-publish__label">{panelStrings.publishStatus.label}</p>
      {/* Cambia al guardar o publicar: un lector de pantalla lo anuncia sin mover el foco. */}
      <div role="status">
        <p className="ta-publish__text">
          <span className="ta-publish__dot" aria-hidden="true" />
          {status.text}
        </p>
        {status.detail && <p className="field-description">{status.detail}</p>}
        {status.changes && <p className="field-description">{status.changes}</p>}
        {status.unsaved && <p className="field-description">{status.unsaved}</p>}
      </div>
    </div>
  )
}
