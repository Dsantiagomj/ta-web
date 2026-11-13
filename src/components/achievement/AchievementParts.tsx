import { type CSSProperties, useId } from 'react'

import { IconWell } from '@/components/game/IconWell'
import { CopyName } from '@/components/game/Item'
import { QuestFacts, type QuestFactsData } from '@/components/game/QuestFacts'
import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import type {
  AchievementNeeds as Needs,
  AchievementPageView,
  CountsFor,
  GroupItem,
  QuestCard,
} from '@/lib/achievements/page'
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

const NO_NEEDS: QuestFactsData['needs'] = { items: [], notes: [] }

/**
 * La cabecera del logro (DESIGN.md, Achievement page): la de la guía con el icono del logro
 * donde va el PNJ, el subtítulo «3 misiones - Niveles 15 a 25 - 10 puntos» y la banda de
 * Prerrequisitos y «Recompensas del logro». «Necesitarás en total» va aparte
 * (AchievementNeeds).
 */
export function AchievementHeader({
  title,
  icon,
  meta,
  facts,
}: {
  title: string
  icon?: ImageAsset
  meta: string[]
  facts: Omit<QuestFactsData, 'needs'>
}) {
  return (
    <header className="qhead lhead">
      <AchievementIcon icon={icon} className="lhead__icon" />
      <h1 className="qhead__title">{title}</h1>
      {meta.length > 0 && <p className="qhead__meta">{meta.join(s.metaSeparator)}</p>}
      <QuestFacts facts={{ ...facts, needs: NO_NEEDS }} labels={{ rewards: s.rewards }} />
    </header>
  )
}

/** Un grupo de «Necesitarás en total»: su título y su lista, nombrada por él. */
function NeedsGroup({
  id,
  label,
  className,
  columns = 1,
  rows = 0,
  modifier,
  children,
}: {
  id: string
  label: string
  className: string
  /** En cuántas columnas va la lista cuando hay sitio (needsColumns). */
  columns?: number
  rows?: number
  modifier?: string
  children: React.ReactNode
}) {
  const split = columns > 1
  const groupClass = ['lneeds__g', split && 'lneeds__g--cols', modifier].filter(Boolean).join(' ')
  return (
    <div
      className={groupClass}
      style={
        split
          ? ({ '--cols': columns, '--rows': Math.ceil(rows / columns) } as CSSProperties)
          : undefined
      }
    >
      <h3 className="lneeds__k" id={id}>
        {label}
      </h3>
      <ul role="list" className={`lneeds__list ${className}`} aria-labelledby={id}>
        {children}
      </ul>
    </div>
  )
}

// Las columnas de las listas con iconos (objetos, y combates y mazmorras) en el escritorio
// ancho: tres entre las dos, que con sus nombres cortos en una línea es lo que cabe junto a
// los filetes. Solo se parte una lista de más de cinco filas, y cada columna se queda con
// tres al menos.
const NEEDS_COLUMNS = 3
const NEEDS_TALL = 5
const NEEDS_MIN_ROWS = 3

/**
 * En cuántas columnas va cada lista para que ningún grupo quede mucho más alto que los
 * otros: una columna más, cada vez, para la lista más alta, mientras queden columnas y
 * pase de cinco filas. Ocre de ámbar (5 objetos, 10 combates): los combates en dos de 5.
 */
