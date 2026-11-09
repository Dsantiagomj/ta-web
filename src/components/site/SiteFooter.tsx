import { useId } from 'react'

import { Lockup } from '@/components/brand/Lockup'

import { SocialIcon, UpIcon } from './icons'
import { KOFI_URL, LEGAL_LINKS, SECTIONS, social, TOP_ANCHOR } from './nav'
import { Soon } from './Soon'
import { StaticImg } from './StaticImg'
import { siteShellStrings } from './strings'
import './site.css'

const s = siteShellStrings.footer
const CHANNELS = (['twitch', 'kick', 'youtube'] as const).map(social)

/**
 * El pie de todo el sitio (DESIGN.md, Layout: Footer). Arriba, tres columnas: Torre con
 * los directos; Explorar, con las cinco secciones; y Comunidad, con el Discord, Ko-fi y
 * los canales de Torre en casillas de inventario. Abajo, la banda legal. Cada enlace sale
 * una sola vez: Discord y Ko-fi van en sus tarjetas y las casillas son los tres canales.
 * Sin estado del directo todavía: la tarjeta dice dónde emite, no si está emitiendo.
 */
export function SiteFooter({ year }: { year: number }) {
  // Ids propios: el catálogo /sistema pinta el pie una vez por tema y modo.
  const id = useId()
  return (
    <footer className="site-ft">
      <div className="site-ft__in">
        <section className="ft-torre" aria-labelledby={`${id}-ft-torre`}>
          <StaticImg
            className="ft-torre__face"
            src="/img/torre/recorte.webp"
            width={136}
            height={136}
            alt=""
            loading="lazy"
          />
          <div>
            <h2 className="ft-torre__name" id={`${id}-ft-torre`}>
              {s.torre}
            </h2>
            <p className="ft-torre__bio">{s.bio}</p>
            <div className="live-card">
              <span className="live-card__dot" aria-hidden="true" />
              <p>
                <span className="live-card__t">{s.liveTitle}</span>
                <span className="live-card__d">{s.liveText}</span>
              </p>
            </div>
          </div>
        </section>

        <nav className="ft-explore" aria-labelledby={`${id}-ft-explore`}>
          <h2 className="ft-eyebrow" id={`${id}-ft-explore`}>
            {s.explore}
          </h2>
          <ul role="list">
            {SECTIONS.map((sec) => (
              <li key={sec.key}>
                {sec.soon ? (
                  <span className="ft-soon" aria-disabled="true">
                    {sec.title} <Soon />
                  </span>
                ) : (
                  <a href={sec.href}>{sec.title}</a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section className="ft-com" aria-labelledby={`${id}-ft-com`}>
          <h2 className="ft-h" id={`${id}-ft-com`}>
            {s.community}
          </h2>
          <a className="ft-join" href={social('discord').href} rel="noopener">
            <span className="ft-join__i" aria-hidden="true">
              <SocialIcon name="discord" />
            </span>
            <span>
              <span className="ft-join__t">{s.discordTitle}</span>
              <span className="ft-join__d">{s.discordText}</span>
            </span>
          </a>
          <a className="ft-kofi" href={KOFI_URL} rel="noopener">
            <SocialIcon name="kofi" />
            <span>
              <span className="ft-kofi__t">{s.kofiTitle}</span>
              <span className="ft-kofi__d">{s.kofiText}</span>
            </span>
          </a>
          <h3 className="ft-h3">{s.follow}</h3>
          <ul className="slots" role="list">
            {CHANNELS.map((c) => (
              <li key={c.key}>
                <a className="slot" href={c.href} rel="noopener">
                  <span className="slot__w" aria-hidden="true">
                    <SocialIcon name={c.key} />
                  </span>
                  <span className="slot__n">{c.name}</span>
                  <span className="slot__h">{c.handle}</span>
                </a>
              </li>
            ))}
          </ul>
          <a className="ft-up" href={`#${TOP_ANCHOR}`}>
            <UpIcon />
            {s.up}
          </a>
        </section>
      </div>

      <div className="site-ft__legal">
        <Lockup size="footer" />
        <nav className="ft-legal" aria-label={s.legal}>
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.name}
            </a>
          ))}
        </nav>
        <p className="ft-copy">{s.copyright(year)}</p>
        <p className="ft-disc">{s.disclaimer}</p>
      </div>
    </footer>
  )
}
