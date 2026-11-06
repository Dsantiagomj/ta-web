import { useId, type ReactNode } from 'react'

import './game.css'
import { TORRE_AVATAR } from './game-icons'
import { gameStrings } from './strings'

/**
 * Las recomendaciones de Torre (DESIGN.md, Torre's tips): su avatar y un bocadillo con el
 * título dentro. Es el aviso de tipo «tip» en las guías.
 */
export function TorreTips({
  children,
  headingLevel = 3,
}: {
  children: ReactNode
  headingLevel?: 2 | 3 | 4
}) {
  const id = useId()
  const Heading = `h${headingLevel}` as const
  return (
    <aside className="torre" aria-labelledby={id}>
      <span className="torre__face">
        {/* eslint-disable-next-line @next/next/no-img-element -- archivo estático ya en WebP */}
        <img
          src={TORRE_AVATAR.src}
          width={TORRE_AVATAR.size}
          height={TORRE_AVATAR.size}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
      <div className="torre__box">
        <Heading id={id}>{gameStrings.torre.title}</Heading>
        <div className="torre__body">{children}</div>
      </div>
    </aside>
  )
}
