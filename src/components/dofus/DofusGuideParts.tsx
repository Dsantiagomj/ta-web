import type { CSSProperties } from 'react'

import { GuideBody } from '@/components/game/GuideBody'
import { GuideRichText } from '@/components/game/GuideRichText'
import { IconWell } from '@/components/game/IconWell'
import { CopyName } from '@/components/game/Item'
import { VideoFacade } from '@/components/game/VideoFacade'
import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import type {
  AchievementPartView,
  DofusGuideView,
  DofusListItem,
  DofusQuestCard,
  NeedRowView,
  PartView,
} from '@/lib/dofus-guides/page'
import { dofusPageStrings as s } from '@/lib/dofus-guides/strings'
import { formatAmount } from '@/lib/guides/display'
import type { GuideBlock } from '@/lib/guides/page'
import { youtubeWatchUrl } from '@/lib/guides/video'

import '../achievement/achievement.css'

const eggStyle = (color?: string) =>
  (color ? { '--egg': color } : undefined) as CSSProperties | undefined

function PreparingTag() {
  return <span className="ztag">{s.preparing}</span>
}

/**
 * La cabecera de la guía: el huevo del Dofus en su hueco, el nombre, «7 logros - 40
 * misiones - Nivel 180» con la etiqueta (Primordial o Evento) y las columnas de
 * Prerrequisitos y Recompensas, el texto de Torre tal cual con sus enlaces.
 */
export function DofusHeader({ view }: { view: DofusGuideView }) {
  const hasFacts = Boolean(view.prerequisites || view.rewards)
  return (
    <header className="qhead lhead dg-head" style={eggStyle(view.color)}>
      <span className="lhead__icon dg-head__egg" aria-hidden="true">
        {view.egg && <Picture image={view.egg} alt="" priority />}
      </span>
      <h1 className="qhead__title">{view.title}</h1>
      {(view.meta.length > 0 || view.tag) && (
        <p className="qhead__meta">
          {view.meta.join(s.metaSeparator)}
          {view.tag && <span className="dg-tagpill">{view.tag}</span>}
        </p>
      )}
      {hasFacts && (
        <div className="qhead__facts">
          {view.prerequisites && (
            <section aria-labelledby="dg-pre" className="dg-facts">
              <h2 id="dg-pre">{s.prerequisites}</h2>
              <GuideRichText content={view.prerequisites} />
            </section>
          )}
          {view.rewards && (
            <section aria-labelledby="dg-rec" className="dg-facts">
              <h2 id="dg-rec">{s.rewards}</h2>
              <GuideRichText content={view.rewards} />
            </section>
          )}
        </div>
      )}
    </header>
  )
}

type NeedItemRow = Extract<NeedRowView, { kind: 'item' }>
type NeedNoteRow = Extract<NeedRowView, { kind: 'note' }>

function NeedItem({ row }: { row: NeedItemRow }) {
  return (
    <li className="row copyhost">
      <IconWell image={row.item.icon} />
      <span>
        <b>{formatAmount(row.quantity)} ×</b> <CopyName name={row.item.name} />
        {row.note && <span className="dg-muted"> {row.note}</span>}
      </span>
    </li>
  )
}

