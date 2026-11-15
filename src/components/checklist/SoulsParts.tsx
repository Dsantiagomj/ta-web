import { Callout } from '@/components/ui/Callout'
import { Picture } from '@/components/ui/Picture'
import type { SoulGroup, SoulsView, SoulView } from '@/lib/checklists/souls'
import { soulsStrings as o } from '@/lib/checklists/strings'

import { DOTS, SEARCH_ICON } from './ChecklistParts'
import { progressStrings as p } from './progress-strings'

// La página de una checklist de almas (el Ocre), como la herramienta de Torre: las etapas (o las
// regiones) al lado y una a la vez, con sus almas como cartas que se marcan. Todo se pinta en el
// servidor, las dos vistas enteras; sin JavaScript se ven todas las etapas seguidas, sin lista,
// casillas ni controles. La isla (SoulsIsland.tsx, souls-ui.ts) elige la vista, la etapa o la
// región, filtra, busca, marca y guarda; nunca mueve lo que pinta React.

/** Los avisos de Torre sobre la checklist (los de sus prerrequisitos), tal cual. */
export function SoulsIntro({ view }: { view: SoulsView }) {
  if (!view.intro && !view.notes.length) return null
  return (
    <div className="sl-intro">
      {view.intro && <p className="ck-text">{view.intro}</p>}
      {view.notes.map((note, index) => (
        <Callout key={index} variant="warning" title={note.title}>
          <p>{note.text}</p>
        </Callout>
      ))}
    </div>
  )
}

