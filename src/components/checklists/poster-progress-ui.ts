// El porcentaje de cada cartel del índice /checklists, del progreso del navegador
// (ta-web:progress), con el mismo motor que la página de la checklist
// (src/lib/checklists/poster-progress.ts). La isla carga este módulo con import() solo cuando
// hay progreso guardado (posters-ui.ts, hasProgress), y este pide entonces lo que necesita el
// motor de cada checklist (GET /api/checklists/poster-progress), una sola vez. Sin nada marcado
// no se enseña nada. Se vuelve a pintar cuando otra pestaña cambia el progreso (`storage`) y al
// volver a la página con atrás desde la caché del navegador (`pageshow`).
import type { PosterProgressModel } from '@/lib/checklists/poster-progress'
import { posterPct } from '@/lib/checklists/poster-progress'
import { POSTER_PROGRESS_URL } from '@/lib/checklists/poster-progress-url'
import { PROGRESS_KEY, readProgress, type ProgressStorage } from '@/lib/checklists/progress/store'

import { posterStrings as s } from './poster-strings'

/** Pinta el porcentaje de cada cartel; con 0, lo esconde. */
export function paintProgress(
  root: ParentNode,
  models: PosterProgressModel[],
  storage: ProgressStorage,
): void {
  const progress = readProgress(storage)
  for (const model of models) {
    const ring = root.querySelector<HTMLElement>(`[data-poster-progress="${model.slug}"]`)
    if (!ring) continue
    const pct = posterPct(progress, model)
    if (!pct) {
      ring.hidden = true
      continue
    }
    const label = ring.querySelector('[data-poster-pct]')
    if (label) label.textContent = s.pct(pct)
    ring.style.setProperty('--ratio', String(pct / 100))
    ring.classList.toggle('poster__ring--done', pct === 100)
    ring.hidden = false
  }
}

/** Lo que pide el motor de cada checklist Publicada; vacío si no llega. */
export async function fetchPosterModels(): Promise<PosterProgressModel[]> {
  const response = await fetch(POSTER_PROGRESS_URL)
  return response.ok ? ((await response.json()) as PosterProgressModel[]) : []
}

export interface ProgressEnv {
  storage: ProgressStorage
  loadModels: () => Promise<PosterProgressModel[]>
  /** Donde llegan `storage` y `pageshow`: window. */
  events: Pick<Window, 'addEventListener' | 'removeEventListener'>
}

/** Pinta el porcentaje y lo repinta con cada cambio; devuelve con qué pararlo. */
export function startProgress(root: ParentNode, env: ProgressEnv): () => void {
  let stopped = false
  const models = env.loadModels().catch((error: unknown) => {
    console.error(error)
    return [] as PosterProgressModel[]
  })
  const paint = () => {
    void models.then((list) => {
      if (!stopped) paintProgress(root, list, env.storage)
    })
  }
  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key
    if (key === null || key === PROGRESS_KEY) paint()
  }
  const onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) paint()
  }
  env.events.addEventListener('storage', onStorage)
  env.events.addEventListener('pageshow', onPageShow)
  paint()
  return () => {
    stopped = true
    env.events.removeEventListener('storage', onStorage)
    env.events.removeEventListener('pageshow', onPageShow)
  }
}