/** Un grupo: sus objetos en columnas y después sus notas, cada uno en el orden de Torre. */
function NeedGroup({ group }: { group: NonNullable<DofusGuideView['needs']>['groups'][number] }) {
  const items = group.rows.filter((row): row is NeedItemRow => row.kind === 'item')
  const notes = group.rows.filter((row): row is NeedNoteRow => row.kind === 'note')
  return (
    <div className="dg-needs__g">
      {group.name && <h3 className="dg-h3">{group.name}</h3>}
      {items.length > 0 && (
        <ul role="list" className="needs__items">
          {items.map((row, index) => (
            <NeedItem key={index} row={row} />
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul role="list" className="needs__notes">
          {notes.map((row, index) => (
            <li key={index} className="row dg-note">
              <GuideRichText content={row.text} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Necesitarás por grupos («Mazmorras», «Recursos»), uno debajo de otro. En cada grupo, los
 * objetos en columnas (como en la cabecera de la guía) y debajo las notas de Torre tal cual.
 * Cada objeto copia su nombre para buscarlo en el juego.
 */
export function DofusNeeds({ needs }: { needs: NonNullable<DofusGuideView['needs']> }) {
  return (
    <section className="dg-sec dg-needs" aria-labelledby="dg-nec">
      <h2 className="lq__h" id="dg-nec">
        {needs.title}
      </h2>
      {needs.groups.map((group, index) => (
        <NeedGroup key={`${group.name ?? ''}-${index}`} group={group} />
      ))}
    </section>
  )
}

function QuestItem({ quest, kicker }: { quest: DofusQuestCard; kicker?: string }) {
  return (
    <li className={`dg-ql__i${quest.href ? ' dg-ql__i--link' : ''}`}>
      <span className="dg-ql__npc" aria-hidden="true">
        {quest.giver ? (
          <Picture image={quest.giver} alt="" sizes="48px" />
        ) : (
          <IconWell icon="quest" />
        )}
      </span>
      <div>
        <p className="dg-ql__k">{kicker ?? s.questKicker(quest.position, quest.level)}</p>
        <p className="dg-ql__t">
          {quest.href ? (
            <a className="dg-ql__a" href={quest.href}>
              {quest.title}
            </a>
          ) : (
            quest.title
          )}
        </p>
        {quest.note && <p className="dg-qnote">{quest.note}</p>}
        {!quest.href && <span className="ztag">{s.noGuide}</span>}
      </div>
    </li>
  )
}

function QuestList({ quests }: { quests: DofusQuestCard[] }) {
  return (
    <ol role="list" className={`dg-ql${quests.length > 3 ? ' dg-ql--cols' : ''}`}>
      {quests.map((quest) => (
        <QuestItem key={quest.position} quest={quest} />
      ))}
    </ol>
  )
}

function AchievementIcon({ icon }: { icon?: ImageAsset }) {
  return (
    <span className="dg-ach__icon" aria-hidden="true">
      {icon ? <Picture image={icon} alt="" /> : <IconWell icon="achievement" />}
    </span>
  )
}

function Achievement({ view, level }: { view: AchievementPartView; level: 'h3' | 'h4' }) {
  const Heading = level
  return (
    <section className="dg-ach">
      <div className="dg-ach__head">
        <AchievementIcon icon={view.icon} />
        <div>
          <Heading className="dg-ach__t">
            {view.href ? <a href={view.href}>{view.name}</a> : view.name}
          </Heading>
          <p className="dg-ach__m">{view.meta.join(s.metaSeparator)}</p>
          {view.disabled && <PreparingTag />}
        </div>
      </div>
      {view.note && <p className="dg-muted dg-ach__note">{view.note}</p>}
      <QuestList quests={view.quests} />
    </section>
  )
}

function Part({ part }: { part: PartView }) {
  switch (part.kind) {
    case 'achievement':
      return <Achievement view={part.achievement} level="h3" />
    case 'metalogro':
      return (
        <section className="dg-meta">
          <p className="dg-meta__k">{s.metalogro(part.number)}</p>
          <h3 className="dg-meta__t">{part.name}</h3>
          {part.achievements.map((achievement) => (
            <Achievement key={achievement.name} view={achievement} level="h4" />
          ))}
        </section>
      )
    case 'quests':
      return (
        <section className="dg-ach">
          {part.title && <h3 className="dg-ach__t dg-ach__t--plain">{part.title}</h3>}
          <QuestList quests={part.quests} />
        </section>
      )
    case 'quest':
      return (
        <section className="dg-ach">
          <ol role="list" className="dg-ql">
            <QuestItem quest={part.quest} kicker={s.questAlone(part.quest.level)} />
          </ol>
        </section>
      )
    case 'note':
      return (
        <div className="dg-prose dg-prose--note guide-body">
          <GuideRichText content={part.text} />
        </div>
      )
  }
}

/**
 * Los logros y las misiones en el orden de Torre, sin cajas dentro de cajas: el metalogro y
 * el logro son títulos, y las misiones una lista con filetes (prototipo, 2026-11-09).
 */
export function DofusParts({ view }: { view: DofusGuideView }) {
  if (view.parts.length === 0) return null
  const onlyQuests = view.achievementCount === 0
  return (
    <section className="dg-sec" aria-labelledby="dg-logros">
      <h2 className="lq__h" id="dg-logros">
        {onlyQuests ? s.questHeading : s.partsHeading(view.achievementCount)}
      </h2>
      {view.parts.map((part, index) => (
        <Part key={index} part={part} />
      ))}
    </section>
  )
}

/** El paso a paso de las guías como la de la Piñata de pino, con los bloques de las guías. */
export function DofusBody({ blocks }: { blocks: GuideBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <section className="dg-sec" aria-labelledby="dg-paso">
      <h2 className="lq__h" id="dg-paso">
        {s.body}
      </h2>
      <GuideBody blocks={blocks} />
    </section>
  )
}

export function DofusVideo({ video }: { video: NonNullable<DofusGuideView['video']> }) {
  return (
    <section className="dg-sec" aria-labelledby="dg-video">
      <h2 className="lq__h" id="dg-video">
        {s.video}
      </h2>
      <VideoFacade url={youtubeWatchUrl(video.id)} title={video.title} poster={video.poster} />
    </section>
  )
}

/** La checklist de este Dofus, con su huevo. */
export function DofusChecklist({
  checklist,
  egg,
}: {
  checklist: NonNullable<DofusGuideView['checklist']>
  egg?: ImageAsset
}) {
  return (
    <a className="dg-chk" href={checklist.href}>
      <span className="dg-chk__art" aria-hidden="true">
        {egg && <Picture image={egg} alt="" />}
      </span>
      <span>
        <span className="dg-chk__k">{s.checklist}</span>
        <span className="dg-chk__t">{checklist.name}</span>
      </span>
    </a>
  )
}

function NavCard({
  item,
  kicker,
  dir,
}: {
  item: DofusListItem
  kicker: string
  dir: 'prev' | 'next'
}) {
  return (
    <a className={`nextq lnav__card lnav__card--${dir}`} href={item.href}>
      <span className="lnav__icon dg-egg" aria-hidden="true">
        {item.egg && <Picture image={item.egg} alt="" />}
      </span>
      <span className="nextq__txt">
        <span className="nextq__k">{kicker}</span>
        <span className="nextq__t">{item.name}</span>
        {item.meta && <span className="nextq__m">{item.meta}.</span>}
      </span>
    </a>
  )
}

/** El Dofus publicado anterior y el siguiente, como la tarjeta de la siguiente misión. */
export function DofusNav({ previous, next }: Pick<DofusGuideView, 'previous' | 'next'>) {
  if (!previous && !next) return null
  return (
    <nav className="lnav" aria-label={s.navLabel}>
      {previous && <NavCard item={previous} kicker={s.previous} dir="prev" />}
      {next && <NavCard item={next} kicker={s.next} dir="next" />}
    </nav>
  )
}
