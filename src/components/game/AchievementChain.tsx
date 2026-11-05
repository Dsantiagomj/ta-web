import { Picture } from '@/components/ui/Picture'
import { chainWindow } from '@/lib/guides/display'

import './game.css'
import { gameStrings } from './strings'
import type { Achievement } from './types'

const s = gameStrings.chain

export interface ChainQuest {
  title: string
  /** Sin href: la misión no tiene guía publicada todavía, o es la actual. */
  href?: string
}

/**
 * La cadena del logro en una línea (DESIGN.md, Achievement chain): la misión actual en
 * texto con aria-current, las demás enlazadas; las flechas son CSS, así que un lector de
 * pantalla oye una lista numerada.
 */
export function AchievementChain({
  achievement,
  quests,
  current,
}: {
  achievement: Achievement
  quests: ChainQuest[]
  /** Índice de la misión actual en quests. */
  current: number
}) {
  return (
    <nav aria-label={s.label} className="flex items-center gap-2.5 text-sm text-ink-2">
      {achievement.icon && <Picture image={achievement.icon} alt="" className="size-6 shrink-0" />}
      <div>
        {s.achievement} <a href={achievement.href}>{achievement.name}</a> ·{' '}
        {s.position(current + 1, quests.length)}{' '}
        <ol className="chain" role="list">
          {chainWindow(quests, current).map((quest, index) =>
            quest === null ? (
              <li key={`gap-${index}`} aria-hidden="true">
                {s.gap}
              </li>
            ) : quest === quests[current] ? (
              <li key={quest.title}>
                <strong aria-current="page" className="font-semibold text-ink">
                  {quest.title}
                </strong>
              </li>
            ) : (
              <li key={quest.title}>
                {quest.href ? <a href={quest.href}>{quest.title}</a> : quest.title}
              </li>
            ),
          )}
        </ol>
      </div>
    </nav>
  )
}
