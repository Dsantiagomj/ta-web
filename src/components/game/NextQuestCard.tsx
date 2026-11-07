import { IMAGE_SIZES } from '@/components/ui/image-sizes'
import { Picture } from '@/components/ui/Picture'
import type { NextQuestCardData } from '@/lib/guides/page'

import './game.css'
import { gameStrings } from './strings'

const s = gameStrings.next

/**
 * La siguiente misión del logro, al final de la guía (DESIGN.md, Next quest card): toda la
 * tarjeta es un enlace a su guía, con su primera captura, el título y quién la da. Lo que
 * falta no se pinta.
 */
export function NextQuestCard({ card }: { card: NextQuestCardData }) {
  const { level, npc, coordinates } = card
  return (
    <a className="nextq" href={card.href} data-art={card.art ? '' : undefined}>
      {card.art && (
        <span className="nextq__art">
          <Picture image={card.art} alt="" sizes={IMAGE_SIZES.card} />
        </span>
      )}
      <span className="nextq__txt">
        <span className="nextq__k">{s.eyebrow}</span>
        <span className="nextq__t">{card.title}</span>
        {(level != null || npc) && (
          <span className="nextq__m">
            {level != null && (
              <>
                {s.level} <b>{level}</b>.
              </>
            )}
            {level != null && npc && ' '}
            {npc && (
              <>
                {s.givenBy} {npc}
                {coordinates && (
                  <>
                    {' '}
                    <b>{`[${coordinates.x},${coordinates.y}]`}</b>
                  </>
                )}{' '}
                {s.afterThis}
              </>
            )}
          </span>
        )}
      </span>
    </a>
  )
}
