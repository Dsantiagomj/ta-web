// La isla del índice /checklists sobre el HTML del servidor (ChecklistsIndex.tsx). La
// inclinación de los carteles es la compartida de src/components/ui/tilt.ts. El porcentaje de
// cada cartel lo pinta poster-progress-ui.ts, que la isla carga con import() solo si el
// navegador tiene progreso: el motor no viaja en la página de quien no ha marcado nada.
import { PROGRESS_KEY, type ProgressStorage } from '@/lib/checklists/progress/store'

/** Si el navegador guarda algún progreso de checklists; sin localStorage, no. */
export function hasProgress(storage: ProgressStorage | null): boolean {
  try {
    return storage?.getItem(PROGRESS_KEY) != null
  } catch {
    return false
  }
}
