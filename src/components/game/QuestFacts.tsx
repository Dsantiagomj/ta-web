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

/**
 * El hueco de una nota de Necesitarás: el jefe de la mazmorra que nombra o, si no nombra una
 * sola, el icono de mazmorra; el icono de combate en un combate; nada en las demás.
 */
function NoteSlot({ note }: { note: QuestFactsData['needs']['notes'][number] }) {
  if (note.dungeon) {
    return note.boss ? <IconWell image={note.boss} /> : <IconWell icon="dungeon" />
  }
  return note.combat ? <IconWell icon="combat" /> : null
}

/** Una cifra en negrita, con los miles separados por un espacio que no se parte. */
function Amount({ value }: { value: number }) {
  return <b>{formatAmount(value)}</b>
}

/** Las filas de Prerrequisitos: el libro de misión y el enlace a su guía, si está publicada. */
export function PrerequisiteRows({ lines }: { lines: QuestFactsData['prerequisites'] }) {
  return lines.map((line) => (
    <li key={line.label} className="row">
      {line.quest && <IconWell icon="quest" />}
      {line.href ? <a href={line.href}>{line.label}</a> : <span>{line.label}</span>}
    </li>
  ))
}

/** Si hay recompensas que enseñar: XP, kamas, objetos o notas. */
export const hasRewards = (rewards: QuestFactsData['rewards']) =>
  Boolean(rewards.xp || rewards.kamas) || rewards.items.length > 0 || rewards.notes.length > 0

/**
 * Las filas de Recompensas: la XP, los kamas, la bolsa con los objetos y las notas. bagId
 * nombra la lista de la bolsa para su botón.
 */
export function RewardRows({
  rewards,
  bagId,
}: {
  rewards: QuestFactsData['rewards']
  bagId: string
}) {
  const xp = rewards.xp
  return (
    <>
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
      {rewards.items.length > 0 && <RewardBag id={bagId} items={rewards.items} />}
      {rewards.notes.map((note) => (
        <li key={note} className="row">
          <span>{note}</span>
        </li>
      ))}
    </>
  )
}

/**
 * Prerrequisitos, Necesitarás y Recompensas en una banda (.facts) que mide su columna:
 * una debajo de otra en el móvil; con sitio, las dos primeras lado a lado y Recompensas
 * debajo. Con los iconos del juego en sus huecos (DESIGN.md, Quest header). Una parte sin
 * filas no se pinta; sin ninguna, nada. Necesitarás va en dos listas: los objetos, que
 * copian su nombre, y debajo las notas, más juntas; las notas y la bolsa no copian nada. La
 * ficha de la página del logro usa las mismas filas (PrerequisiteRows, RewardRows).
 */
export function QuestFacts({
  facts,
  headingLevel = 1,
}: {
  facts: QuestFactsData
  headingLevel?: 1 | 2
}) {
  const Sub = `h${headingLevel + 1}` as 'h2' | 'h3'
  const id = useId()
  const { prerequisites, needs, rewards } = facts
  const hasNeeds = needs.items.length > 0 || needs.notes.length > 0
  const withRewards = hasRewards(rewards)
  if (prerequisites.length === 0 && !hasNeeds && !withRewards) return null

  return (
    <div className="qhead__facts">
      <div className="facts">
        {prerequisites.length > 0 && (
          <section aria-labelledby={`${id}-pre`}>
            <Sub id={`${id}-pre`}>{s.prerequisites}</Sub>
            <ul role="list">
              <PrerequisiteRows lines={prerequisites} />
            </ul>
          </section>
        )}
        {hasNeeds && (
          <section aria-labelledby={`${id}-nec`}>
            <Sub id={`${id}-nec`}>{s.needs}</Sub>
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
                    <NoteSlot note={note} />
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
        {withRewards && (
          <section aria-labelledby={`${id}-rec`} className="qhead__rewards">
            <Sub id={`${id}-rec`}>{s.rewards}</Sub>
            <ul role="list" className="qhead__rew">
              <RewardRows rewards={rewards} bagId={`${id}-bag`} />
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
