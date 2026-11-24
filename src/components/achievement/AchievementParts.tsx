import { type CSSProperties, type Key, type ReactNode, useId } from 'react'

import { ChevronIcon } from '@/components/game/icons'
import { IconWell } from '@/components/game/IconWell'
import { CopyName } from '@/components/game/Item'
import { gameStrings } from '@/components/game/strings'
import {
  hasRewards,
  PrerequisiteRows,
  RewardRows,
  type QuestFactsData,
} from '@/components/game/QuestFacts'
import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import type {
  AchievementNeeds as Needs,
  AchievementObjectives as Objectives,
  AchievementPageView,
  CountsFor,
  GroupItem,
  QuestCard,
} from '@/lib/achievements/page'
import { UpdatedDate } from '@/components/ui/UpdatedDate'
import { formatAmount } from '@/lib/guides/display'
import { achievementPageStrings as s } from '@/lib/achievements/strings'

import '@/components/game/game.css'
import './achievement.css'

/** El icono del logro en su hueco, como en el juego. Decorativo: el nombre va al lado. */
function AchievementIcon({ icon, className }: { icon?: ImageAsset; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {icon && <Picture image={icon} alt="" priority={className === 'lhead__icon'} />}
    </span>
  )
}

/** La etiqueta de lo que Torre aún prepara: callada, en palabras, no en color. */
function PreparingTag() {
  return <span className="ztag">{s.preparing}</span>
}

/**
 * La cabecera del logro (DESIGN.md, Achievement page): el icono del logro en su hueco, el
 * título y el subtítulo «3 misiones - Niveles 15 a 25 - 10 puntos». Prerrequisitos,
 * Recompensas y «Necesitarás en total» van en la ficha (AchievementSheet).
 */
export function AchievementHeader({
  title,
  icon,
  meta,
  updated,
}: {
  title: string
  icon?: ImageAsset
  meta: string[]
  /** La fecha en que Torre cambió la página: «Actualizado el …» bajo el subtítulo. */
  updated?: string | null
}) {
  return (
    <header className="qhead lhead lhead--logro">
      <AchievementIcon icon={icon} className="lhead__icon" />
      <h1 className="qhead__title">{title}</h1>
      {meta.length > 0 && <p className="qhead__meta">{meta.join(s.metaSeparator)}</p>}
      <UpdatedDate value={updated} />
    </header>
  )
}

type SheetFacts = Pick<QuestFactsData, 'prerequisites' | 'rewards'>

const hasNeeds = ({ items, tasks, others }: Needs) =>
  items.length > 0 || tasks.length > 0 || others.length > 0

/** Si la ficha tiene algo que enseñar. Sin ella, la página es una sola columna. */
export const hasSheet = (facts: SheetFacts, needs: Needs) =>
  facts.prerequisites.length > 0 || hasRewards(facts.rewards) || hasNeeds(needs)

/**
 * Una parte plegable de la ficha: su título es el resumen de un <details>, con el chevron.
 * Cerrada en el HTML: en el móvil y la tableta se abre al pulsarla; desde 64rem el CSS ya la
 * enseña abierta y la isla de la página la abre y no deja cerrarla. La guía de Dofus pinta su
 * ficha con ella.
 */
export function SheetFold({
  id,
  label,
  className = 'lsheet__p',
  children,
}: {
  id: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={className} aria-labelledby={id}>
      <details className="lsheet__d" data-sheet="">
        <summary className="lsheet__s">
          <h2 className="lsheet__k" id={id}>
            {label}
          </h2>
          <ChevronIcon className="lsheet__chev" />
        </summary>
        <div className="lsheet__body">{children}</div>
      </details>
    </section>
  )
}

/** Un grupo de «Necesitarás en total»: su título y su lista, nombrada por él. */
function NeedsGroup({
  id,
  label,
  className,
  modifier,
  children,
}: {
  id: string
  label: string
  className: string
  modifier?: string
  children: ReactNode
}) {
  return (
    <div className={modifier ? `lneeds__g ${modifier}` : 'lneeds__g'}>
      <h3 className="lneeds__k" id={id}>
        {label}
      </h3>
      <ul role="list" className={`lneeds__list ${className}`} aria-labelledby={id}>
        {children}
      </ul>
    </div>
  )
}

/**
 * «3 ×» en negrita delante del texto, en la misma línea: si el texto no cabe, sigue debajo
 * de la cifra, no en una columna estrecha a su lado. Sin cifra, nada.
 */
const Quantity = ({ value }: { value?: number }) =>
  value == null ? null : (
    <>
      <b>{formatAmount(value)} ×</b>{' '}
    </>
  )

/**
 * Los grupos de «Necesitarás en total» (DESIGN.md, Achievement page): los objetos (icono,
 * cantidad y el nombre, que se copia) y los combates y mazmorras, cada uno con su título y
 * su hueco de icono a la altura de la primera línea del texto; una mazmorra casada, con su
 * jefe. Debajo, Otros: lo demás que escribió Torre, tal cual, en una sola línea de prosa
 * tras su título, sin huecos. Un grupo vacío no se pinta.
 */
