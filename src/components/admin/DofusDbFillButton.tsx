'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'

import { panelStrings } from '@/lib/admin/strings'

/** Lo que pasó al pulsar el botón: se copió algo, no había nada vacío o DofusDB falló. */
export type FillOutcome = 'filled' | 'nothing' | 'error'

const t = panelStrings.dofusDbFill

/**
 * «Rellenar desde DofusDB»: copia en el formulario lo vacío para lo que DofusDB da algo, sin
 * guardar. Lo escrito no se toca. Bajo el enlace de una guía, un logro o un metalogro.
 */
export function DofusDbFillButton({ onFill }: { onFill: () => Promise<FillOutcome> }) {
  const [state, setState] = useState<FillOutcome | 'working' | null>(null)

  async function fill() {
    // El aviso se vacía antes, para que un lector de pantalla anuncie cada pulsación.
    flushSync(() => setState('working'))
    setState(await onFill().catch((): FillOutcome => 'error'))
  }

  return (
    <div className="ta-fill">
      <button
        type="button"
        className="btn btn--style-secondary btn--size-small ta-fill__button"
        disabled={state === 'working'}
        onClick={fill}
      >
        {t.button}
      </button>
      <span role="status" className="ta-fill__status">
        {state ? t[state] : ''}
      </span>
    </div>
  )
}