/** La franja del progreso: el porcentaje, la barra y las almas que se tienen. */
export function SoulsStrip({ view }: { view: SoulsView }) {
  return (
    <div className="ck-strip ck-js">
      <div className="ck-prog">
        <span className="ck-pct" data-sl-pct aria-hidden="true">
          {p.pct(0)}
        </span>
        <div
          className="progress ck-bar"
          role="progressbar"
          aria-label={o.barLabel(view.name)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          data-sl-bar
        >
          <span className="progress__fill" />
        </div>
        <span className="ck-prog__s">
          <b data-sl-done>0</b>/{view.counts.total} {o.unit}
        </span>
      </div>
    </div>
  )
}

/** Agrupar, el tipo, el buscador, ocultar las que se tienen y el menú «⋯». */
export function SoulsTools({ view }: { view: SoulsView }) {
  return (
    <div className="sl-tools">
      <div className="ck-seg sl-by ck-js" role="group" aria-label={o.groupBy}>
        {(['stage', 'region'] as const).map((by) => (
          <button
            key={by}
            type="button"
            className="ck-seg__b hit-target"
            aria-pressed={by === 'stage'}
            data-sl-by={by}
            disabled
            data-ck-wait
          >
            {by === 'stage' ? o.byStage : o.byRegion}
          </button>
        ))}
      </div>
      <div className="ck-cats sl-types ck-js" role="group" aria-label={o.typeLabel}>
        {(['all', 'boss', 'archi'] as const).map((type) => (
          <button
            key={type}
            type="button"
            className="ck-cat"
            aria-pressed={type === 'all'}
            data-sl-type={type}
            disabled
            data-ck-wait
          >
            {o.types[type]}{' '}
            <span className="ck-seg__c">
              {type === 'all' ? view.counts.total : view.counts[type]}
            </span>
          </button>
        ))}
      </div>
      <label className="ck-search ck-find sl-find ck-js">
        <span className="sr-only">{o.searchLabel}</span>
        {SEARCH_ICON}
        <input type="search" placeholder={o.search} autoComplete="off" data-sl-q />
      </label>
      <label className="ck-switch ck-js">
        <input type="checkbox" className="checkbox" data-sl-hide disabled data-ck-wait />
        {o.hideDone}
      </label>
      <div className="ck-tools ck-js">
        <button
          type="button"
          className="ck-iconbtn"
          aria-label={p.more}
          aria-expanded="false"
          aria-controls="ck-more"
          data-ck-more
          disabled
          data-ck-wait
        >
          {DOTS}
        </button>
        <div className="ck-more" id="ck-more" hidden>
          <button type="button" className="ck-ghost" data-ck-tool="backup">
            {p.backup}
          </button>
          <button type="button" className="ck-ghost" data-ck-tool="reset">
            {p.reset}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Dónde se lucha el alma: su mazmorra o, si no es de mazmorra, su subzona. */
const whereOf = (soul: SoulView) => soul.dungeon ?? soul.zone

type By = 'stage' | 'region'

const COPY_ICON = (
  <svg
    className="sl-soul__copy-i"
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
  >
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 3.5v-.4A1.6 1.6 0 0 0 8.9 1.5H3.1a1.6 1.6 0 0 0-1.6 1.6v5.8a1.6 1.6 0 0 0 1.6 1.6h.4" />
  </svg>
)

const TICK_ICON = (
  <svg
    className="sl-soul__copy-ok"
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
)

const ARROW = (to: 'prev' | 'next') => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={to === 'prev' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} />
  </svg>
)

/**
 * Un alma, como la carta de la herramienta de Torre: la imagen grande, el nombre y «mazmorra o
 * zona · Nv. N» debajo, copiar el nombre en una esquina y la casilla en la otra. Tocar la carta
 * la marca; copiar no. Todas miden lo mismo: el nombre y la línea de debajo caben en dos líneas
 * cada uno y, si no, se cortan; la casilla dice todo entero (aria-label). Sin etiqueta de jefe
 * o archi: el tipo lo dicen el filtro y el grupo.
 */
function Soul({ soul, by }: { soul: SoulView; by: By }) {
  const id = `sl-${by}-${soul.id}`
  const meta = [whereOf(soul), soul.level != null && o.level(soul.level)]
    .filter(Boolean)
    .join(' · ')
  return (
    <li
      className="sl-soul"
      data-soul={soul.id}
      data-stage={soul.stage}
      data-region={soul.region ?? o.noRegion}
      data-type={soul.type}
      data-search={soul.search}
      data-level={soul.level ?? undefined}
    >
      <input
        type="checkbox"
        className="checkbox sl-soul__chk ck-js"
        id={id}
        aria-label={[soul.name, meta].filter(Boolean).join(', ')}
        data-sl-own={soul.id}
        disabled
        data-ck-wait
      />
      <button
        type="button"
        className="sl-soul__copy ck-js"
        aria-label={o.copy(soul.name)}
        data-sl-copy={soul.name}
        disabled
        data-ck-wait
      >
        {COPY_ICON}
        {TICK_ICON}
      </button>
      <label className="sl-soul__b" htmlFor={id}>
        <span className="sl-soul__img" aria-hidden="true">
          {soul.image && <Picture image={soul.image} alt="" sizes="84px" />}
        </span>
        <span className="sl-soul__n" title={soul.name}>
          {soul.name}
        </span>
        <span className="sl-soul__m">{meta}</span>
      </label>
    </li>
  )
}

function Cards({ ids, by, souls }: { ids: number[]; by: By; souls: Map<number, SoulView> }) {
  return (
    <ul className="sl-list" role="list">
      {ids.map((id) => {
        const soul = souls.get(id)
        return soul ? <Soul key={id} soul={soul} by={by} /> : null
      })}
    </ul>
  )
}

const domId = (by: By, key: string) => `sl-${by}-${key.replace(/\W+/g, '-')}`

/**
 * Una etapa o una región: su título (la etapa con su número grande), lo que se tiene, el anillo
 * y sus almas; una región, por mazmorra y por subzona. La isla enseña una.
 */
function Panel({ group, by, souls }: { group: SoulGroup; by: By; souls: Map<number, SoulView> }) {
  const id = domId(by, group.key)
  return (
    <section className="sl-panel" aria-labelledby={id} data-sl-panel={group.key}>
      <header className="sl-ph">
        {by === 'stage' && (
          <span className="sl-ph__n" aria-hidden="true">
            {group.key}
          </span>
        )}
        <div className="sl-ph__x">
          <h2 className="sl-ph__t" id={id} tabIndex={-1}>
            {group.label}
          </h2>
          <p className="sl-ph__m ck-js" data-sl-sum>
            <b data-sl-sd>0</b> {o.of} <span data-sl-st>{group.souls.length}</span> {o.unit}
          </p>
        </div>
        <span className="sl-ring ck-js" aria-hidden="true" data-sl-ring>
          <svg viewBox="0 0 52 52" focusable="false">
            <circle className="sl-ring__t" cx="26" cy="26" r="22" />
            <circle className="sl-ring__f" cx="26" cy="26" r="22" pathLength={100} />
          </svg>
          <span className="sl-ring__v" data-sl-rv>
            {p.pct(0)}
          </span>
        </span>
      </header>
      {group.subgroups ? (
        group.subgroups.map((sub) => {
          const subId = `${id}--${sub.key.replace(/\W+/g, '-')}`
          return (
            <section key={sub.key} className="sl-sub" aria-labelledby={subId} data-sl-sub>
              <h3 className="sl-sh" id={subId}>
                {sub.label}{' '}
                <span className="sl-sh__c" data-sl-gc>
                  {o.groupCount(0, sub.souls.length)}
                </span>
              </h3>
              <Cards ids={sub.souls} by={by} souls={souls} />
            </section>
          )
        })
      ) : (
        <Cards ids={group.souls} by={by} souls={souls} />
      )}
    </section>
  )
}

/**
 * Una vista: la lista de las etapas o de las regiones (una columna al lado desde 1024px, una
 * fila que se desliza encima en el móvil), cada una con lo que se tiene y su barra, y los
 * paneles, con «Anterior» y «Siguiente» al final. Sin JavaScript no salen ni la lista ni los
 * botones: no harían nada.
 */
function View({
  by,
  groups,
  souls,
}: {
  by: By
  groups: SoulGroup[]
  souls: Map<number, SoulView>
}) {
  const navId = `sl-nav-${by}`
  return (
    <div className="sl-view" data-sl-view={by}>
      <nav className="sl-nav ck-js" aria-labelledby={navId}>
        <h2 className="sl-nav__k" id={navId}>
          {by === 'stage' ? o.stagesLabel : o.regionsLabel}
        </h2>
        <ul className="sl-nav__l" role="list">
          {groups.map((group) => (
            <li key={group.key} data-sl-item={group.key}>
              <button type="button" className="sl-st" data-sl-at={group.key} disabled data-ck-wait>
                {by === 'stage' && (
                  <span className="sl-st__n" aria-hidden="true">
                    {group.key}
                  </span>
                )}
                <span className="sl-st__k">
                  {by === 'stage' ? (
                    <>
                      <span className="sr-only">{o.stageNumber(group.key)} · </span>
                      {group.kind}
                    </>
                  ) : (
                    group.label
                  )}
                </span>
                <span className="sl-st__c" data-sl-sc>
                  {o.groupCount(0, group.souls.length)}
                </span>
                <span className="sl-st__bar" aria-hidden="true">
                  <span className="sl-st__fill" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sl-panels">
        <div className="sl-results ck-js" data-sl-results hidden>
          <h2 className="sl-results__t" data-sl-rq />
          <p className="sl-results__c" data-sl-rc />
        </div>
        {groups.map((group) => (
          <Panel key={group.key} group={group} by={by} souls={souls} />
        ))}
        <p className="ck-empty sl-empty" data-sl-empty hidden>
          {o.empty}
        </p>
        <nav
          className="sl-pn ck-js"
          aria-label={by === 'stage' ? o.otherStages : o.otherRegions}
          data-sl-pager
        >
          {(['prev', 'next'] as const).map((to) => (
            <button
              key={to}
              type="button"
              className={`sl-pn__b sl-pn__b--${to}`}
              data-sl-go={to}
              hidden
            >
              {to === 'prev' && ARROW('prev')}
              <span className="sl-pn__x">
                <span className="sl-pn__k">{to === 'prev' ? o.prev : o.next}</span>{' '}
                <span data-sl-gl />
              </span>
              {to === 'next' && ARROW('next')}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

/**
 * Las almas por etapa, en el orden de la misión, y por región. Se ve una vista: la que dice
 * `data-sl-shown` en la ventana (`.sl-win`), que pone la isla; sin él, por etapa (checklist.css).
 * Mientras se busca, encima de los paneles de cada vista sale cuántas coinciden.
 */
export function SoulsList({ view }: { view: SoulsView }) {
  const souls = new Map(view.souls.map((soul) => [soul.id, soul]))
  return (
    <div className="sl-groups">
      <p className="sr-only" role="status" data-sl-status />
      <View by="stage" groups={view.stages} souls={souls} />
      <View by="region" groups={view.regions} souls={souls} />
    </div>
  )
}