function NeedsGroups({ id, needs }: { id: string; needs: Needs }) {
  const { items, tasks, others } = needs
  return (
    <div className="lneeds__groups">
      {items.length > 0 && (
        <NeedsGroup id={`${id}-objetos`} label={s.needsGroups.items} className="lneeds__items">
          {items.map(({ item, quantity }) => (
            <li key={item.name} className="row copyhost">
              <IconWell image={item.icon} />
              <span className="lneeds__t">
                <Quantity value={quantity} />
                <CopyName name={item.name} />
              </span>
            </li>
          ))}
        </NeedsGroup>
      )}
      {tasks.length > 0 && (
        <NeedsGroup id={`${id}-tareas`} label={s.needsGroups.tasks} className="lneeds__tasks">
          {tasks.map(({ quantity, label, kind, boss }) => (
            <li key={label} className="row">
              {boss ? (
                <IconWell image={boss} kind="dungeon" />
              ) : (
                <IconWell icon={kind === 'dungeon' ? 'dungeon' : 'combat'} />
              )}
              <span className="lneeds__t">
                <Quantity value={quantity} />
                {label}
              </span>
            </li>
          ))}
        </NeedsGroup>
      )}
      {others.length > 0 && (
        <NeedsGroup
          id={`${id}-otros`}
          label={s.needsGroups.others}
          className="lneeds__others"
          modifier="lneeds__g--others"
        >
          {others.map(({ quantity, label }) => (
            <li key={label} className="row">
              <span className="lneeds__t">
                <Quantity value={quantity} />
                {label}
              </span>
            </li>
          ))}
        </NeedsGroup>
      )}
    </div>
  )
}

/**
 * La ficha del logro (DESIGN.md, Achievement page, opción C de «Logro más compacto»):
 * Prerrequisitos y «Necesitarás en total», plegables, y al final «Recompensas del logro»,
 * siempre a la vista. En el escritorio es una columna a la derecha de las misiones, abierta, que no
 * suma altura encima de ellas; en el móvil y la tableta va entre la cabecera y la página,
 * con las dos partes plegadas en una fila cada una. Una parte vacía no se pinta; sin nada,
 * no hay ficha.
 */
export function AchievementSheet({ facts, needs }: { facts: SheetFacts; needs: Needs }) {
  // Ids propios: el catálogo (/sistema) pinta la ficha en cada tema y modo.
  const id = useId()
  if (!hasSheet(facts, needs)) return null
  const { prerequisites, rewards } = facts
  return (
    <div className="lsheet">
      {prerequisites.length > 0 && (
        <SheetFold id={`${id}-pre`} label={gameStrings.header.prerequisites}>
          <ul role="list" className="lsheet__pre">
            <PrerequisiteRows lines={prerequisites} />
          </ul>
        </SheetFold>
      )}
      {hasNeeds(needs) && (
        <SheetFold id={`${id}-nec`} label={s.needsTotal} className="lsheet__p lneeds">
          <NeedsGroups id={id} needs={needs} />
        </SheetFold>
      )}
      {hasRewards(rewards) && (
        <section className="lsheet__p" aria-labelledby={`${id}-rec`}>
          <h2 className="lsheet__k" id={`${id}-rec`}>
            {s.rewards}
          </h2>
          <ul role="list" className="lsheet__rew">
            <RewardRows rewards={rewards} bagId={`${id}-bag`} />
          </ul>
        </section>
      )}
    </div>
  )
}

/** Una fila de la lista numerada: su número, el PNJ (o lo que va en su sitio) y su texto. */
export interface NumberedQuest {
  key: Key
  /** El número en su rombo; sin él, el rombo va vacío. */
  number?: number
  /** El enlace del título cubre la fila: toda la fila abre la guía. */
  link: boolean
  npc?: ReactNode
  /** El título (lq__t) y lo que va debajo. */
  children: ReactNode
}

/**
 * La lista numerada de misiones (DESIGN.md, Achievement page, «Las misiones, en orden»): el
 * número en un rombo sobre la línea que las une, el PNJ que la da y el texto. Con columns, en
 * dos columnas que se leen de arriba abajo: la línea acaba al final de la primera y sigue en
 * la segunda. La guía de Dofus pinta con ella las misiones de cada logro, en una columna.
 */
export function NumberedQuests({
  quests,
  columns = false,
}: {
  quests: NumberedQuest[]
  columns?: boolean
}) {
  const rows = columns ? Math.ceil(quests.length / 2) : quests.length
  return (
    <ol
      className={`lq__list${columns ? ' lq__list--cols' : ''}`}
      role="list"
      style={columns ? ({ '--rows': rows } as CSSProperties) : undefined}
    >
      {quests.map((quest, index) => (
        <li
          key={quest.key}
          className="lq__item"
          data-link={quest.link ? '' : undefined}
          data-first={index === 0 ? '' : undefined}
          data-last={index === quests.length - 1 ? '' : undefined}
          data-col-end={columns && index === rows - 1 ? '' : undefined}
          data-col-start={columns && index === rows ? '' : undefined}
        >
          {/* El <ol> ya dice el número a los lectores de pantalla. */}
          <span className="lq__n" aria-hidden="true">
            {quest.number}
          </span>
          <span className="lq__npc" aria-hidden="true">
            {quest.npc}
          </span>
          <div className="lq__txt">{quest.children}</div>
        </li>
      ))}
    </ol>
  )
}

