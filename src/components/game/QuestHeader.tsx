import { useId } from 'react'

import { srcSetValue } from '@/components/ui/srcset'
import type { ImageAsset } from '@/components/ui/types'
import { formatAmount } from '@/lib/guides/display'
import type { QuestHeaderData } from '@/lib/guides/page'

import { CoordinatesChip } from './Coordinates'
import './game.css'
import { GAME_ICONS } from './game-icons'
import { IconWell } from './IconWell'
import { gameStrings } from './strings'

const s = gameStrings.header

// El PNJ mira a la izquierda (dirección 3) por debajo de 36rem, donde va a la derecha del
// título; por encima mira a la derecha, junto al título (DESIGN.md, Quest header).
const PHONE = '(max-width: 35.99rem)'

function Sources({ image, media }: { image: ImageAsset; media?: string }) {
  const avif = srcSetValue(image.avifSrcSet) ?? image.avif
  return (
    <>
      {avif && <source media={media} type="image/avif" srcSet={avif} />}
      {media && (
        <source
          media={media}
          type="image/webp"
          srcSet={srcSetValue(image.srcSet) ?? image.src}
          width={image.width}
          height={image.height}
        />
      )}
    </>
  )
}

function Giver({ giver }: { giver: NonNullable<QuestHeaderData['giver']> }) {
  return (
    <figure className="giver">
      <picture>
        {giver.left && <Sources image={giver.left} media={PHONE} />}
        <Sources image={giver.right} />
        {/* Decorativo: el nombre va debajo, como texto. */}
        <img
          src={giver.right.src}
          srcSet={srcSetValue(giver.right.srcSet)}
          width={giver.right.width}
          height={giver.right.height}
          alt=""
          decoding="async"
        />
      </picture>
      <figcaption>
        <span className="sr-only">{s.giver}</span>
        <strong className="giver__name">{giver.name}</strong>
        {giver.coordinates && (
          <span className="giver__pin">
            <CoordinatesChip {...giver.coordinates} />
          </span>
        )}
      </figcaption>
    </figure>
  )
}

/** El subtítulo: «Misión de Astrub - Nivel 20 - Misión 2 del logro La ocasión…». */
function Subtitle({ meta }: { meta: QuestHeaderData['meta'] }) {
  const parts: React.ReactNode[] = []
  if (meta.zone) parts.push(s.zone(meta.zone))
  if (meta.level) parts.push(s.level(meta.level))
  if (meta.achievement) {
    const trophy = GAME_ICONS.achievement
    parts.push(
      <>
        {s.achievement(meta.achievement.position)}{' '}
        <a className="qhead__ach" href={meta.achievement.href}>
          {/* eslint-disable-next-line @next/next/no-img-element -- archivo estático ya en WebP */}
          <img src={trophy.src} width={22} height={22} alt="" decoding="async" />
          {meta.achievement.name}
        </a>
      </>,
    )
  }
  if (parts.length === 0) return null
  return (
    <p className="qhead__meta">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && s.separator}
          {part}
        </span>
      ))}
    </p>
  )
}

/** Una cifra en negrita, con los miles separados por un espacio que no se parte. */
function Amount({ value }: { value: number }) {
  return <b>{formatAmount(value)}</b>
}

/**
 * La cabecera de la guía (DESIGN.md, Quest header): el PNJ que da la misión junto al
 * título, el subtítulo y las tres columnas con los iconos del juego en sus huecos. Lo que
 * falta no se pinta: sin render no hay columna del PNJ, sin datos no hay columna.
 */
export function QuestHeader({
  title,
  data,
  headingLevel = 1,
}: {
  title: string
  data: QuestHeaderData
  headingLevel?: 1 | 2
}) {
  const Heading = `h${headingLevel}` as const
  const Sub = `h${headingLevel + 1}` as 'h2' | 'h3'
  const id = useId()
  const { meta, giver, prerequisites, needs, rewards } = data
  const hasNeeds = needs.items.length > 0 || needs.notes.length > 0
  const xp = rewards.xp
  const hasRewards =
    Boolean(xp || rewards.kamas) || rewards.items.length > 0 || rewards.notes.length > 0

  return (
    <header className="qhead" data-giver={giver ? '' : undefined}>
      <Heading className="qhead__title">{title}</Heading>
      <Subtitle meta={meta} />
      {giver && <Giver giver={giver} />}
      {(prerequisites.length > 0 || hasNeeds || hasRewards) && (
        <div className="qhead__facts">
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
              <Sub id={`${id}-nec`}>{s.needs}</Sub>
              <ul role="list">
                {needs.items.map(({ item, quantity }) => (
                  <li key={item.name} className="row">
                    <IconWell image={item.icon} />
                    <span>
                      <b>{s.quantity(quantity)}</b> {item.name}
                    </span>
                  </li>
                ))}
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
            </section>
          )}
          {hasRewards && (
            <section aria-labelledby={`${id}-rec`} className="qhead__rewards">
              <Sub id={`${id}-rec`}>{s.rewards}</Sub>
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
                {rewards.items.map(({ item, quantity }) => (
                  <li key={item.name} className="row">
                    <IconWell image={item.icon} />
                    <span>
                      <b>{s.quantity(quantity)}</b> {item.name}
                    </span>
                  </li>
                ))}
                {rewards.notes.map((note) => (
                  <li key={note} className="row">
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </header>
  )
}
