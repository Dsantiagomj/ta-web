import type { ReactNode } from 'react'

import { CoordinatesChip } from './Coordinates'
import './game.css'
import { CheckIcon } from './icons'
import { gameStrings } from './strings'
import type { Coordinates } from '@/lib/guides/coordinates'

const s = gameStrings.stages

export interface Stage {
  title: string
  coordinates?: Coordinates
  /** Marcada al cargar; solo para el catálogo hasta que exista el progreso de miembros. */
  done?: boolean
  content: ReactNode
}

type HeadingLevel = 2 | 3 | 4

/** Deja el id apto para un selector CSS: letras, cifras y guiones, sin empezar por cifra. */
function cssId(id: string): string {
  const clean = id.replace(/[^\w-]+/g, '-')
  return /^\d/.test(clean) ? `e-${clean}` : clean
}

/**
 * Una etapa (DESIGN.md, Stage card): insignia con el número, que con ticks es la etiqueta
 * de una casilla oculta, y la tarjeta con el título, el chip de la etapa y el contenido.
 */
export function StageCard({
  number,
  stage,
  checkboxId,
  headingLevel = 3,
}: {
  number: number
  stage: Stage
  /** Con id, la etapa se puede marcar como hecha. */
  checkboxId?: string
  headingLevel?: 3 | 4 | 5
}) {
  const Heading = `h${headingLevel}` as const
  const badge = (
    <>
      <span className="stage__num" aria-hidden="true">
        {number}
      </span>
      <CheckIcon className="stage__check-mark" />
    </>
  )
  return (
    <li className="stage">
      {checkboxId ? (
        <>
          <input
            className="stage__check sr-only"
            type="checkbox"
            id={checkboxId}
            defaultChecked={stage.done}
          />
          <label className="stage__badge" htmlFor={checkboxId}>
            {badge}
            <span className="sr-only">{s.done(number)}</span>
          </label>
        </>
      ) : (
        <span className="stage__badge">{badge}</span>
      )}
      <div className="stage__card">
        <div className="stage__head">
          <Heading className="stage__title">{stage.title}</Heading>
          {stage.coordinates && <CoordinatesChip {...stage.coordinates} />}
        </div>
        <div className="prose-guide">{stage.content}</div>
      </div>
    </li>
  )
}

/**
 * Las etapas de la guía (DESIGN.md, Stages timeline), con la píldora de progreso si se
 * pueden marcar. La píldora va después de la lista en el DOM, para que el contador CSS ya
 * tenga su valor, y se dibuja encima. Los segmentos se encienden con :has(), sin JavaScript.
 * Los hijos van al final de la línea: el Botín.
 */
export function StagesTimeline({
  id,
  stages,
  ticks = false,
  headingLevel = 2,
  children,
}: {
  id: string
  stages: Stage[]
  ticks?: boolean
  headingLevel?: HeadingLevel
  children?: ReactNode
}) {
  const scope = cssId(id)
  const Heading = `h${headingLevel}` as const
  const segmentRules = stages
    .map((_, index) => `#${scope}:has(#${scope}-e${index + 1}:checked) [data-seg="${index + 1}"]`)
    .join(',\n')

  return (
    <section id={scope} className="stages" aria-labelledby={`${scope}-h`}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={`${scope}-h`} className="font-display text-2xl text-ink uppercase">
          {s.title}
        </Heading>
        {ticks && <p className="text-sm text-muted">{s.hint}</p>}
      </div>
      <div className="stages__track">
        <ol className="stages__list" role="list">
          {stages.map((stage, index) => (
            <StageCard
              key={index}
              number={index + 1}
              stage={stage}
              checkboxId={ticks ? `${scope}-e${index + 1}` : undefined}
              headingLevel={(headingLevel + 1) as 3 | 4 | 5}
            />
          ))}
        </ol>
        {ticks && (
          <div className="pill" aria-hidden="true">
            <style
              dangerouslySetInnerHTML={{
                __html: `${segmentRules} { transform: none; background: var(--color-accent); }`,
              }}
            />
            <span className="pill__count">
              <span className="pill__done" />
              <span className="pill__total">/{stages.length}</span>
            </span>
            <span className="pill__segs">
              {stages.map((_, index) => (
                <span key={index} className="pill__seg" data-seg={index + 1} />
              ))}
            </span>
            <span className="font-display text-micro text-ink-2 uppercase">{s.progress}</span>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
