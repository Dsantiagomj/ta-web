/** Cómo va una checklist: sin empezar, en curso o completa. */
export type ProgressState = 'todo' | 'doing' | 'done'

/**
 * El estado según el porcentaje de progressPct o soulsPct, que dan 0 solo sin nada hecho y
 * 100 solo con todo. El huevo de la cabecera sigue apagado hasta 'done' (checklist.css).
 */
export function progressState(pct: number): ProgressState {
  if (pct >= 100) return 'done'
  return pct > 0 ? 'doing' : 'todo'
}
