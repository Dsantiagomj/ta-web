import { IconWell } from '@/components/game/IconWell'
import { QuestFacts, type QuestFactsData } from '@/components/game/QuestFacts'
import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import type { AchievementPageView, CountsFor, GroupItem, QuestCard } from '@/lib/achievements/page'
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
 * La cabecera del logro (DESIGN.md, Achievement page): la de la guía con el icono del logro
 * donde va el PNJ, el subtítulo «3 misiones - Niveles 15 a 25 - 10 puntos» y las tres
 * columnas, con «Necesitarás en total» y «Recompensas del logro».
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
  facts: QuestFactsData
}) {
  return (
    <header className="qhead lhead">
      <AchievementIcon icon={icon} className="lhead__icon" />
      <h1 className="qhead__title">{title}</h1>
      {meta.length > 0 && <p className="qhead__meta">{meta.join(s.metaSeparator)}</p>}
      <QuestFacts facts={facts} labels={{ needs: s.needsTotal, rewards: s.rewards }} />
    </header>
  )
}

/**
 * Las misiones del logro, en orden: el PNJ que la da, «Misión 2 - Nivel 20» y el título.
 * Toda la tarjeta abre la guía; sin guía publicada, la tarjeta no es un enlace. Sin
 * progreso: ni casillas ni contadores.
 */
export function AchievementQuests({ quests }: { quests: QuestCard[] }) {
  return (
    <section className="lq" aria-labelledby="logro-misiones">
      <h2 className="lq__h" id="logro-misiones">
        {s.questsHeading}
      </h2>
      <ol className="lq__list" role="list">
        {quests.map((quest) => (
          <li key={quest.position} className="lq__item" data-link={quest.href ? '' : undefined}>
            <span className="lq__npc" aria-hidden="true">
              {quest.giver && <Picture image={quest.giver} alt="" sizes="48px" />}
            </span>
            <div className="lq__txt">
              <p className="lq__k">{s.questKicker(quest.position, quest.level)}</p>
              <h3 className="lq__t">
                {quest.href ? <a href={quest.href}>{quest.title}</a> : quest.title}
              </h3>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function GroupItemInner({ item }: { item: GroupItem }) {
  const meta = [s.quests(item.quests), ...(item.levels ? [item.levels] : [])].join(s.metaSeparator)
  return (
    <>
      {item.icon ? <IconWell image={item.icon} /> : <IconWell icon="achievement" />}
      <span className="sib__txt">
        <span className="sib__n">{item.name}</span>
        <span className="sib__m">{meta}</span>
        {item.disabled && <PreparingTag />}
      </span>
    </>
  )
}

/**
 * La columna del metalogro: sus logros en orden con el actual marcado, y los logros del
 * juego que piden este. Uno En preparación se ve apagado, sin enlace, y sigue en el orden
 * de lectura (aria-disabled).
 */
export function AchievementGroupList({
  name,
  items,
  countsFor,
}: {
  name: string
  items: GroupItem[]
  countsFor: CountsFor[]
}) {
  return (
    <aside className="lside" aria-labelledby="logro-metalogro">
      <section className="lside__box">
        <h2 className="lside__h" id="logro-metalogro">
          {s.group(name)}
        </h2>
        <ol className="sibs" role="list">
          {items.map((item) => (
            <li
              key={item.name}
              className={item.current ? 'sib sib--current' : item.disabled ? 'sib sib--off' : 'sib'}
            >
              {item.href ? (
                <a className="sib__in" href={item.href}>
                  <GroupItemInner item={item} />
                </a>
              ) : (
                <div
                  className="sib__in"
                  {...(item.current
                    ? { 'aria-current': 'page' as const }
                    : { 'aria-disabled': true })}
                >
                  <GroupItemInner item={item} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
      {countsFor.length > 0 && <CountsForList countsFor={countsFor} />}
    </aside>
  )
}

function CountsForList({ countsFor }: { countsFor: CountsFor[] }) {
  return (
    <section className="lside__box" aria-labelledby="logro-cuenta">
      <h2 className="lside__h3" id="logro-cuenta">
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
