import type { CSSProperties, ReactNode } from 'react'

import { OBJECTIVE_ICONS, GAME_ICONS } from '@/components/game/game-icons'
import { GuideRichText } from '@/components/game/GuideRichText'
import { IconWell } from '@/components/game/IconWell'
import { CloseIcon } from '@/components/game/icons'
import { CopyName } from '@/components/game/Item'
import { Picture } from '@/components/ui/Picture'
import type {
  ChecklistView,
  NeedGroupView,
  NeedRowView,
  QuestRowView,
  StepView,
  TextPart,
  TotalRowView,
} from '@/lib/checklists/page'
import { checklistPageStrings as s } from '@/lib/checklists/strings'
import { formatAmount } from '@/lib/guides/display'

import '@/components/ui/ui.css'
// checklist.css va dentro de achievement.css: una hoja menos en /<slug>.
import '../achievement/achievement.css'

const SEARCH_ICON = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
const chevron = (d: string) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      d={d}
    />
  </svg>
)

/** El huevo del Dofus en la cabecera, sin marco, con el brillo de su color. */
export function ChecklistHeader({ view }: { view: ChecklistView }) {
  return (
    <header className="ck-head">
      <span className="ck-egg" aria-hidden="true">
        {view.egg && <Picture image={view.egg} alt="" priority />}
      </span>
      <div>
        <h1 className="ck-head__t">{view.title}</h1>
        <p className="ck-head__m">{view.description}</p>
      </div>
    </header>
  )
}

export const eggStyle = (color?: string) =>
  (color ? { '--egg': color } : undefined) as CSSProperties | undefined

/** Las pestañas: sin JavaScript son enlaces a cada parte, que se ven una debajo de otra. */
export function ChecklistTabs({ view }: { view: ChecklistView }) {
  const tab = (id: string, label: string, badge?: number) => (
    <a className="ck-seg__b hit-target" href={`#ck-p-${id}`} data-tab={id} key={id}>
      {label}
      {badge ? <span className="ck-badge">{badge}</span> : null}
    </a>
  )
  return (
    <div className="ck-tabsrow">
      <nav className="ck-seg ck-tabs" aria-label={s.tabsLabel} data-ck-tabs>
        {tab('diario', s.tabs.diary)}
        {view.prerequisites.count > 0 && tab('pre', s.tabs.prerequisites, view.prerequisites.count)}
        {view.totalsCount > 0 && tab('obj', s.tabs.items, view.totalsCount)}
      </nav>
      <label className="ck-search ck-find">
        <span className="sr-only">{s.searchLabel}</span>
        {SEARCH_ICON}
        <input type="search" placeholder={s.search} autoComplete="off" data-ck-q />
      </label>
    </div>
  )
}

function Tags({ step }: { step: StepView }) {
  return (
    <>
      {step.closedBy && <span className="ck-tag ck-tag--stop">{s.closedIn(step.closedBy)}</span>}
      {step.closes.map((n) => (
        <span key={n} className="ck-tag ck-tag--done">
          {s.closes(n)}
        </span>
      ))}
    </>
  )
}

