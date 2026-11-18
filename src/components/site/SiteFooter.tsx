import { useId } from 'react'

import { Lockup } from '@/components/brand/Lockup'

import { SocialIcon, UpIcon } from './icons'
import { resolveSiteSettings, type SiteSettings } from '@/lib/site-copy/resolve'

import { LEGAL_LINKS, type NavLink, type Section, SECTIONS, social, TOP_ANCHOR } from './nav'
import { NEW_TAB, NewTabNote } from './NewTab'
import { Soon } from './Soon'
import { StaticImg } from './StaticImg'
import { siteShellStrings } from './strings'
import './site.css'

const DEFAULT_SETTINGS = resolveSiteSettings(null)

const s = siteShellStrings.footer
const CHANNELS = ['twitch', 'kick', 'youtube'] as const

/**
 * El pie de todo el sitio (DESIGN.md, Layout: Footer). Arriba, tres columnas: Torre con
 * los directos; Explorar, con las secciones; y Comunidad, con el Discord, Ko-fi y
 * los canales de Torre en casillas de inventario. Abajo, la banda legal. Cada enlace sale
 * una sola vez: Discord y Ko-fi van en sus tarjetas y las casillas son los tres canales.
 * Sin estado del directo todavía: la tarjeta dice dónde emite, no si está emitiendo. Los
 * enlaces legales llegan de la colección pages (legalLinks); sin ellos, van a Squarespace.
 * Los textos, el nombre del © y las redes son de «Ajustes del sitio» (loadSiteSettings); las
 * secciones de Explorar, en su orden y sin las ocultas, de «Navegación» (loadNavigation).
 */
export function SiteFooter({
  year,
  legal = LEGAL_LINKS,
  settings = DEFAULT_SETTINGS,
  sections = SECTIONS,
}: {
  year: number
  legal?: NavLink[]
  settings?: SiteSettings
  sections?: Section[]
}) {
  // Ids propios: el catálogo /sistema pinta el pie una vez por tema y modo.
  const id = useId()
  const f = settings.footer
  const channels = CHANNELS.map((key) => social(key, settings.socials))
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
            <p className="ft-torre__bio">{f.bio}</p>
            <div className="live-card">
              <span className="live-card__dot" aria-hidden="true" />
              <p>
                <span className="live-card__t">{f.liveTitle}</span>
                <span className="live-card__d">{f.liveText}</span>
              </p>
            </div>
          </div>
        </section>

        <nav className="ft-explore" aria-labelledby={`${id}-ft-explore`}>
          <h2 className="ft-eyebrow" id={`${id}-ft-explore`}>
            {s.explore}
          </h2>
          <ul role="list">
            {sections.map((sec) => (
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
          <a className="ft-join" href={social('discord', settings.socials).href} {...NEW_TAB}>
            <span className="ft-join__i" aria-hidden="true">
              <SocialIcon name="discord" />
            </span>
            <span>
              <span className="ft-join__t">{f.discordTitle}</span>
              <span className="ft-join__d">{f.discordText}</span>
            </span>
            <NewTabNote />
          </a>
          <a className="ft-kofi" href={settings.socials.kofi.url} {...NEW_TAB}>
            <SocialIcon name="kofi" />
            <span>
              <span className="ft-kofi__t">{f.kofiTitle}</span>
              <span className="ft-kofi__d">{f.kofiText}</span>
            </span>
            <NewTabNote />
          </a>
          <h3 className="ft-h3">{s.follow}</h3>
          <ul className="slots" role="list">
            {channels.map((c) => (
              <li key={c.key}>
                <a className="slot" href={c.href} {...NEW_TAB}>
                  <span className="slot__w" aria-hidden="true">
                    <SocialIcon name={c.key} />
                  </span>
                  <span className="slot__n">{c.name}</span>
                  <span className="slot__h">{c.handle}</span>
                  <NewTabNote />
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
          {legal.map((l) => (
            <a key={l.href} href={l.href}>
              {l.name}
            </a>
          ))}
        </nav>
        <p className="ft-copy">{s.copyright(year, settings.name)}</p>
        <p className="ft-disc">{f.disclaimer}</p>
      </div>
    </footer>
  )
}
