import { type CSSProperties, Fragment, useId } from 'react'

import { NumberedQuests, SheetFold } from '@/components/achievement/AchievementParts'
import { GuideSections } from '@/components/game/GuideBody'
import { GuideRichText } from '@/components/game/GuideRichText'
import { IconWell } from '@/components/game/IconWell'
import { CopyName } from '@/components/game/Item'
import { PrerequisiteRows } from '@/components/game/QuestFacts'
import { VideoFacade } from '@/components/game/VideoFacade'
import { SiteOrWebLink } from '@/components/site/NewTab'
import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import { UpdatedDate } from '@/components/ui/UpdatedDate'
import type {
  AchievementPartView,
  DofusGuideView,
  DofusListItem,
  DofusQuestCard,
  NeedRowView,
  PartView,
  PrerequisiteLine,
} from '@/lib/dofus-guides/page'
import { dofusPageStrings as s } from '@/lib/dofus-guides/strings'
import { formatAmount } from '@/lib/guides/display'
import type { GuideContent } from '@/lib/guides/page'
import { youtubeWatchUrl } from '@/lib/guides/video'

import '../achievement/achievement.css'

const eggStyle = (color?: string) =>
  (color ? { '--egg': color } : undefined) as CSSProperties | undefined

function PreparingTag() {
  return <span className="ztag">{s.preparing}</span>
}

/**
 * La cabecera de la guía, la del logro (DESIGN.md, Dofus guide page): el huevo del Dofus en
 * su hueco, el nombre y «1 logro - 8 misiones - Nivel 110» con la etiqueta (Primordial o
 * Evento). Prerrequisitos, Necesitarás y Recompensas van en la ficha (DofusSheet).
 */
export function DofusHeader({
  view,
  updated,
}: {
  view: DofusGuideView
  /** La fecha en que Torre cambió la guía: «Actualizado el …» bajo el subtítulo. */
  updated?: string | null
}) {
  return (
    <header className="qhead lhead lhead--logro dg-head" style={eggStyle(view.color)}>
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
      <UpdatedDate value={updated} />
    </header>
  )
}

type NeedItemRow = Extract<NeedRowView, { kind: 'item' }>
type NeedNoteRow = Extract<NeedRowView, { kind: 'note' }>

function NeedItem({ row }: { row: NeedItemRow }) {
  return (
    <li className="row copyhost">
      <IconWell image={row.item.icon} />
      <span className="lneeds__t">
        <b>{formatAmount(row.quantity)} ×</b> <CopyName name={row.item.name} />
        {row.note && <span className="dg-muted"> {row.note}</span>}
      </span>
    </li>
  )
}

/** El hueco de una nota: el jefe de la mazmorra que nombra, la mazmorra o el combate. */
function NoteSlot({ row }: { row: NeedNoteRow }) {
  if (row.dungeon) {
    return row.boss ? <IconWell image={row.boss} kind="dungeon" /> : <IconWell icon="dungeon" />
  }
  return row.combat ? <IconWell icon="combat" /> : null
}

/**
 * Una nota de Torre tal cual, con su cantidad delante en negrita («3 ×»), como en la ficha del
 * logro. Una mazmorra lleva a su lado el jefe que nombra (o el icono de mazmorra) y un combate
 * el icono de combate; en los demás grupos, sin hueco.
 */
function NeedNote({ row }: { row: NeedNoteRow }) {
  return (
    <li className="row dg-note">
      <NoteSlot row={row} />
      <div className="lneeds__t dg-note__t">
        {row.quantity != null && (
          <>
            <b>{formatAmount(row.quantity)} ×</b>{' '}
          </>
        )}
        <GuideRichText content={row.text} />
      </div>
    </li>
  )
}

type NeedGroupView = NonNullable<DofusGuideView['needs']>['groups'][number]

/**
 * Un grupo de Necesitarás en la ficha: su nombre y, por partes, el subtítulo de Torre encima
 * de sus filas, una por línea; en cada parte, los objetos primero y después las notas, cada
 * uno en el orden de Torre. El catálogo /sistema lo pinta solo, para la miniatura del panel.
 */
export function DofusNeedGroup({ id, group }: { id: string; group: NeedGroupView }) {
  return (
    <div className="lneeds__g">
      {group.name && (
        <h3 className="lneeds__k" id={id}>
          {group.name}
        </h3>
      )}
      {group.parts.map((part, index) => (
        <Fragment key={index}>
          {part.subtitle && <p className="dg-needs__sub">{part.subtitle}</p>}
          {part.rows.length > 0 && (
            <ul
              role="list"
              className="lneeds__list lneeds__items"
              aria-labelledby={group.name ? id : undefined}
            >
              {part.rows.map((row, at) => row.kind === 'item' && <NeedItem key={at} row={row} />)}
              {part.rows.map((row, at) => row.kind === 'note' && <NeedNote key={at} row={row} />)}
            </ul>
          )}
        </Fragment>
      ))}
    </div>
  )
}

/** Una fila de Prerrequisitos: una misión con su icono, o la frase de Torre sin icono. */
function PrerequisiteRow({ line }: { line: PrerequisiteLine }) {
  if (line.kind === 'quest') {
    return <PrerequisiteRows lines={[{ label: line.label, href: line.href, quest: true }]} />
  }
  return (
    <li className="row dg-pre">
      <div className="dg-pre__t">
        <GuideRichText content={line.text} />
      </div>
    </li>
  )
}

