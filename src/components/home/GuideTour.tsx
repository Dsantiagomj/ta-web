import { CoordinatesChip } from '@/components/game/Coordinates'
import { GAME_ICONS, type GameIconFile, TORRE_AVATAR } from '@/components/game/game-icons'
import { ArrowIcon } from '@/components/site/icons'
import { section } from '@/components/site/nav'
import { StaticImg } from '@/components/site/StaticImg'
import { Amount } from '@/components/ui/Amount'
import { Picture } from '@/components/ui/Picture'

import { GIVER_LEFT, GIVER_RIGHT, REWARD_ITEMS, STEP_SHOT } from './art'
import { homeStrings } from './strings'

const s = homeStrings.tour

/** El número de un punto sobre su parte de la guía: decorativo y nunca encima del texto. */
const Mark = ({ n, className = '' }: { n: number; className?: string }) => (
  <span className={className ? `spec__mark ${className}` : 'spec__mark'} aria-hidden="true">
    {n}
  </span>
)

/** Un icono del juego en su casilla, a 28px como mucho y nunca más grande que su archivo. */
const Well = ({ icon, alt = '' }: { icon: GameIconFile; alt?: string }) => {
  const size = Math.min(28, icon.size)
  return (
    <span className="iw">
      <StaticImg src={icon.src} width={size} height={size} alt={alt} loading="lazy" />
    </span>
  )
}

/**
 * «Una guía para cada misión» (DESIGN.md, Home): cuatro puntos y, al lado, la guía de verdad
 * de «Seis pies bajo tierra» en pequeño, con los mismos números sobre cada parte. Sin
 * JavaScript: los números emparejan cada punto con su parte. Donde hay animaciones ligadas
 * al scroll (home.css), el punto que pasa por el centro de la pantalla enmarca su parte, y
 * pasar el ratón por un punto también; con movimiento reducido, solo los números.
 */
export function GuideTour() {
  return (
    <section className="home-sec" aria-labelledby="h-tour">
      <div className="home-wrap tour">
        <div className="tour__txt">
          <h2 id="h-tour" className="home-h2 rv">
            {s.title}
          </h2>
          <p className="tour__lead rv">{s.lead}</p>
          <ol className="tour__steps">
            {s.steps.map((step, i) => (
              <li key={step.title} className="tour__step" data-tour-step={i + 1}>
                <span className="tour__n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <a className="go rv" href={section('misiones').href}>
            {s.more}
            <ArrowIcon className="go__arrow" />
          </a>
        </div>

        <figure className="spec" aria-labelledby="spec-cap">
          <figcaption id="spec-cap" className="sr-only">
            {s.caption}
          </figcaption>
          <div className="spec__page">
            <div className="spec__head" data-part="1">
              <Mark n={1} className="spec__mark--corner" />
              <picture className="spec__giver">
                <source media="(max-width: 35.99rem)" srcSet={GIVER_LEFT.avif} type="image/avif" />
                <source media="(max-width: 35.99rem)" srcSet={GIVER_LEFT.src} type="image/webp" />
                <source srcSet={GIVER_RIGHT.avif} type="image/avif" />
                <StaticImg
                  src={GIVER_RIGHT.src}
                  width={GIVER_RIGHT.width}
                  height={GIVER_RIGHT.height}
                  loading="lazy"
                />
              </picture>
              <p className="spec__t">{s.guide}</p>
              <p className="spec__meta">
                {s.meta[0]}
                <strong>{s.meta[1]}</strong>
              </p>
              <div className="spec__facts">
                <div>
                  <p className="spec__h">{s.prerequisites}</p>
                  <p className="irow">
                    <Well icon={GAME_ICONS.quest} />
                    {s.prerequisite}
                  </p>
                </div>
                <div>
                  <p className="spec__h">{s.needs}</p>
                  <p className="irow">
                    <Well icon={GAME_ICONS.combat} />
                    <span>
                      <b>1 ×</b> {s.fight}
                    </span>
                  </p>
                </div>
                <div className="spec__rew">
                  <p className="spec__h">{s.rewards}</p>
                  <p className="irow">
                    <Well icon={GAME_ICONS.xp} />
                    <span>
                      <b>
                        <Amount value={9800} />
                      </b>
                      {s.xp[0]}
                      <b>
                        <Amount value={16380} />
                      </b>
                      {s.xp[1]}
                    </span>
                  </p>
                  <p className="irow">
                    <Well icon={GAME_ICONS.kamas} />
                    <span>
                      <b>
                        <Amount value={390} />
                      </b>
                      {s.kamas}
                    </span>
                  </p>
                  <p className="irow">
                    <span className="spec__items">
                      {REWARD_ITEMS.map((item) => (
                        <span key={item.id} className="iw">
                          <Picture image={item.image} alt={item.name} />
                        </span>
                      ))}
                    </span>
                    <span>
                      <b>{REWARD_ITEMS.length}</b>
                      {s.items}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="spec__step">
              <span className="spec__n" aria-hidden="true">
                1
              </span>
              <div className="spec__body">
                <p>
                  {s.step[0]}
                  <strong>{s.step[1]}</strong>{' '}
                  <span className="spec__pin" data-part="2">
                    <CoordinatesChip x={7} y={-19} />
                    <Mark n={2} className="spec__mark--inline" />
                  </span>
                  {s.step[2]}
                </p>
                <div className="spec__shot" data-part="3">
                  <Mark n={3} />
                  <Picture
                    image={STEP_SHOT}
                    alt={s.shot}
                    sizes="(min-width: 64rem) 560px, calc(100vw - 80px)"
                  />
                </div>
              </div>
            </div>
            <div className="spec__torre" data-part="4">
              <Mark n={4} />
              <span className="spec__face">
                <StaticImg src={TORRE_AVATAR.src} width={48} height={48} loading="lazy" />
              </span>
              <div className="spec__bubble">
                <p className="spec__bt">{s.tipsTitle}</p>
                <p>
                  {s.tips[0]}
                  <strong>{s.tips[1]}</strong>
                  {s.tips[2]}
                </p>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  )
}
