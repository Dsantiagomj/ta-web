import { Picture } from '@/components/ui/Picture'
import { StatTile } from '@/components/ui/StatTile'

import { AchievementChain } from './AchievementChain'
import './game.css'
import { ItemSlot } from './Item'
import { gameStrings } from './strings'
import type { GameItem, Quantity } from './types'

const s = gameStrings.botin

type HeadingLevel = 2 | 3 | 4

/**
 * La recompensa al final de los pasos (DESIGN.md, Botín card): fichas de XP y kamas,
 * una casilla por objeto y la cadena del logro. Sin fichas, las líneas de recompensa que
 * escribió la guía (`notes`). Lo que falta no se pinta; sin nada, nada.
 */
export function BotinCard({
  id = 'botin',
  xp,
  kamas,
  items = [],
  notes = [],
  chain,
  headingLevel = 2,
}: {
  id?: string
  xp?: number
  kamas?: number
  items?: Quantity<GameItem>[]
  /** Las recompensas en texto, una por línea, cuando no hay datos para las fichas. */
  notes?: string[]
  chain?: React.ComponentProps<typeof AchievementChain>
  headingLevel?: HeadingLevel
}) {
  const hasSlots = Boolean(xp || kamas || items.length)
  if (!hasSlots && notes.length === 0) return null
  const Heading = `h${headingLevel}` as const
  const badgeIcon = items[0]?.item.icon

  return (
    <section id={id} className="botin" aria-labelledby={`${id}-h`}>
      <div className="botin__badge" aria-hidden="true">
        {badgeIcon ? (
          <Picture image={badgeIcon} alt="" className="size-7" />
        ) : (
          <span className="font-accent text-[0.8125rem] leading-none text-accent-2">{s.xp}</span>
        )}
      </div>
      <div className="botin__card">
        <p className="botin__eyebrow font-display text-micro text-muted uppercase">{s.eyebrow}</p>
        <Heading id={`${id}-h`} className="botin__title font-display text-2xl text-ink uppercase">
          {s.title}
        </Heading>
        {hasSlots ? (
          <ul className="botin__slots" role="list">
            {xp ? <StatTile as="li" value={xp} label={s.xp} className="botin__stat" /> : null}
            {kamas ? (
              <StatTile as="li" value={kamas} label={s.kamas} className="botin__stat" />
            ) : null}
            {items.map(({ item, quantity }) => (
              <ItemSlot key={item.name} item={item} quantity={quantity} />
            ))}
          </ul>
        ) : (
          <ul className="grid gap-1 text-ink" role="list">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {chain && (
          <div className="mt-3 border-t border-line pt-3">
            <AchievementChain {...chain} />
          </div>
        )}
      </div>
    </section>
  )
}
