import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { adminCreateHref, readDashboard, type DashboardItem } from '@/lib/admin/dashboard'
import { panelStrings, relativeTime } from '@/lib/admin/strings'
import type { User } from '@/payload-types'

const s = panelStrings.dashboard

/**
 * El panel de control «Pendiente» (A-13): lo que Torre tiene a medias, en lugar de la
 * cuadrícula de colecciones de Payload, que ya está en el menú.
 */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const user = req.user as User
  const data = await readDashboard(req.payload, user)
  const adminRoute = req.payload.config.routes.admin
  const now = new Date()
  const create = (collection: string) => adminCreateHref(adminRoute, collection)

  return (
    <Gutter className="ta-dash">
      <header className="ta-dash__head">
        <h1>{s.title}</h1>
        <p className="ta-dash__lead">{s.greeting(user.name)}</p>
      </header>

      <nav className="ta-dash__shortcuts" aria-label={s.shortcuts}>
        <Link className="btn btn--style-primary btn--size-medium" href={create('quest-guides')}>
          {s.create.questGuide}
        </Link>
        <Link className="btn btn--style-secondary btn--size-medium" href={create('dofus-guides')}>
          {s.create.dofusGuide}
        </Link>
        <Link
          className="btn btn--style-secondary btn--size-medium"
          href={create('achievement-pages')}
        >
          {s.create.achievementPage}
        </Link>
        <Link className="btn btn--style-secondary btn--size-medium" href={create('checklists')}>
          {s.create.checklist}
        </Link>
        <Link className="btn btn--style-secondary btn--size-medium" href={create('media')}>
          {s.create.media}
        </Link>
      </nav>

      <div className="ta-dash__grid">
        <Section
          id="borradores"
          title={s.drafts}
          total={data.drafts.total}
          help={s.draftsHelp}
          empty={s.draftsEmpty}
        >
          {data.drafts.items.length > 0 && (
            <ItemList
              items={data.drafts.items}
              now={now}
              tag={(item) => (item.neverPublished ? s.neverPublished : s.changed)}
            />
          )}
          <More shown={data.drafts.items.length} total={data.drafts.total} />
        </Section>

        <Section
          id="en-preparacion"
          title={s.preparing}
          help={s.preparingHelp}
          empty={data.preparing.length === 0 ? s.preparingEmpty : null}
        >
          {data.preparing.map((group) => (
            <div key={group.collection} className="ta-dash__group">
              <h3>
                {group.label} <span className="ta-dash__count">{s.count(group.total)}</span>
              </h3>
              <ItemList items={group.items} now={now} />
              {group.total > group.items.length && (
                <Link className="ta-dash__all" href={group.listHref}>
                  {s.seeAll(group.total)}
                </Link>
              )}
            </div>
          ))}
        </Section>

        <Section
          id="dofus-sin-checklist"
          title={s.dofus}
          total={data.dofusWithoutChecklist.total}
          help={s.dofusHelp}
          empty={s.dofusEmpty}
        >
          {data.dofusWithoutChecklist.items.length > 0 && (
            <ul className="ta-dash__list">
              {data.dofusWithoutChecklist.items.map((item) => (
                <li key={item.id} className="ta-dash__row">
                  <Link href={item.href}>{item.title}</Link>
                  {item.checklistName && (
                    <span className="ta-dash__hint">{s.dofusHint(item.checklistName)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <More
            shown={data.dofusWithoutChecklist.items.length}
            total={data.dofusWithoutChecklist.total}
          />
        </Section>

        <Section id="recientes" title={s.recent} empty={s.recentEmpty}>
          {data.recent.length > 0 && (
            <ItemList items={data.recent} now={now} tag={(item) => item.collectionLabel} />
          )}
        </Section>
      </div>
    </Gutter>
  )
}

function Section({
  id,
  title,
  total,
  help,
  empty,
  children,
}: {
  id: string
  title: string
  total?: number
  help?: string
  /** Lo que se dice sin nada que enseñar; con `total`, solo cuando es 0. */
  empty: string | null
  children: React.ReactNode
}) {
  const isEmpty = total === undefined ? empty !== null && !hasChildren(children) : total === 0
  return (
    <section className="ta-dash__card" aria-labelledby={`ta-dash-${id}`}>
      <h2 id={`ta-dash-${id}`}>
        {title}
        {total !== undefined && total > 0 && (
          <>
            {' '}
            <span className="ta-dash__count">{panelStrings.dashboard.count(total)}</span>
          </>
        )}
      </h2>
      {isEmpty ? (
        <p className="ta-dash__empty">{empty}</p>
      ) : (
        <>
          {help && <p className="ta-dash__help">{help}</p>}
          {children}
        </>
      )}
    </section>
  )
}

const hasChildren = (children: React.ReactNode) =>
  (Array.isArray(children) ? children.flat() : [children]).some(
    (child) => child !== null && child !== undefined && child !== false,
  )

function ItemList<T extends DashboardItem>({
  items,
  now,
  tag,
}: {
  items: T[]
  now: Date
  tag?: (item: T) => string
}) {
  return (
    <ul className="ta-dash__list">
      {items.map((item) => (
        <li key={`${item.collection}-${item.id}`} className="ta-dash__row">
          <Link href={item.href}>{item.title}</Link>
          <span className="ta-dash__meta">
            {tag && <span className="ta-dash__tag">{tag(item)}</span>}
            {item.updatedAt && <span>{relativeTime(item.updatedAt, now)}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function More({ shown, total }: { shown: number; total: number }) {
  return total > shown ? <p className="ta-dash__help">{s.more(shown, total)}</p> : null
}
