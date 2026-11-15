import { ArrowIcon } from '@/components/site/icons'
import type { LiveState } from '@/lib/site/live'
import { siteSettingsDefaults } from '@/lib/site-copy/defaults'

import { homeStrings } from './strings'

const s = homeStrings.live

/**
 * Lo primero bajo la cabecera mientras Torre está en directo; en el móvil, una sola línea
 * para que la búsqueda siga en la primera pantalla. Sin directo, nada. El canal es el de
 * Twitch de «Ajustes del sitio».
 */
export function LiveStrip({
  live,
  twitch = siteSettingsDefaults.socials.twitch,
}: {
  live: LiveState
  twitch?: { url: string; handle: string }
}) {
  if (!live.live) return null
  return (
    <section className="live" aria-label={s.label}>
      <div className="home-wrap">
        <a className="live__card" href={twitch.url} rel="noopener">
          <span className="live__txt">
            <span className="live__where">{s.where(twitch.handle)}</span>
            <span className="live__t">{s.title}</span>
            {live.title && <span className="live__title">«{live.title}»</span>}
          </span>
          <span className="live__go">
            {s.go}
            <span className="live__more">{s.goMore}</span>
            <ArrowIcon className="live__arrow" />
          </span>
        </a>
      </div>
    </section>
  )
}
