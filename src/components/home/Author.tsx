import { ArrowIcon, SocialIcon } from '@/components/site/icons'
import { social } from '@/components/site/nav'
import { Picture } from '@/components/ui/Picture'
import type { LiveState } from '@/lib/site/live'

import { TORRE } from './art'
import { homeStrings } from './strings'

const s = homeStrings.author
const CHANNELS = (['twitch', 'kick', 'youtube'] as const).map(social)

/**
 * «Las guías son de Torre» (DESIGN.md, Home): su retrato, su frase, una sola invitación (el
 * Discord) y si está en directo. Sin directo, un aviso pequeño sobre los canales; en directo,
 * un titular con el enlace. Por eso el pie de la portada no repite a Torre ni sus canales.
 */
export function Author({ live }: { live: LiveState }) {
  return (
    <section className="home-sec author" aria-labelledby="h-torre">
      <div className="home-wrap author__in">
        <div className="author__art">
          <Picture
            image={TORRE}
            alt={s.portrait}
            sizes="(min-width: 52rem) 420px, 200px"
            className="author__img"
          />
        </div>
        <div>
          <h2 id="h-torre" className="home-h2 rv">
            {s.title}
          </h2>
          <p className="author__lead rv">{s.lead}</p>
          <a className="join" href={social('discord').href} rel="noopener">
            <span className="join__icon" aria-hidden="true">
              <SocialIcon name="discord" />
            </span>
            <span className="join__txt">
              <span className="join__t">{s.join}</span>
              <span className="join__d">{s.joinText}</span>
            </span>
            <ArrowIcon className="join__go" />
          </a>
          <div className="stream">
            {live.live ? (
              <div className="stream__on">
                <span className="stream__dot" aria-hidden="true" />
                <p className="stream__txt">
                  <span className="stream__t">{s.liveTitle}</span>
                  {live.title && <span className="stream__d">«{live.title}»</span>}
                </p>
                <a className="stream__go" href={social('twitch').href} rel="noopener">
                  {s.liveGo}
                  <ArrowIcon className="stream__arrow" />
                </a>
              </div>
            ) : (
              <p className="stream__off">
                <span className="stream__dot stream__dot--off" aria-hidden="true" />
                <span>
                  <strong>{s.offline[0]}</strong>
                  {s.offline[1]}
                </span>
              </p>
            )}
            <ul className="chan" role="list">
              {CHANNELS.map((channel) => (
                <li key={channel.key}>
                  <a href={channel.href} rel="noopener">
                    <span className="chan__icon" aria-hidden="true">
                      <SocialIcon name={channel.key} />
                    </span>
                    <span className="chan__txt">
                      <span className="chan__n">{channel.name}</span>
                      <span className="chan__h">
                        {channel.handle}
                        {s.channels[channel.key as 'twitch' | 'kick' | 'youtube']}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
