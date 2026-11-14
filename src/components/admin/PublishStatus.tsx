'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'

import type { PageState } from '@/lib/achievements/strings'
import { publishStatus } from '@/lib/admin/publish-status'
import { panelStrings } from '@/lib/admin/strings'

const isState = (value: unknown): value is PageState =>
  value === 'published' || value === 'preparing'

/**
 * Arriba de la barra lateral: lo que ve un visitante, en una línea (A-16). Lee lo mismo que
 * el «Estado» de la cabecera de Payload y el «Visible en la web» guardado.
 */
export function PublishStatus() {
  const { id, hasPublishedDoc, unpublishedVersionCount, savedDocumentData } = useDocumentInfo()
  const modified = useFormModified()
  const saved = savedDocumentData?.state
  const status = publishStatus({
    saved: id !== undefined && id !== null,
    hasPublishedDoc,
    unpublishedVersionCount,
    state: isState(saved) ? saved : undefined,
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
        {status.unsaved && <p className="field-description">{status.unsaved}</p>}
      </div>
    </div>
  )
}
