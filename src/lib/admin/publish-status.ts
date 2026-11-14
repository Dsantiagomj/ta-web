import type { PageState } from '../achievements/strings'
import { panelStrings } from './strings'

// A-16 (docs/research/backlog.md): para que una página se vea hacen falta dos cosas, su
// «Visible en la web» en Publicada y «Publicar cambios». Esta línea dice el resultado con la
// versión publicada, que es la que ve un visitante; un borrador posterior solo se menciona.

const s = panelStrings.publishStatus

/**
 * live: se ve; pending: se ve, con cambios sin publicar; preparing: sale «En preparación»;
 * hidden: no se ve; loading: aún no se sabe.
 */
export type PublishTone = 'live' | 'pending' | 'preparing' | 'hidden' | 'loading'

/** Lo que importa de la versión publicada. */
export type PublishedVersion = { state?: PageState | null; legacyHref?: string | null }

export type PublishStatusInput = {
  collection: string
  /** Si el documento ya existe (tiene id). */
  saved: boolean
  trashed: boolean
  /** La versión publicada: null si nunca se publicó, undefined mientras llega. */
  published: PublishedVersion | null | undefined | 'error'
  /** Borradores guardados después de lo publicado (Payload). */
  unpublishedVersionCount: number
  /** Si el formulario tiene cambios sin guardar. */
  modified: boolean
}

export type PublishStatus = {
  tone: PublishTone
  text: string
  detail: string | null
  /** «Tienes cambios sin publicar…», o null. */
  changes: string | null
  /** El aviso de cambios sin guardar, o null. */
  unsaved: string | null
}

function preparingText(collection: string, published: PublishedVersion) {
  const p = s.preparing
  if (collection === 'checklists') return published.legacyHref ? p.checklistsLegacy : p.checklists
  if (collection === 'achievement-groups') return p['achievement-groups']
  if (collection === 'dofus-guides') return p['dofus-guides']
  return p['achievement-pages']
}

/** Lo que ve un visitante, en una línea, y lo que queda por publicar o guardar. */
export function publishStatus(input: PublishStatusInput): PublishStatus {
  const unsaved = input.saved && input.modified ? s.unsaved : null
  const result = (
    tone: PublishTone,
    text: string,
    detail: string | null = null,
    changes: string | null = null,
  ): PublishStatus => ({ tone, text, detail, changes, unsaved })

  if (input.trashed) return result('hidden', s.trashed)
  if (!input.saved) return result('hidden', s.unsavedNew, s.unsavedNewDetail)
  if (input.published === undefined) return result('loading', s.loading)
  if (input.published === 'error') return result('hidden', s.error)
  // Nunca publicada: todo es borrador, no hay «cambios» sobre nada.
  if (input.published === null) return result('hidden', s.draft, s.draftDetail)

  const changes = input.unpublishedVersionCount > 0 ? s.changes : null
  if (input.published.state === 'preparing') {
    const { text, detail } = preparingText(input.collection, input.published)
    return result('preparing', text, detail, changes)
  }
  return result(changes ? 'pending' : 'live', s.live, null, changes)
}
