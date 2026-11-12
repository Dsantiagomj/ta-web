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
  children,
}: {
  id: string
  label: string
  className: string
  children: React.ReactNode
}) {
  return (
    <div className="lneeds__g">
      <h3 className="lneeds__k" id={id}>
        {label}
      </h3>
      <ul role="list" className={`lneeds__list ${className}`} aria-labelledby={id}>
        {children}
      </ul>
    </div>
  )
}

/** «3 ×» en negrita, aparte del texto, como en las filas de la cabecera; sin cifra, nada. */
const Quantity = ({ value }: { value?: number }) =>
  value == null ? null : (
    <>
      <b>{formatAmount(value)} ×</b>{' '}
    </>
  )

/**
 * «Necesitarás en total», su propia zona bajo la cabecera (DESIGN.md, Achievement page): los
 * objetos (icono, cantidad y el nombre, que se copia), los combates y mazmorras, y lo demás
 * que escribió Torre, cada grupo con su título y todas las filas en la misma rejilla de
 * huecos de 44px. Un grupo vacío no se pinta; sin nada, no hay zona.
 */
export function AchievementNeeds({ needs }: { needs: Needs }) {
  // Ids propios: el catálogo (/sistema) pinta la zona en cada tema y modo.
  const id = useId()
  const { items, tasks, others } = needs
  if (items.length === 0 && tasks.length === 0 && others.length === 0) return null
  return (
    <section className="lneeds" aria-labelledby={`${id}-h`}>
      <h2 className="lzone__h" id={`${id}-h`}>
        {s.needsTotal}
      </h2>
      <div className="lneeds__groups">
        {items.length > 0 && (
          <NeedsGroup id={`${id}-objetos`} label={s.needsGroups.items} className="needs__items">
            {items.map(({ item, quantity }) => (
              <li key={item.name} className="row copyhost">
                <IconWell image={item.icon} />
                <span>
                  <Quantity value={quantity} />
                  <CopyName name={item.name} />
                </span>
              </li>
            ))}
          </NeedsGroup>
        )}
        {tasks.length > 0 && (
          <NeedsGroup id={`${id}-tareas`} label={s.needsGroups.tasks} className="lneeds__tasks">
            {tasks.map(({ quantity, label, kind }) => (
              <li key={label} className="row">
                <IconWell icon={kind === 'dungeon' ? 'dungeon' : 'combat'} />
                <span>
                  <Quantity value={quantity} />
                  {label}
                </span>
              </li>
            ))}
          </NeedsGroup>
        )}
        {others.length > 0 && (
          <NeedsGroup id={`${id}-otros`} label={s.needsGroups.others} className="lneeds__others">
            {others.map(({ quantity, label }) => (
              <li key={label} className="row">
                <span>
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