/**
 * Las misiones del logro, en orden (DESIGN.md, Achievement page): una lista numerada, con
 * el número en un círculo sobre la línea que las une, el PNJ que la da, el título y «Nivel
 * 20». Con cuatro o más, en dos columnas. Toda la fila abre la guía; sin guía publicada, no
 * es un enlace. Sin progreso: ni casillas ni contadores.
 */
export function AchievementQuests({ quests }: { quests: QuestCard[] }) {
  const id = useId()
  return (
    <section className="lq" aria-labelledby={id}>
      <h2 className="lq__h" id={id}>
        {s.questsHeading}
      </h2>
      <NumberedQuests
        columns={quests.length >= 4}
        quests={quests.map((quest) => ({
          key: quest.position,
          number: quest.position,
          link: Boolean(quest.href),
          npc: quest.giver && <Picture image={quest.giver} alt="" sizes="48px" />,
          children: (
            <>
              <h3 className="lq__t">
                {quest.href ? <a href={quest.href}>{quest.title}</a> : quest.title}
              </h3>
              {quest.level && <p className="lq__k">{s.questLevel(quest.level)}</p>}
            </>
          ),
        }))}
      />
    </section>
  )
}

/**
 * Lo que pide un logro sin misiones (los de Alineamiento), en el lugar de «Las misiones, en
 * orden»: la descripción del juego y sus objetivos de DofusDB («Rango 3», «Nivel 130»). Una
 * lista sin números ni enlaces: se cumplen a la vez, no son pasos.
 */
export function AchievementObjectives({ objectives }: { objectives: Objectives }) {
  const id = useId()
  return (
    <section className="lq lobj" aria-labelledby={id}>
      <h2 className="lq__h" id={id}>
        {s.objectivesHeading}
      </h2>
      {objectives.description && <p className="lobj__d">{objectives.description}</p>}
      <ul className="lobj__list" role="list">
        {objectives.items.map((item, index) => (
          <li key={`${index}-${item}`} className="lobj__item">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** «**4** misiones.», o «**2** objetivos.» en un logro sin misiones; sin ninguno, nada. */
function NavCount({ item }: { item: GroupItem }) {
  const [count, word] = item.quests
    ? [item.quests, s.questsWord(item.quests)]
    : [item.objectives ?? 0, s.objectivesWord(item.objectives ?? 0)]
  if (!count && !item.levels) return null
  return (
    <span className="nextq__m">
      {count > 0 && (
        <>
          <b>{count}</b> {word}.
        </>
      )}
      {item.levels && `${count > 0 ? ' ' : ''}${item.levels}.`}
    </span>
  )
}

/**
 * «Cuenta para»: los logros del juego que piden este, directamente o a través de otro. Va en
 * la columna de lectura, después del cierre; sin ninguno no se pinta.
 */
export function AchievementCountsFor({ countsFor }: { countsFor: CountsFor[] }) {
  if (countsFor.length === 0) return null
  return (
    <section className="lcuenta" aria-labelledby="logro-cuenta">
      <h2 className="lcuenta__h" id="logro-cuenta">
        {s.countsFor}
      </h2>
      <ul className="metas" role="list">
        {countsFor.map((meta) => (
          <li key={meta.name} className="meta">
            {meta.icon ? <IconWell image={meta.icon} /> : <IconWell icon="achievement" />}
            <span>
              <span className="meta__n">{meta.name}</span>
              <span className="meta__m">
                {s.countsForLine(meta.achievements)}
                {meta.points != null && (
                  <>
                    {' '}
                    <b>{meta.points}</b> {s.pointsWord(meta.points)}.
                  </>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function NavCard({ item, kicker, dir }: { item: GroupItem; kicker: string; dir: 'prev' | 'next' }) {
  const inner = (
    <>
      <AchievementIcon icon={item.icon} className="lnav__icon" />
      <span className="nextq__txt">
        <span className="nextq__k">{kicker}</span>
        <span className="nextq__t">{item.name}</span>
        <NavCount item={item} />
        {item.disabled && <PreparingTag />}
      </span>
    </>
  )
  const className = `nextq lnav__card lnav__card--${dir}`
  return item.href ? (
    <a className={className} href={item.href}>
      {inner}
    </a>
  ) : (
    <div className={`${className} lnav__card--off`} aria-disabled="true">
      {inner}
    </div>
  )
}

/** El logro anterior y el siguiente del metalogro, como la tarjeta de la siguiente misión. */
export function AchievementNav({
  group,
  previous,
  next,
}: {
  group: string
  previous: AchievementPageView['previous']
  next: AchievementPageView['next']
}) {
  if (!previous && !next) return null
  return (
    <nav className="lnav" aria-label={s.navLabel(group)}>
      {previous && <NavCard item={previous} kicker={s.previous} dir="prev" />}
      {next && <NavCard item={next} kicker={s.next} dir="next" />}
    </nav>
  )
}