export function needsColumns(lengths: number[]): number[] {
  const columns = lengths.map(() => 1)
  const height = (i: number) => Math.ceil(lengths[i]! / columns[i]!)
  let used = lengths.filter((n) => n > 0).length
  while (used < NEEDS_COLUMNS) {
    const tallest = lengths.reduce((best, _, i) => (height(i) > height(best) ? i : best), 0)
    const n = lengths[tallest]!
    if (height(tallest) <= NEEDS_TALL || n / (columns[tallest]! + 1) < NEEDS_MIN_ROWS) break
    columns[tallest]! += 1
    used += 1
  }
  return columns
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
 * «Necesitarás en total», su propia zona bajo la cabecera (DESIGN.md, Achievement page): los
 * objetos (icono, cantidad y el nombre, que se copia), los combates y mazmorras, y lo demás
 * que escribió Torre, cada grupo con su título. Los objetos y los combates llevan su hueco
 * de 44px, con la primera línea del texto a su altura; una mazmorra casada, su jefe. Lo
 * demás no tiene icono ni deja su hueco. Un grupo vacío no se pinta; sin nada, no hay zona.
 */
export function AchievementNeeds({ needs }: { needs: Needs }) {
  // Ids propios: el catálogo (/sistema) pinta la zona en cada tema y modo.
  const id = useId()
  const { items, tasks, others } = needs
  if (items.length === 0 && tasks.length === 0 && others.length === 0) return null
  const [itemColumns, taskColumns] = needsColumns([items.length, tasks.length])
  return (
    <section className="lneeds" aria-labelledby={`${id}-h`}>
      <h2 className="lzone__h" id={`${id}-h`}>
        {s.needsTotal}
      </h2>
      <div className="lneeds__groups">
        {items.length > 0 && (
          <NeedsGroup
            id={`${id}-objetos`}
            label={s.needsGroups.items}
            className="lneeds__items"
            columns={itemColumns}
            rows={items.length}
          >
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
          <NeedsGroup
            id={`${id}-tareas`}
            label={s.needsGroups.tasks}
            className="lneeds__tasks"
            columns={taskColumns}
            rows={tasks.length}
          >
            {tasks.map(({ quantity, label, kind, boss }) => (
              <li key={label} className="row">
                {boss ? (
                  <IconWell image={boss} />
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
    </section>
  )
}

/**
 * Las misiones del logro, en orden (DESIGN.md, Achievement page): una lista numerada, con
 * el número en un círculo sobre la línea que las une, el PNJ que la da, el título y «Nivel
 * 20». Con cuatro o más, en dos columnas que se leen de arriba abajo: la línea acaba al
 * final de la primera y sigue en la segunda. Toda la fila abre la guía; sin guía publicada,
 * no es un enlace. Sin progreso: ni casillas ni contadores.
 */
export function AchievementQuests({ quests }: { quests: QuestCard[] }) {
  const id = useId()
  const columns = quests.length >= 4
  const rows = columns ? Math.ceil(quests.length / 2) : quests.length
  return (
    <section className="lq" aria-labelledby={id}>
      <h2 className="lq__h" id={id}>
        {s.questsHeading}
      </h2>
      <ol
        className={`lq__list${columns ? ' lq__list--cols' : ''}`}
        role="list"
        style={columns ? ({ '--rows': rows } as CSSProperties) : undefined}
      >
        {quests.map((quest, index) => (
          <li
            key={quest.position}
            className="lq__item"
            data-link={quest.href ? '' : undefined}
            data-first={index === 0 ? '' : undefined}
            data-last={index === quests.length - 1 ? '' : undefined}
            data-col-end={columns && index === rows - 1 ? '' : undefined}
            data-col-start={columns && index === rows ? '' : undefined}
          >
            {/* El <ol> ya dice el número a los lectores de pantalla. */}
            <span className="lq__n" aria-hidden="true">
              {quest.position}
            </span>
            <span className="lq__npc" aria-hidden="true">
              {quest.giver && <Picture image={quest.giver} alt="" sizes="48px" />}
            </span>
            <div className="lq__txt">
              <h3 className="lq__t">
                {quest.href ? <a href={quest.href}>{quest.title}</a> : quest.title}
              </h3>
              {quest.level && <p className="lq__k">{s.questLevel(quest.level)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
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
        <span className="nextq__m">
          <b>{item.quests}</b> {s.questsWord(item.quests)}.{item.levels && ` ${item.levels}.`}
        </span>
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
