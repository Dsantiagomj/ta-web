import type { CSSProperties } from 'react'

import { Picture } from '@/components/ui/Picture'
import type { ChecklistEntry } from '@/lib/checklists/list'
import { checklistIndexStrings as s } from '@/lib/checklists/strings'

import './checklists-index.css'

/**
 * Las tarjetas que se ven al cargar: su huevo puede ser la imagen más grande de la pantalla
 * (el LCP) y no se difiere.
 */
const ABOVE_THE_FOLD = 2

function CardInner({ entry, priority }: { entry: ChecklistEntry; priority: boolean }) {
  return (
    <>
      <span className="ckcard__art" aria-hidden="true">
        {entry.egg && <Picture image={entry.egg} alt="" sizes="88px" priority={priority} />}
      </span>
      <span className="ckcard__body">
        <span className="ckcard__n">{entry.name}</span>
        {entry.description && <span className="ckcard__d">{entry.description}</span>}
        {entry.state === 'preparing' && (
          <span className="ckcard__state">
            <span className="ztag">{s.preparing}</span>
            {entry.legacy && <span className="ckcard__legacy">{s.legacy}</span>}
          </span>
        )}
      </span>
    </>
  )
}

function Card({ entry, priority }: { entry: ChecklistEntry; priority: boolean }) {
  const style = (entry.color ? { '--egg': entry.color } : undefined) as CSSProperties | undefined
  return entry.href ? (
    <a className="ckcard" href={entry.href} style={style}>
      <CardInner entry={entry} priority={priority} />
    </a>
  ) : (
    <div className="ckcard ckcard--off" aria-disabled="true" style={style}>
      <CardInner entry={entry} priority={priority} />
    </div>
  )
}

/** Las tarjetas de las checklists: el índice y el catálogo /sistema. */
export function ChecklistIndexCards({ entries }: { entries: ChecklistEntry[] }) {
  return (
    <ul className="ck-grid" role="list" data-checklist-grid="">
      {entries.map((entry, index) => (
        <li key={entry.slug}>
          <Card entry={entry} priority={index < ABOVE_THE_FOLD} />
        </li>
      ))}
    </ul>
  )
}

/**
 * El índice de las checklists (DESIGN.md, Checklists index): el título, la entradilla y una
 * tarjeta por checklist publicada en el orden de Torre. Una En preparación con legacyHref
 * lleva a su checklist de Squarespace y lo dice. Sin ninguna, un aviso en vez de una rejilla
 * vacía. Ninguna cifra: Torre suma checklists.
 */
export function ChecklistsIndex({ entries }: { entries: ChecklistEntry[] }) {
  return (
    <main id="contenido" className="ck-index">
      <header className="ck-hero">
        <p className="ck-eyebrow">{s.eyebrow}</p>
        <h1 className="ck-h1">{s.title}</h1>
        <p className="ck-lead">{s.lead}</p>
      </header>
      {entries.length ? (
        <ChecklistIndexCards entries={entries} />
      ) : (
        <p className="ck-empty">{s.empty}</p>
      )}
    </main>
  )
}
