import type { ReactNode } from 'react'

import { type CalloutVariant, uiStrings } from './strings'
import './ui.css'

// Hasta que se elija arte del juego para los tres tipos, un glifo dentro de un aro
// (DESIGN.md, Callout). El título lleva el significado; el glifo es decorativo.
const GLYPH: Record<CalloutVariant, string> = { tip: 'i', warning: '!', stop: '×' }

export function Callout({
  variant,
  title = uiStrings.callout[variant],
  children,
}: {
  variant: CalloutVariant
  title?: string
  children: ReactNode
}) {
  return (
    <aside role="note" className="callout" data-variant={variant}>
      <span className="callout__icon" aria-hidden="true">
        {GLYPH[variant]}
      </span>
      <div>
        <p className="callout__title">{title}</p>
        <div className="callout__body">{children}</div>
      </div>
    </aside>
  )
}
