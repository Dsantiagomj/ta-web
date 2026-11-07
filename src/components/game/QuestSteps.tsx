import { useId, type ReactNode } from 'react'

import type { Coordinates } from '@/lib/guides/coordinates'

import { CoordinatesChip } from './Coordinates'
import './game.css'
import { gameStrings } from './strings'

const s = gameStrings.steps

export interface QuestStep {
  /** El ancla del paso (stepAnchor). */
  id: string
  /** Las coordenadas del paso que su texto no nombra: van como chip al principio. */
  pin?: Coordinates
  content: ReactNode
}

/**
 * Los pasos de la guía (DESIGN.md, Steps): uno tras otro en la columna de lectura,
 * separados por una línea. Sin números, títulos ni casillas; la lista es un <ol>, así que
 * el lector de pantalla ya dice el número.
 */
export function QuestSteps({
  steps,
  headingLevel = 2,
}: {
  steps: QuestStep[]
  headingLevel?: 2 | 3
}) {
  const Heading = `h${headingLevel}` as const
  const headingId = useId()
  return (
    <section className="qsteps" aria-labelledby={headingId}>
      <Heading id={headingId} className="sr-only">
        {s.title}
      </Heading>
      <ol role="list">
        {steps.map((step) => (
          <li key={step.id} id={step.id} className="qstep">
            <div className="qstep__body prose-guide">
              {step.pin && (
                <p>
                  <CoordinatesChip {...step.pin} />
                </p>
              )}
              {step.content}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
