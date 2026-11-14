import { Callout } from '@/components/ui/Callout'
import { Picture } from '@/components/ui/Picture'
import type { SoulGroup, SoulsView, SoulView } from '@/lib/checklists/souls'
import { soulsStrings as o } from '@/lib/checklists/strings'

import { DOTS, SEARCH_ICON } from './ChecklistParts'
import { progressStrings as p } from './progress-strings'

// La página de una checklist de almas (el Ocre): las almas de «La eterna cosecha» como cromos
// que se marcan, por etapa o por región, con filtros por tipo y un buscador. Todo se pinta en el
// servidor, las dos vistas enteras; sin JavaScript se ven todas por etapa, sin casillas ni
// controles. La isla (SoulsIsland.tsx, souls-ui.ts) marca, elige la vista, filtra y guarda; nunca
// mueve lo que pinta React.

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

/**
 * Un alma: su casilla, su imagen, su nombre, su nivel y dónde se lucha. Sale en las dos vistas.
 * Todas las tarjetas miden lo mismo: el nombre y la línea de debajo caben en dos líneas cada uno
 * y, si no, se cortan; la casilla dice todo entero (aria-label). El tipo solo filtra.
 */
function Soul({ soul, by }: { soul: SoulView; by: By }) {
  const where = whereOf(soul)
  const id = `sl-${by}-${soul.id}`
  const meta = [soul.level != null && o.level(soul.level), where].filter(Boolean).join(' · ')
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
      <label className="sl-soul__b" htmlFor={id}>
        <span className="sl-soul__img well" aria-hidden="true">
          {soul.image && <Picture image={soul.image} alt="" sizes="48px" />}
        </span>
        <span className="sl-soul__x">
          <span className="sl-soul__n" title={soul.name}>
            {soul.name}
          </span>
          <span className="sl-soul__m">{meta}</span>
        </span>
      </label>
    </li>
  )
}

function Group({ group, by, souls }: { group: SoulGroup; by: By; souls: Map<number, SoulView> }) {
  const id = `sl-${by}-${group.key.replace(/\W+/g, '-')}`
  return (
    <section className="sl-group" aria-labelledby={id} data-sl-group={group.key}>
      <h2 className="sl-gh" id={id}>
        {group.label}{' '}
        <span className="sl-gh__c" data-sl-gc>
          {o.groupCount(0, group.souls.length)}
        </span>
      </h2>
      <ul className="sl-list" role="list">
        {group.souls.map((id) => {
          const soul = souls.get(id)
          return soul ? <Soul key={id} soul={soul} by={by} /> : null
        })}
      </ul>
    </section>
  )
}

/**
 * Las etapas al lado de la lista, por etapa: «Todas» y cada etapa con las almas que se tienen.
 * Elegir una enseña solo sus almas (la isla). En el escritorio, una columna; más estrecho, una
 * fila que se desliza encima de la lista. Sin JavaScript no sale: no haría nada.
 */
function Stages({ view }: { view: SoulsView }) {
  return (
    <nav className="sl-stages ck-js" aria-label={o.stagesLabel} data-sl-stages>
      <ul className="sl-stages__l" role="list">
        <li>
          <button
            type="button"
            className="sl-st sl-st--all"
            aria-pressed="true"
            data-sl-stage="all"
            disabled
            data-ck-wait
          >
            <span className="sl-st__k">{o.allStages}</span>
            <span className="sl-st__c" data-sl-sc>
              {o.groupCount(0, view.counts.total)}
            </span>
          </button>
        </li>
        {view.stages.map((group) => (
          <li key={group.key}>
            <button
              type="button"
              className="sl-st"
              aria-pressed="false"
              data-sl-stage={group.key}
              disabled
              data-ck-wait
            >
              <span className="sl-st__n" aria-hidden="true">
                {group.key}
              </span>
              <span className="sl-st__k">
                <span className="sr-only">{o.stageNumber(group.key)} · </span>
                {group.kind}
              </span>
              <span className="sl-st__c" data-sl-sc>
                {o.groupCount(0, group.souls.length)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Las almas por etapa, en el orden de la misión, y por región. Se ve una: la que dice
 * `data-sl-shown` en la ventana (`.sl-win`), que pone la isla; sin él, por etapa (checklist.css).
 */
export function SoulsList({ view }: { view: SoulsView }) {
  const souls = new Map(view.souls.map((soul) => [soul.id, soul]))
  return (
    <div className="sl-groups">
      <p className="sr-only" role="status" data-sl-status />
      <div className="sl-staged" data-sl-view="stage">
        <Stages view={view} />
        <div className="sl-staged__list">
          {view.stages.map((group) => (
            <Group key={group.key} group={group} by="stage" souls={souls} />
          ))}
        </div>
      </div>
      <div data-sl-view="region">
        {view.regions.map((group) => (
          <Group key={group.key} group={group} by="region" souls={souls} />
        ))}
      </div>
      <p className="ck-empty" data-sl-empty hidden>
        {o.empty}
      </p>
    </div>
  )
}
