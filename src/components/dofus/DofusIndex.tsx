import type { CSSProperties } from 'react'

import { GuideRichText } from '@/components/game/GuideRichText'
import { Picture } from '@/components/ui/Picture'
import type { DofusCard, DofusIndexView } from '@/lib/dofus-guides/index-view'
import { dofusIndexStrings as s, dofusPageStrings } from '@/lib/dofus-guides/strings'
import type { RichTextState } from '@/lib/guides/page'

import '../achievement/achievement.css'
import { DofusIndexIsland } from './DofusIndexIsland'
import './dofus-index.css'

function CardInner({ card }: { card: DofusCard }) {
  return (
    <>
      <span className="dcard__art" aria-hidden="true">
        {card.egg && <Picture image={card.egg} alt="" sizes="104px" />}
      </span>
      {card.tagLabel && <span className="dcard__tag">{card.tagLabel}</span>}
      <span className="dcard__n">{card.name}</span>
      {card.meta && <span className="dcard__m">{card.meta}</span>}
      {card.disabled && <span className="ztag">{dofusPageStrings.preparing}</span>}
    </>
  )
}

/** Las tarjetas de los Dofus, sin buscador: el índice y el catálogo /sistema. */
export function DofusCards({ cards }: { cards: DofusCard[] }) {
  return (
    <ul className="dg-grid" role="list" data-dofus-grid="">
      {cards.map((card) => (
        <li
          key={card.slug}
          className="dcard-cell"
          data-search={card.search}
          data-tag={card.tag ?? ''}
        >
          <Card card={card} />
        </li>
      ))}
    </ul>
  )
}

function Card({ card }: { card: DofusCard }) {
  const style = (card.color ? { '--egg': card.color } : undefined) as CSSProperties | undefined
  return card.href ? (
    <a className="dcard" href={card.href} style={style}>
      <CardInner card={card} />
    </a>
  ) : (
    <div className="dcard dcard--off" aria-disabled="true" style={style}>
      <CardInner card={card} />
    </div>
  )
}

/**
 * El índice de las guías de Dofus (DESIGN.md, Dofus guides index): el título, la entradilla
 * de Torre y una tarjeta por Dofus en su orden. La isla añade el buscador y los filtros; sin
 * JavaScript se ven todas las tarjetas. Ninguna cifra en el título: cambian con el tiempo.
 */
export function DofusIndex({ view, intro }: { view: DofusIndexView; intro: RichTextState | null }) {
  return (
    <main id="contenido" className="dg-index">
      <header className="dg-hero">
        <p className="dg-eyebrow">{s.eyebrow}</p>
        <h1 className="dg-h1">{s.title}</h1>
        {intro && (
          <div className="dg-lead guide-body">
            <GuideRichText content={intro} />
          </div>
        )}
      </header>
      <DofusIndexIsland filters={view.filters} />
      <DofusCards cards={view.cards} />
    </main>
  )
}
