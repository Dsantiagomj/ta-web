import type { CSSProperties } from 'react'

import { uiStrings } from './strings'
import './ui.css'

/**
 * Barra de progreso fija (la pinta el servidor). Pasa la proporción en --ratio y el CSS
 * la llena con transform, nunca con width.
 */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(Math.max(value, 0), max)}
        className="progress"
      >
        <span className="progress__fill" style={{ '--ratio': ratio } as CSSProperties} />
      </div>
      <span className="font-accent text-figure text-accent-2 tabular-nums" aria-hidden="true">
        {uiStrings.percent(Math.round(ratio * 100))}
      </span>
    </div>
  )
}
