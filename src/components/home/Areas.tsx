import type { ReactNode } from 'react'

import { section, type SectionKey } from '@/components/site/nav'
import { Soon } from '@/components/site/Soon'
import { StaticImg } from '@/components/site/StaticImg'
import { Amount } from '@/components/ui/Amount'
import { Picture } from '@/components/ui/Picture'
import type { SiteGuideCounts } from '@/lib/site/counts'

import { ASTRUB, CAST, CLASS_HEADS, CROCANTERIA, CRUNCHIDOR, DOFUS_TRIO } from './art'
import { homeStrings } from './strings'

const s = homeStrings.areas

/**
 * Una tarjeta: el enlace es el texto de su h3, así que su nombre es el título; la frase la
 * describe (aria-describedby) y el ::after del enlace cubre la tarjeta entera, que sigue
 * siendo un solo enlace y una sola parada de tabulador. Enlaza adonde enlaza el menú. Una
 * sección aún sin páginas (Clases, Mazmorras) sale apagada, sin enlace y con «Próximamente».
 */
function Area({
  sectionKey,
  title,
  text,
  art,
  big = false,
}: {
  sectionKey: SectionKey
  title: string
  text: ReactNode
  art: ReactNode
  big?: boolean
}) {
  const sec = section(sectionKey)
  const id = `area-${sectionKey}`
  const style = { '--color-section': sec.accent } as React.CSSProperties
  if (sec.soon) {
    return (
      <li className="area area--soon" style={style}>
        <span className="area__art">{art}</span>
        <h3 className="area__t">
          {title} <Soon />
        </h3>
        <p className="area__d">{text}</p>
      </li>
    )
  }
  return (
    <li className={big ? 'area areas__big' : 'area'} style={style}>
      <span className="area__art">{art}</span>
      <h3 className="area__t">
        <a className="area__a" href={sec.href} aria-describedby={id}>
          {title}
        </a>
      </h3>
      <p className="area__d" id={id}>
        {text}
      </p>
    </li>
  )
}

const lazyImg = { loading: 'lazy', width: 128, height: 128 } as const

/**
 * «Qué vas a encontrar» (DESIGN.md, Home): primero el cartel de las misiones a todo el ancho,
 * cuatro PNJ en la plaza de Astrub con las cifras de las guías publicadas y de sus logros;
 * después Guías de Dofus, Checklists, Clases y Mazmorras, en 2 × 2 con solo el título en el
 * móvil. Las cifras son las de la cabecera (loadSiteCounts), así que nunca discrepan.
 */
export function Areas({ counts }: { counts: SiteGuideCounts }) {
  return (
    <section className="home-sec" aria-labelledby="h-areas">
      <div className="home-wrap">
        <h2 id="h-areas" className="home-h2 rv">
          {s.title}
        </h2>
        <ul className="areas" role="list">
          <Area
            big
            sectionKey="misiones"
            title={s.quests}
            text={s.questsText(
              <span className="fig">
                <Amount value={counts.guides} />
              </span>,
              <span className="fig">
                <Amount value={counts.achievements} />
              </span>,
              counts,
            )}
            art={
              <>
                <span className="area__zone">
                  <Picture
                    image={ASTRUB}
                    alt=""
                    className="area__scene"
                    sizes="(min-width: 87.5rem) 1304px, calc(100vw - 48px)"
                  />
                </span>
                <span className="cast">
                  {CAST.map((npc, i) => (
                    <Picture
                      key={npc.src}
                      image={npc}
                      alt=""
                      className={`cast__p cast__p--${i + 1}`}
                    />
                  ))}
                </span>
              </>
            }
          />
          <Area
            sectionKey="dofus"
            title={s.dofus}
            text={s.dofusText}
            art={
              <span className="area__zone area__zone--plain">
                <span className="trio-eggs">
                  {DOFUS_TRIO.map((src) => (
                    <StaticImg key={src} src={src} {...lazyImg} />
                  ))}
                </span>
              </span>
            }
          />
          <Area
            sectionKey="checklists"
            title={s.checklists}
            text={s.checklistsText}
            art={
              <span className="area__zone area__zone--plain">
                <span className="mini" aria-hidden="true">
                  <span className="mini__bar">
                    <span />
                  </span>
                  {s.checklistsRows.map((row) => (
                    <span key={row.n} className={row.done ? 'mini__row is-done' : 'mini__row'}>
                      <span className="mini__box" />
                      <span className="mini__n">{row.n}</span>
                      <span className="mini__t">
                        <b>{row.zone}</b> {row.quest}
                      </span>
                    </span>
                  ))}
                </span>
              </span>
            }
          />
          <Area
            sectionKey="clases"
            title={s.classes}
            text={s.classesText}
            art={
              <span className="area__zone area__zone--plain">
                <span className="heads">
                  {CLASS_HEADS.map((src) => (
                    <span key={src} className="heads__slot">
                      <StaticImg src={src} loading="lazy" width={64} height={64} />
                    </span>
                  ))}
                </span>
              </span>
            }
          />
          <Area
            sectionKey="mazmorras"
            title={s.dungeons}
            text={s.dungeonsText}
            art={
              <>
                <span className="area__zone">
                  <Picture
                    image={CROCANTERIA}
                    alt=""
                    className="area__scene"
                    sizes="(min-width: 80rem) 320px, (min-width: 40rem) calc(50vw - 36px), calc(50vw - 22px)"
                  />
                </span>
                <Picture image={CRUNCHIDOR} alt="" className="area__fig" />
              </>
            }
          />
        </ul>
      </div>
    </section>
  )
}
