import { srcSetValue } from '@/components/ui/srcset'
import type { ImageAsset } from '@/components/ui/types'
import type { QuestHeaderData } from '@/lib/guides/page'

import { CoordinatesChip } from './Coordinates'
import './game.css'
import { GAME_ICONS } from './game-icons'
import { QuestFacts } from './QuestFacts'
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
  const { meta, giver, prerequisites, needs, rewards } = data

  return (
    <header className="qhead" data-giver={giver ? '' : undefined}>
      <Heading className="qhead__title">{title}</Heading>
      <Subtitle meta={meta} />
      {giver && <Giver giver={giver} />}
      <QuestFacts facts={{ prerequisites, needs, rewards }} headingLevel={headingLevel} />
    </header>
  )
}
