// El porcentaje de cada cartel del índice /checklists, del progreso del navegador
// (ta-web:progress), con el mismo motor que la página de la checklist
// (src/lib/checklists/poster-progress.ts). Sin nada marcado no se enseña nada. La isla lo carga
// con import() solo cuando hay progreso guardado (posters-ui.ts, hasProgress).
import { posterPct, type PosterProgressModel } from '@/lib/checklists/poster-progress'
import { readProgress, type ProgressStorage } from '@/lib/checklists/progress/store'

import { posterStrings as s } from './poster-strings'

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
    if (!pct) continue
    const label = ring.querySelector('[data-poster-pct]')
    if (label) label.textContent = s.pct(pct)
    ring.style.setProperty('--ratio', String(pct / 100))
    ring.classList.toggle('poster__ring--done', pct === 100)
    ring.hidden = false
  }
}
