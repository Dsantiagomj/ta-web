import { ArrowIcon } from '@/components/site/icons'
import { social } from '@/components/site/nav'
import type { LiveState } from '@/lib/site/live'

import { homeStrings } from './strings'

const s = homeStrings.live

/**
 * Lo primero bajo la cabecera mientras Torre está en directo; en el móvil, una sola línea
 * para que la búsqueda siga en la primera pantalla. Sin directo, nada.
 */
export function LiveStrip({ live }: { live: LiveState }) {
  if (!live.live) return null
  return (
    <section className="live" aria-label={s.label}>
      <div className="home-wrap">
        <a className="live__card" href={social('twitch').href} rel="noopener">
          <span className="live__txt">
            <span className="live__where">{s.where}</span>
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
