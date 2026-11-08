import { Picture } from '@/components/ui/Picture'
import type { IndexAchievement, IndexView, IndexZone } from '@/lib/achievements/metalogros'
import { metalogrosStrings as s } from '@/lib/achievements/strings'

// Solo su propia hoja: importar también game.css y achievement.css hacía que Turbopack
// partiera las de las guías y los logros en más trozos, y su LCP subía medio segundo.
import './metalogros.css'
import { MetalogrosIsland } from './MetalogrosIsland'

/** El JSON dentro de <script>: sin «<», para que ningún nombre pueda cerrar la etiqueta. */
const forScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
      </g>
    </svg>
  )
}

/** El arte de la ficha: el representante sobre su suelo, o el icono del primer logro. */
function ZoneArt({ zone, className }: { zone: IndexZone; className: string }) {
  if (zone.art) {
    return (
      <span className={className} aria-hidden="true">
        <Picture image={zone.art} alt="" sizes="96px" />
      </span>
    )
  }
  if (zone.icon) {
    return (
      <span className={`${className} ${className}--icon`} aria-hidden="true">
        <span className="well">
          <Picture image={zone.icon} alt="" />
        </span>
      </span>
    )
  }
  return <span className={`${className} ${className}--none`} aria-hidden="true" />
}

function Tile({ zone }: { zone: IndexZone }) {
  const inner = (
    <>
      <ZoneArt zone={zone} className="zart" />
      <span className="vd-tile__n">{zone.name}</span>
      {zone.count && <span className="vd-tile__c">{zone.count}</span>}
      {zone.preparing && <span className="ztag">{s.preparing}</span>}
    </>
  )
  // Sin nada publicado: se ve, en el orden de lectura, sin enlace ni panel.
  return (
    <li className="vd-cell">
      {zone.off ? (
        <div className="vd-tile vd-tile--off" aria-disabled="true" data-zone={zone.anchor}>
          {inner}
        </div>
      ) : (
        <a className="vd-tile" href={`#${zone.anchor}`} data-zone={zone.anchor}>
          {inner}
        </a>
      )}
    </li>
  )
}

function AchievementCard({ achievement }: { achievement: IndexAchievement }) {
  const inner = (
    <>
      <span className="well acard__icon" aria-hidden="true">
        {achievement.icon && <Picture image={achievement.icon} alt="" />}
      </span>
      <span className="acard__txt">
        <span className="acard__n">{achievement.name}</span>
        {achievement.meta && <span className="acard__m">{achievement.meta}</span>}
        {achievement.off && <span className="acard__prep">{s.preparing}</span>}
      </span>
    </>
  )
  return (
    <li>
      {achievement.href ? (
        <a className="acard" href={achievement.href}>
          {inner}
        </a>
      ) : (
        <div className="acard acard--off" aria-disabled="true">
          {inner}
        </div>
      )}
    </li>
  )
}

/** La lista de una zona: sin JavaScript va bajo las fichas; con él, es el contenido del panel. */
function ZoneDetail({ zone }: { zone: IndexZone }) {
  return (
    <section className="vd-zone" id={zone.anchor} data-zone={zone.anchor}>
      <header className="zone__head">
        <ZoneArt zone={zone} className="giverart vd-zart" />
        <div>
          <h2 className="zone__t" tabIndex={-1}>
            {zone.name}
          </h2>
          {zone.counts && <p className="zone__c">{zone.counts}</p>}
          {zone.prep && <p className="zone__prep">{zone.prep}</p>}
        </div>
      </header>
      {zone.achievements.length > 0 && (
        <ul className="acards" role="list">
          {zone.achievements.map((achievement) => (
            <AchievementCard key={achievement.name} achievement={achievement} />
          ))}
        </ul>
      )}
      {zone.guides.length > 0 && (
        <>
          <h3 className="zone__sub">{zone.achievements.length ? s.otherGuides : s.guides}</h3>
          <ul className="zone__guides" role="list">
            {zone.guides.map((guide) => (
              <li key={guide.href}>
                <a className="idx__link" href={guide.href}>
                  {guide.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/**
 * El índice de metalogros, variante D «Buscador + mosaico» (DESIGN.md, Metalogros index): el
 * buscador arriba y las zonas en fichas con su representante, en tres grupos. Sin JavaScript
 * las fichas son enlaces a la lista de cada zona, que va debajo; con la isla, una ficha abre
 * esa lista en un panel a lo ancho de su fila y el buscador busca zonas, logros y misiones.
 */
export function MetalogrosIndex({ view }: { view: IndexView }) {
  const zones = view.sections.flatMap((section) => section.zones)
  return (
    <main id="contenido" className="idx vd">
      <header className="idx__head">
        <h1 className="idx__t">{s.title}</h1>
        <p className="idx__lead">{s.lead}</p>
        <p className="idx__stats">{view.stats}</p>
      </header>

      <div className="combo" data-js-only="">
        <label className="combo__l" htmlFor="metalogros-q">
          {s.searchLabel}
        </label>
        <div className="combo__box">
          <SearchIcon />
          <input
            id="metalogros-q"
            type="text"
            role="combobox"
            aria-expanded="false"
            aria-controls="metalogros-list"
            aria-autocomplete="list"
            aria-describedby="metalogros-st"
            autoComplete="off"
            spellCheck={false}
            placeholder={s.searchPlaceholder}
          />
          <ul
            id="metalogros-list"
            className="combo__list"
            role="listbox"
            aria-label={s.results}
            hidden
          />
        </div>
        <p className="combo__st" id="metalogros-st" role="status" />
      </div>

      {view.sections
        .filter((section) => section.zones.length > 0)
        .map((section) => (
          <section key={section.key} className="vd-group" aria-labelledby={`grupo-${section.key}`}>
            <h2 className="vd-group__h" id={`grupo-${section.key}`}>
              {section.title} <span className="vd-group__n">{section.zones.length}</span>
            </h2>
            <p className="vd-group__d">{section.description}</p>
            <ul className="vd-grid" role="list">
              {section.zones.map((zone) => (
                <Tile key={zone.anchor} zone={zone} />
              ))}
            </ul>
          </section>
        ))}

      <div className="vd-zones">
        {zones
          .filter((zone) => !zone.off)
          .map((zone) => (
            <ZoneDetail key={zone.anchor} zone={zone} />
          ))}
      </div>
      <script
        type="application/json"
        id="metalogros-data"
        dangerouslySetInnerHTML={{ __html: forScript(view.search) }}
      />
      <MetalogrosIsland />
    </main>
  )
}
