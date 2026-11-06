import { useId, type ReactNode } from 'react'

import { type CalloutVariant, uiStrings } from './strings'
import './ui.css'

/**
 * Aviso (DESIGN.md, Callout): una caja con el borde de su color y un título sencillo
 * dentro, sin cinta ni glifo. El título lleva el significado («¡Importante!»).
 */
export function Callout({
  variant,
  title = uiStrings.callout[variant],
  headingLevel = 3,
  children,
}: {
  variant: CalloutVariant
  title?: string
  headingLevel?: 2 | 3 | 4
  children: ReactNode
}) {
  const id = useId()
  const Heading = `h${headingLevel}` as const
  return (
    <aside role="note" className="callout" data-variant={variant} aria-labelledby={id}>
      <Heading id={id} className="callout__title">
        {title}
      </Heading>
      <div className="callout__body">{children}</div>
    </aside>
  )
}
