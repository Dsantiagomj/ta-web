import { srcSetValue } from '@/components/ui/srcset'
import type { ImageAsset } from '@/components/ui/types'
import type { QuestHeaderData } from '@/lib/guides/page'

import { CoordinatesChip } from './Coordinates'
import './game.css'
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
        {/* Decorativo: el nombre va en la línea «Empieza con», como texto. */}
        <img
          src={giver.right.src}
          srcSet={srcSetValue(giver.right.srcSet)}
          width={giver.right.width}
          height={giver.right.height}
          alt=""
          decoding="async"
        />
      </picture>
    </figure>
  )
}

/** «Empieza con **Hupe Esse** [7,-19]», bajo el subtítulo: el render va solo. */
function Start({ giver }: { giver: NonNullable<QuestHeaderData['giver']> }) {
  return (
    <p className="qhead__start">
      {s.giver}
      <strong className="giver__name">{giver.name}</strong>
      {giver.coordinates && (
        <>
          {' '}
          <span className="giver__pin">
            <CoordinatesChip {...giver.coordinates} />
          </span>
        </>
      )}
    </p>
  )
}

/** El subtítulo: «Misión de Astrub - Nivel 20 - Misión 2 de 3». El logro va en las migas. */
function Subtitle({ meta }: { meta: QuestHeaderData['meta'] }) {
  const parts: React.ReactNode[] = []
  if (meta.zone) parts.push(s.zone(meta.zone))
  if (meta.level) parts.push(s.level(meta.level))
  if (meta.achievement) parts.push(s.achievement(meta.achievement.position, meta.achievement.total))
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
 * La cabecera de la guía (DESIGN.md, Quest header): el render del PNJ que da la misión
 * junto al título, el subtítulo, «Empieza con» el PNJ y sus coordenadas, y las tres partes con los iconos del juego en sus huecos. Lo que
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
      {giver && <Start giver={giver} />}
      {giver && <Giver giver={giver} />}
      <QuestFacts facts={{ prerequisites, needs, rewards }} headingLevel={headingLevel} />
    </header>
  )
}
