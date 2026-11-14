import type { PageState } from '../achievements/strings'
import { panelStrings } from './strings'

// A-16 (docs/research/backlog.md): para que una página se vea hacen falta dos cosas, su
// «Visible en la web» en Publicada y «Publicar cambios». Esta línea dice el resultado.

const s = panelStrings.publishStatus

/** live: se ve; pending: se ve, pero no lo último; hidden: no se ve. */
export type PublishTone = 'live' | 'pending' | 'hidden'

export type PublishStatusInput = {
  /** Si el documento ya existe (tiene id). */
  saved: boolean
  /** Lo que Payload sabe de las versiones: si hay una publicada y cuántos borradores la siguen. */
  hasPublishedDoc: boolean
  unpublishedVersionCount: number
  /** El «Visible en la web» guardado; undefined en las colecciones que no lo tienen. */
  state?: PageState | null
  /** Si el formulario tiene cambios sin guardar. */
  modified: boolean
}

export type PublishStatus = {
  tone: PublishTone
  text: string
  detail: string | null
  /** El aviso de cambios sin guardar, o null. */
  unsaved: string | null
}

/**
 * Lo que ve un visitante, en una línea. Sigue la misma regla que el «Estado» de la cabecera
 * de Payload: con borradores tras lo publicado, hay cambios sin publicar. Sin ellos, lo
 * guardado es lo publicado, así que su «Visible en la web» es el que cuenta.
 */
export function publishStatus(input: PublishStatusInput): PublishStatus {
  const unsaved = input.saved && input.modified ? s.unsaved : null
  const result = (tone: PublishTone, text: string, detail: string | null = null) => ({
    tone,
    text,
    detail,
    unsaved,
  })

  if (!input.saved) return result('hidden', s.unsavedNew, s.unsavedNewDetail)
  if (!input.hasPublishedDoc) return result('hidden', s.draft, s.draftDetail)
  if (input.unpublishedVersionCount > 0) return result('pending', s.changed, s.changedDetail)
  if (input.state === 'preparing') return result('hidden', s.preparing, s.preparingDetail)
  return result('live', s.live)
}