/** La lista de pasos del Diario: cada uno enlaza su paso, que la isla abre al lado. */
export function StepList({ steps }: { steps: StepView[] }) {
  return (
    <div className="ck-list">
      <p className="sr-only" role="status" data-ck-status />
      <ol className="ck-rows" role="list" aria-label={s.stepsLabel}>
        {steps.map((step) => (
          <li key={step.stepId} className="ck-row" data-n={step.n} data-search={step.search}>
            <a className="ck-row__b" href={`#paso-${step.n}`} data-pick={step.n}>
              <span className="ck-row__n">{step.n}</span>
              <span className="ck-row__x">
                <span className="ck-row__t">{step.label}</span>
                {step.zone && <span className="ck-row__z">{step.zone}</span>}
              </span>
            </a>
            {(step.closedBy || step.closes.length > 0) && (
              <span className="ck-row__tags">
                <Tags step={step} />
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="ck-empty" data-ck-empty hidden />
    </div>
  )
}

function Parts({ parts }: { parts: TextPart[] }) {
  return parts.map((part, index) =>
    typeof part === 'string' ? (
      part
    ) : (
      <a key={index} href={part.href}>
        {part.text}
      </a>
    ),
  )
}

/** El texto de Torre tal cual, con su rojo («detente aquí») y su verde («aquí se resuelve»). */
function GuideText({ step }: { step: StepView }) {
  return (
    <p className="ck-text">
      {step.segments.map((segment, index) => (
        <span key={index}>
          {index > 0 && ' '}
          {segment.kind === 'plain' ? (
            <Parts parts={segment.parts} />
          ) : (
            <mark className={`hl hl--${segment.kind}`}>
              <Parts parts={segment.parts} />
            </mark>
          )}
        </span>
      ))}
    </p>
  )
}

/** «Entrégale a Wello: 3 x Muestra» con la cantidad en negrita, como el juego. */
function ObjectiveText({ text }: { text: string }) {
  return text
    .split(/(\d[\d\s]*) x /)
    .map((part, index) => (index % 2 === 1 ? <b key={index}>{part} × </b> : part))
}

function GameIcon({ file, px }: { file: { src: string }; px: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- archivo estático ya en WebP
  return <img src={file.src} width={px} height={px} alt="" loading="lazy" decoding="async" />
}

/**
 * Los objetivos de la misión donde para el paso, con la línea de Torre delante del objetivo
 * donde para. Si para después del último (la etapa que DofusDB no lista), la línea va al final.
 */
function Route({ route }: { route: NonNullable<QuestRowView['route']> }) {
  const { objectives, line } = route
  const at = Math.min(Math.max(line.at, 0), objectives.length)
  const lineRow = (
    <li key="line" className={`ck-line ck-line--${line.kind}`}>
      {line.text}
    </li>
  )
  const rows = objectives.map((objective, index) => (
    <li key={index} className="ck-o" data-i={index}>
      <span className="well ck-o__ic" aria-hidden="true">
        <GameIcon file={OBJECTIVE_ICONS[objective.kind]} px={22} />
      </span>
      <span className="ck-o__t">
        <ObjectiveText text={objective.text} />
      </span>
      <span data-ck-coord={index} />
    </li>
  ))
  return (
    <ol className="ck-route" role="list">
      {[...rows.slice(0, at), lineRow, ...rows.slice(at)]}
    </ol>
  )
}

function QuestRow({ quest }: { quest: QuestRowView }) {
  const kind = quest.kind === 'mandatory' ? null : s.questKinds[quest.kind]
  return (
    <li className="ck-q" data-q={quest.dofusId} {...(quest.route && { 'data-routed': '' })}>
      <div className="ck-q__row">
        <span className="ck-q__mark" aria-hidden="true">
          <GameIcon file={GAME_ICONS.quest} px={22} />
        </span>
        <span className="ck-q__x">
          {quest.href ? (
            <a className="ck-q__t" href={quest.href} title={s.guideTitle}>
              {quest.name}
            </a>
          ) : (
            <span className="ck-q__t">{quest.name}</span>
          )}
          <span className="ck-q__m" data-ck-npc />
          {(kind || quest.note) && (
            <span className="ck-q__m">{[kind, quest.note].filter(Boolean).join(' · ')}</span>
          )}
        </span>
        <span className="ck-q__side">
          <span data-ck-start />
          {quest.level != null && <span className="ck-q__lv">{s.questLevel(quest.level)}</span>}
        </span>
      </div>
      {quest.route && <Route route={quest.route} />}
    </li>
  )
}

function NeedRow({ row, extra }: { row: NeedRowView; extra?: ReactNode }) {
  const amount = <b>{formatAmount(row.quantity)} ×</b>
  if (row.kind === 'label') {
    return (
      <li className="row">
        <IconWell />
        <span>
          {amount} <span className="ck-plain">{row.name}</span>
          {row.note && <span className="ck-item__r">{row.note}</span>}
          {extra}
        </span>
      </li>
    )
  }
  return (
    <li className="row copyhost">
      <IconWell image={row.icon} />
      <span>
        {amount} <CopyName name={row.name} />
        {row.note && <span className="ck-item__r">{row.note}</span>}
        {extra}
      </span>
    </li>
  )
}

function NeedGroups({ groups, heading }: { groups: NeedGroupView[]; heading: number }) {
  const H = `h${heading}` as 'h4'
  return groups.map((group) => (
    <div key={group.title} className="ck-needs__g">
      <H className="ck-micro">{group.title}</H>
      <ul role="list" className="needs__items">
        {group.rows.map((row, index) => (
          <NeedRow key={index} row={row} />
        ))}
      </ul>
    </div>
  ))
}

/** Un paso entero. Sin JavaScript se ven todos, uno detrás de otro; con ella, el elegido. */
export function StepDetail({ step, last }: { step: StepView; last: number }) {
  const id = (part: string) => `ck-${part}-${step.n}`
  return (
    <article
      className="ck-step"
      id={`paso-${step.n}`}
      data-step={step.n}
      aria-labelledby={id('t')}
      {...(step.n === 1 && { 'data-open': '' })}
    >
      <div className="ck-step__scroll">
        <header className="ck-dh">
          <div className="ck-dh__ban" aria-hidden="true">
            {step.banner && (
              <span className="ck-dh__bg">
                <Picture image={step.banner} alt="" sizes="160px" />
              </span>
            )}
            <span className="ck-dh__shade" />
            <span className="ck-dh__num">{step.n}</span>
            {step.zone && <span className="ck-dh__zone">{step.zone}</span>}
            <span className="ck-dh__ground" />
            {step.figure?.image && (
              <span className="ck-dh__fig">
                <Picture image={step.figure.image} alt="" sizes="104px" />
              </span>
            )}
          </div>
          <div className="ck-dh__main">
            <div className="ck-dh__title">
              {step.icon && <IconWell image={step.icon} />}
              <h2 className="ck-dh__t" id={id('t')}>
                <span className="sr-only">{s.stepPrefix(step.n)}</span>
                {step.label}
              </h2>
            </div>
            <p className="ck-micro ck-dh__k">{s.guideText}</p>
            <GuideText step={step} />
            {(step.hasStop || step.hasResolve) && (
              <p className="ck-legend">
                {step.hasStop && <span className="l-stop">{s.legendStop}</span>}
                {step.hasResolve && <span className="l-done">{s.legendResolve}</span>}
              </p>
            )}
            {(step.closedBy || step.closes.length > 0) && (
              <p className="ck-dh__rel">
                {step.closedBy && (
                  <a
                    className="ck-tag ck-tag--stop hit-target"
                    href={`#paso-${step.closedBy}`}
                    data-pick={step.closedBy}
                  >
                    {s.closedIn(step.closedBy)}
                  </a>
                )}
                {step.closes.map((n) => (
                  <a
                    key={n}
                    className="ck-tag ck-tag--done hit-target"
                    href={`#paso-${n}`}
                    data-pick={n}
                  >
                    {s.closes(n)}
                  </a>
                ))}
              </p>
            )}
            {step.figure?.name && (
              <p className="ck-dh__fn">
                {step.figure.role && `${step.figure.role}: `}
                <b>{step.figure.name}</b>
              </p>
            )}
          </div>
        </header>
        {step.note && (
          <div className="ck-note">
            <b>{s.note}</b> <GuideRichText content={step.note} />
          </div>
        )}
        {step.needs.length > 0 && (
          <section className="ck-sec" aria-labelledby={id('ne')}>
            <h3 className="ck-h3" id={id('ne')}>
              {s.needs}
            </h3>
            <NeedGroups groups={step.needs} heading={4} />
          </section>
        )}
        {step.achievements.length > 0 && (
          <section className="ck-sec" aria-labelledby={id('lo')}>
            <h3 className="ck-h3" id={id('lo')}>
              {s.achievements}
            </h3>
            <ul role="list" className="ck-rowlist">
              {step.achievements.map((achievement) => (
                <li key={achievement.name} className="row">
                  {achievement.icon ? (
                    <IconWell image={achievement.icon} />
                  ) : (
                    <IconWell icon="achievement" />
                  )}
                  <span>
                    {achievement.href ? (
                      <a href={achievement.href}>{achievement.name}</a>
                    ) : (
                      achievement.name
                    )}
                    {achievement.some && <span className="ck-item__r">{s.achievementSome}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {step.bosses.length > 0 && (
          <section className="ck-sec" aria-labelledby={id('je')}>
            <h3 className="ck-h3" id={id('je')}>
              {s.bosses}
            </h3>
            <ul role="list" className="ck-rowlist">
              {step.bosses.map((boss) => (
                <li key={boss.name} className="row">
                  {boss.image ? <IconWell image={boss.image} /> : <IconWell icon="combat" />}
                  <span>{boss.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="ck-sec" aria-labelledby={id('mi')}>
          <h3 className="ck-h3" id={id('mi')}>
            {s.quests}
          </h3>
          {step.quests.length > 0 ? (
            <>
              <p className="ck-q__howto">{s.questsHowto}</p>
              <ol className="ck-qs" role="list">
                {step.quests.map((quest) => (
                  <QuestRow key={quest.dofusId} quest={quest} />
                ))}
              </ol>
            </>
          ) : (
            <p className="ck-muted">{s.noQuests}</p>
          )}
        </section>
      </div>
      <footer className="ck-foot">
        {step.n > 1 ? (
          <a className="ck-ghost hit-target" href={`#paso-${step.n - 1}`} data-pick={step.n - 1}>
            {chevron('M10 3.5 5.5 8l4.5 4.5')}
            <span className="sr-only">{s.previous}: </span>
            {step.n - 1}
          </a>
        ) : (
          <span />
        )}
        {step.n < last && (
          <a className="ck-ghost hit-target" href={`#paso-${step.n + 1}`} data-pick={step.n + 1}>
            <span className="sr-only">{s.next}: </span>
            {step.n + 1}
            {chevron('M6 3.5 10.5 8 6 12.5')}
          </a>
        )}
      </footer>
    </article>
  )
}

/** Prerrequisitos: la introducción de Torre y sus grupos, tal cual. */
export function Prerequisites({ view }: { view: ChecklistView }) {
  const { intro, groups } = view.prerequisites
  return (
    <div className="ck-pad">
      <h2 className="sr-only">{s.tabs.prerequisites}</h2>
      {intro && <p className="ck-text ck-intro">{intro}</p>}
      {groups.map((group, index) => (
        <section key={index} className="ck-pg" aria-labelledby={`ck-pg-${index}`}>
          <h3 className="ck-micro ck-pg__h" id={`ck-pg-${index}`}>
            {group.title}
          </h3>
          <ul className="ck-pres" role="list">
            {group.rows.map((row) => (
              <li key={row.key} className="ck-pre">
                {row.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function TotalSlot({ row }: { row: TotalRowView }) {
  const steps = <span className="ck-slot__s">{s.totalsSteps(row.steps)}</span>
  return (
    <li className={`ck-slot${row.kind === 'item' ? ' copyhost' : ''}`}>
      <span className="ck-slot__w copywell" aria-hidden="true">
        {row.kind === 'item' && row.icon && <Picture image={row.icon} alt="" />}
        <span className="ck-slot__q">{formatAmount(row.quantity)}</span>
      </span>
      <span className="ck-slot__n">
        <span className="sr-only">{formatAmount(row.quantity)} × </span>
        {row.kind === 'item' ? (
          <CopyName name={row.name} />
        ) : (
          <span className="ck-plain">{row.name}</span>
        )}
      </span>
      {steps}
    </li>
  )
}

/** Objetos: todo lo que piden los pasos, sumado, por grupos. */
export function Totals({ view }: { view: ChecklistView }) {
  return (
    <div className="ck-pad">
      <h2 className="sr-only">{s.tabs.items}</h2>
      <p className="ck-text ck-intro">{s.totalsIntro}</p>
      <div className="ck-groups">
        {view.totals.map((group, index) => (
          <section key={group.title} aria-labelledby={`ck-tg-${index}`}>
            <h3 className="ck-micro ck-gh" id={`ck-tg-${index}`}>
              {group.title}
            </h3>
            <ul className="ck-slots" role="list">
              {group.rows.map((row, rowIndex) => (
                <TotalSlot key={rowIndex} row={row} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/** La hoja de abajo de los móviles, donde la isla abre cada paso. */
export function StepSheet() {
  return (
    <dialog className="ck-sheet" aria-label={s.stepsLabel} data-ck-sheet>
      <div className="ck-sheet__grab" aria-hidden="true" />
      <button type="button" className="ck-x" data-ck-close aria-label={s.close}>
        <CloseIcon />
      </button>
    </dialog>
  )
}
