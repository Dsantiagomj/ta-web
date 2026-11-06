import { useId, type ReactNode } from 'react'

import type { Coordinates } from '@/lib/guides/coordinates'
import type { StepNavEntry } from '@/lib/guides/step-nav'

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
 * Los pasos de la guía (DESIGN.md, Steps): un número en su hueco, pegado arriba al
 * desplazarse, y el contenido del paso. Sin títulos ni casillas; la lista es un <ol>, así
 * que el lector de pantalla ya dice el número.
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
        {steps.map((step, index) => (
          <li key={step.id} id={step.id} className="qstep" data-step>
            <span className="qstep__n" aria-hidden="true">
              {index + 1}
            </span>
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

/**
 * La lista «Pasos» junto a la guía desde 1152px (DESIGN.md, Steps side list): enlaces a
 * cada paso con su etiqueta y sus coordenadas. Sin JavaScript es una lista de enlaces; la
 * isla de la página marca el paso que se está leyendo.
 */
export function StepTracker({
  entries,
  headingLevel = 2,
}: {
  entries: StepNavEntry[]
  headingLevel?: 2 | 3
}) {
  const headingId = useId()
  if (entries.length === 0) return null
  const Heading = `h${headingLevel}` as const
  return (
    <nav className="tracker" aria-labelledby={headingId}>
      <Heading id={headingId}>{s.tracker}</Heading>
      <ol role="list">
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <a href={`#${entry.id}`} data-tracker={entry.id}>
              <span className="tracker__n" aria-hidden="true">
                {index + 1}
              </span>
              <span>{entry.label}</span>
              <span className="tracker__c">
                {entry.coordinates && `${entry.coordinates.x},${entry.coordinates.y}`}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
