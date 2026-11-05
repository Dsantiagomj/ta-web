import type { ReactNode } from 'react'

import { TravelButton } from './Coordinates'
import { ItemChip } from './Item'
import { gameStrings } from './strings'
import type { GameItem, Quantity } from './types'

const s = gameStrings.ribbon

export interface RibbonStart {
  npc: string
  place?: string
  x: number
  y: number
}

export interface RibbonReward {
  xp?: number
  kamas?: number
  /** Cuántos objetos da: el detalle está en el Botín. */
  items?: number
}

function Segment({
  label,
  grow,
  children,
}: {
  label: string
  grow?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={
        'grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-3 py-2.5 not-first:border-t not-first:border-line ' +
        'lg:block lg:px-5 lg:py-3.5 lg:not-first:border-t-0 lg:not-first:border-l ' +
        (grow ? 'max-sm:grid-cols-1 max-sm:gap-1.5 lg:flex-[1_1_380px]' : 'lg:flex-[0_1_auto]')
      }
    >
      <dt className="font-display text-micro text-muted uppercase lg:mb-1.5">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  )
}

/**
 * Resumen de la guía bajo la cabecera (DESIGN.md, Summary ribbon): dónde empieza, qué
 * pide y qué se necesita, y un enlace a la recompensa. Sin nivel: está en el medallón. Lo
 * que falta no se pinta; sin ningún dato, nada.
 */
export function SummaryRibbon({
  start,
  requires = [],
  needs,
  reward,
  rewardHref = '#botin',
}: {
  start?: RibbonStart
  requires?: { label: string; href?: string }[]
  needs?: { items?: Quantity<GameItem>[]; notes?: string[] }
  reward?: RibbonReward
  rewardHref?: string
}) {
  const needItems = needs?.items ?? []
  const needNotes = needs?.notes ?? []
  const hasNeeds = needItems.length > 0 || needNotes.length > 0
  const rewardText = reward ? s.rewardSummary(reward) : ''
  const hasSegments = Boolean(start) || requires.length > 0 || hasNeeds
  if (!hasSegments && !rewardText) return null

  return (
    <section aria-label={s.label} className="mx-auto w-full max-w-[calc(var(--width-hero)+96px)]">
      <div className="rounded-card bg-surface">
        {hasSegments && (
          <dl className="grid px-4 py-1 lg:flex lg:flex-wrap lg:p-0">
            {start && (
              <Segment label={s.start} grow>
                <span className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                  <span className="text-base text-ink-2">
                    <strong className="font-semibold text-ink">{start.npc}</strong>
                    {start.place && ` · ${start.place}`}
                  </span>
                  <span className="max-sm:w-full max-sm:[&>span]:w-full">
                    <TravelButton x={start.x} y={start.y} />
                  </span>
                </span>
              </Segment>
            )}
            {requires.length > 0 && (
              <Segment label={s.requires}>
                {requires.map((line) => (
                  <p key={line.label}>
                    {line.href ? <a href={line.href}>{line.label}</a> : line.label}
                  </p>
                ))}
              </Segment>
            )}
            {hasNeeds && (
              <Segment label={s.needs}>
                {needItems.length > 0 && (
                  <ul className="mb-1.5 flex flex-wrap gap-1.5" role="list">
                    {needItems.map(({ item, quantity }) => (
                      <li key={item.name}>
                        <ItemChip item={item} quantity={quantity} />
                      </li>
                    ))}
                  </ul>
                )}
                {needNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </Segment>
            )}
          </dl>
        )}
        {rewardText && (
          <a
            href={rewardHref}
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line text-sm text-ink-2 no-underline transition-colors duration-(--duration-fast) ease-standard hover:bg-raised focus-visible:-outline-offset-2 lg:rounded-b-card lg:px-5"
          >
            <span className="font-display text-micro text-section uppercase">{s.reward}</span>
            {rewardText}
            <span aria-hidden="true">↓</span>
          </a>
        )}
      </div>
    </section>
  )
}