type SheetView = Pick<DofusGuideView, 'prerequisites' | 'needs' | 'rewards'>

/** Si la ficha tiene algo que enseñar. Sin ella, la página es una sola columna. */
export const hasDofusSheet = (view: SheetView) =>
  view.prerequisites.length > 0 || Boolean(view.needs) || Boolean(view.rewards)

/**
 * La ficha de la guía (DESIGN.md, Dofus guide page): la de la página de logro, con
 * Prerrequisitos y Necesitarás plegables y Recompensas al final, siempre a la vista. Desde
 * 64rem es una columna a la derecha, abierta; en el móvil y la tableta va entre la cabecera y
 * la entrada, plegada. Una parte vacía no se pinta; sin nada, no hay ficha.
 */
export function DofusSheet({ view }: { view: SheetView }) {
  // Ids propios: el catálogo (/sistema) pinta la ficha en cada tema y modo.
  const id = useId()
  if (!hasDofusSheet(view)) return null
  const { prerequisites, needs, rewards } = view
  return (
    <div className="lsheet">
      {prerequisites.length > 0 && (
        <SheetFold id={`${id}-pre`} label={s.prerequisites}>
          <ul role="list" className="lsheet__pre">
            {prerequisites.map((line, index) => (
              <PrerequisiteRow key={index} line={line} />
            ))}
          </ul>
        </SheetFold>
      )}
      {needs && (
        <SheetFold id={`${id}-nec`} label={needs.title} className="lsheet__p lneeds">
          {needs.note && <p className="dg-needs__note">{needs.note}</p>}
          <div className="lneeds__groups">
            {needs.groups.map((group, index) => (
              <DofusNeedGroup key={index} id={`${id}-g${index}`} group={group} />
            ))}
          </div>
        </SheetFold>
      )}
      {rewards && (
        <section className="lsheet__p" aria-labelledby={`${id}-rec`}>
          <h2 className="lsheet__k" id={`${id}-rec`}>
            {s.rewards}
          </h2>
          <div className="dg-rew">
            <GuideRichText content={rewards} />
          </div>
        </section>
      )}
    </div>
  )
}

/** El título de Torre: entero, o en trozos si enlaza varias guías. */
function QuestTitle({ quest }: { quest: DofusQuestCard }) {
  if (quest.links) {
    return quest.links.map((piece, index) =>
      piece.href ? (
        <SiteOrWebLink key={index} href={piece.href}>
          {piece.text}
        </SiteOrWebLink>
      ) : (
        <Fragment key={index}>{piece.text}</Fragment>
      ),
    )
  }
  return quest.href ? <SiteOrWebLink href={quest.href}>{quest.title}</SiteOrWebLink> : quest.title
}

/**
 * Las misiones de una parte en la lista numerada de la página de logro (NumberedQuests), en una
 * sola columna: el número, el PNJ (o el icono de misión), el título de Torre que abre su guía,
 * «Nivel 20», su nota y «Sin guía todavía» si no la tiene. Lo que Torre enlaza que no es una
 * misión va sin número; una fila de varias guías enlaza cada trozo y no abre la fila entera.
 */
function QuestList({ quests, alone = false }: { quests: DofusQuestCard[]; alone?: boolean }) {
  return (
    <NumberedQuests
      quests={quests.map((quest, index) => {
        const isLink = quest.kind === 'link'
        return {
          key: index,
          ...(!isLink && !alone && { number: quest.position }),
          link: Boolean(quest.href),
          npc: quest.giver ? (
            <Picture image={quest.giver} alt="" sizes="48px" />
          ) : (
            <IconWell icon="quest" />
          ),
          children: (
            <>
              <p className="lq__t">
                <QuestTitle quest={quest} />
              </p>
              {!isLink && quest.level && <p className="lq__k">{s.level(quest.level)}</p>}
              {quest.note && <p className="dg-qnote">{quest.note}</p>}
              {!isLink && !quest.href && !quest.links && <span className="ztag">{s.noGuide}</span>}
            </>
          ),
        }
      })}
    />
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
      {view.quests.length > 0 && <QuestList quests={view.quests} />}
    </section>
  )
}

/** Una parte de la guía: el bloque del panel tal cual. El catálogo /sistema la pinta sola. */
export function DofusPart({ part }: { part: PartView }) {
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
          <QuestList quests={[part.quest]} alone />
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
    <section className="lq dg-parts" aria-labelledby="dg-logros">
      <h2 className="lq__h" id="dg-logros">
        {onlyQuests ? s.questHeading : s.partsHeading(view.achievementCount)}
      </h2>
      {view.parts.map((part, index) => (
        <DofusPart key={index} part={part} />
      ))}
    </section>
  )
}

/**
 * El paso a paso de las guías como la de la Piñata de pino: la prosa, las capturas y los
 * pasos, como en una guía de misión (src/lib/guides/page.ts, guideContent).
 */
export function DofusBody({ content }: { content: GuideContent }) {
  const { intro, steps, outro } = content
  if (intro.length + steps.length + outro.length === 0) return null
  return (
    <section className="dg-sec" aria-labelledby="dg-paso">
      <h2 className="lq__h" id="dg-paso">
        {s.body}
      </h2>
      <GuideSections content={content} headingLevel={3} />
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
