// El camino de Dofus del rush en la cabecera: qué Dofus enseña según los pasos hechos. Sin DOM;
// lo usa la isla del progreso (src/components/checklist/road-ui.ts).

export interface RoadState {
  /** El Dofus del camino que enseña la cabecera. */
  current: number
  /** Todos los pasos del camino hechos: el último se queda, encendido. */
  finished: boolean
}

/** `done[i]`: si el paso del Dofus i está hecho. Sin camino, null. */
export function roadState(done: boolean[]): RoadState | null {
  if (done.length === 0) return null
  const pending = done.indexOf(false)
  return pending < 0
    ? { current: done.length - 1, finished: true }
    : { current: pending, finished: false }
}
