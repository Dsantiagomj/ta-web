import { useId } from 'react'

import { formatAmount } from '@/lib/guides/display'
import type { QuestHeaderData } from '@/lib/guides/page'

import './game.css'
import { ChevronIcon } from './icons'
import { IconWell } from './IconWell'
import { CopyName } from './Item'
import { gameStrings } from './strings'

const s = gameStrings.header

/** Las tres columnas: lo mismo en la cabecera de la guía y en la del logro. */
export type QuestFactsData = Pick<QuestHeaderData, 'prerequisites' | 'needs' | 'rewards'>

/**
 * Los objetos de la recompensa en la bolsa del inventario (DESIGN.md, Quest header): un
 * botón de divulgación con la bolsa del juego y «4 objetos» que abre su lista. Sin
 * JavaScript la lista se ve debajo; con él (data-js en <html>), empieza cerrada y la isla
 * de la página la abre y la cierra.
 */
function RewardBag({ id, items }: { id: string; items: QuestHeaderData['rewards']['items'] }) {
  return (
    <li className="bag" data-bag="">
      <button type="button" className="bag__btn" aria-expanded="false" aria-controls={id}>
        <IconWell icon="bag" />
        <span>
          <Amount value={items.length} /> {s.bagCount(items.length)}
        </span>
        <ChevronIcon className="bag__chev" />
      </button>
      <ul role="list" id={id} className="bag__list" aria-label={s.bagList}>
        {items.map(({ item, quantity }) => (
          <li key={item.name} className="row">
            <IconWell image={item.icon} />
            <span>
              <b>{s.quantity(quantity)}</b> {item.name}
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Una cifra en negrita, con los miles separados por un espacio que no se parte. */
function Amount({ value }: { value: number }) {
  return <b>{formatAmount(value)}</b>
}

/**
 * Prerrequisitos, Necesitarás y Recompensas en una banda (.facts) que mide su columna:
 * una debajo de otra en el móvil; con sitio, las dos primeras lado a lado y Recompensas
 * debajo. Con los iconos del juego en sus huecos (DESIGN.md, Quest header). Una parte sin filas no se pinta; sin ninguna,
 * nada. La página del logro cambia los títulos («Necesitarás en total», «Recompensas del
 * logro»). Necesitarás va en dos listas: los objetos, que copian su nombre, y debajo las
 * notas, más juntas; las notas y la bolsa no copian nada.
 */
export function QuestFacts({
  facts,
  headingLevel = 1,
  labels = {},
}: {
  facts: QuestFactsData
  headingLevel?: 1 | 2
  labels?: { needs?: string; rewards?: string }
}) {
  const Sub = `h${headingLevel + 1}` as 'h2' | 'h3'
  const id = useId()
  const { prerequisites, needs, rewards } = facts
  const hasNeeds = needs.items.length > 0 || needs.notes.length > 0
  const xp = rewards.xp
  const hasRewards =
    Boolean(xp || rewards.kamas) || rewards.items.length > 0 || rewards.notes.length > 0
  if (prerequisites.length === 0 && !hasNeeds && !hasRewards) return null

  return (
    <div className="qhead__facts">
      <div className="facts">
        {prerequisites.length > 0 && (
          <section aria-labelledby={`${id}-pre`}>
            <Sub id={`${id}-pre`}>{s.prerequisites}</Sub>
            <ul role="list">
              {prerequisites.map((line) => (
                <li key={line.label} className="row">
                  {line.quest && <IconWell icon="quest" />}
                  {line.href ? <a href={line.href}>{line.label}</a> : <span>{line.label}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {hasNeeds && (
          <section aria-labelledby={`${id}-nec`}>
            <Sub id={`${id}-nec`}>{labels.needs ?? s.needs}</Sub>
            {needs.items.length > 0 && (
              <ul role="list" className="needs__items">
                {needs.items.map(({ item, quantity }) => (
                  <li key={item.name} className="row copyhost">
                    <IconWell image={item.icon} />
                    <span>
                      <b>{s.quantity(quantity)}</b> <CopyName name={item.name} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {needs.notes.length > 0 && (
              <ul role="list" className="needs__notes">
                {needs.notes.map((note) => (
                  <li key={note.label} className="row">
                    {note.combat && <IconWell icon="combat" />}
                    <span>
                      {note.quantity != null && <b>{s.quantity(note.quantity)} </b>}
                      {note.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {hasRewards && (
          <section aria-labelledby={`${id}-rec`} className="qhead__rewards">
            <Sub id={`${id}-rec`}>{labels.rewards ?? s.rewards}</Sub>
            <ul role="list" className="qhead__rew">
              {xp && (
                <li className="row">
                  <IconWell icon="xp" />
                  <span>
                    {xp.min != null && (
                      <>
                        <Amount value={xp.min} /> {s.xpRangeJoin}{' '}
                      </>
                    )}
                    <Amount value={xp.max} /> {s.xp}
                  </span>
                </li>
              )}
              {rewards.kamas != null && (
                <li className="row">
                  <IconWell icon="kamas" />
                  <span>
                    <Amount value={rewards.kamas} /> {s.kamas}
                  </span>
                </li>
              )}
              {rewards.items.length > 0 && <RewardBag id={`${id}-bag`} items={rewards.items} />}
              {rewards.notes.map((note) => (
                <li key={note} className="row">
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
