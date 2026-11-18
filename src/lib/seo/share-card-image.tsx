// Pinta la tarjeta al compartir (backlog S-19, DESIGN.md, Share card) con next/og, en el
// servidor: 1200 × 630, plana, en los colores de Amakna oscuro. Rowdies para el título y Lexend
// para lo demás, de src/styles/fonts/share-card/ (TTF: next/og no lee woff2).
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'
import sharp from 'sharp'

import { emblemColors, emblemSvg } from '@/components/brand/emblem-art'

import {
  SHARE_CARD_COLORS as C,
  SHARE_CARD_SIZE,
  SHARE_CARD_VEIL,
  shareCardType,
  shareTitleSize,
  type ShareCard,
} from './share-card'
import { shareStrings } from './strings'

/** El velo en rgba: --color-bg con la opacidad de SHARE_CARD_VEIL. */
const VEIL = `rgba(${[1, 3, 5].map((at) => parseInt(C.bg.slice(at, at + 2), 16)).join(', ')}, ${SHARE_CARD_VEIL})`

const FONTS_DIR = path.join(process.cwd(), 'src/styles/fonts/share-card')
const PAD = 72
const EGG_BOX = 360
const EGG_GAP = 56

let fonts: Promise<{ name: string; data: Buffer; weight: 700; style: 'normal' }[]> | undefined

/** Las dos fuentes, leídas una vez por proceso. */
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(FONTS_DIR, 'rowdies-700.ttf')),
    readFile(path.join(FONTS_DIR, 'lexend-700.ttf')),
  ]).then(([rowdies, lexend]) => [
    { name: 'Rowdies', data: rowdies, weight: 700 as const, style: 'normal' as const },
    { name: 'Lexend', data: lexend, weight: 700 as const, style: 'normal' as const },
  ])
  return fonts
}

const dataUri = (type: string, data: Buffer) => `data:${type};base64,${data.toString('base64')}`

const emblem = (size: number) =>
  dataUri(
    'image/svg+xml',
    Buffer.from(
      emblemSvg({
        colors: emblemColors({ accent: C.accent, bg: C.bg, ink: C.ink }),
        size,
      }),
    ),
  )

/** El sello: el emblema y «Torrente / Arcano» en dos líneas, como en la cabecera. */
function Lockup({ size, text }: { size: number; text: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og pinta <img>, no hay DOM */}
      <img src={emblem(size)} width={size} height={size} alt="" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Lexend',
          fontSize: text,
          lineHeight: 1,
        }}
      >
        <span style={{ color: C.ink }}>{shareStrings.brand.first}</span>
        <span style={{ color: C.accent }}>{shareStrings.brand.second}</span>
      </div>
    </div>
  )
}

/** El paisaje a la medida de la tarjeta, recortado al centro, en JPEG para next/og. */
async function zoneImage(art: Buffer) {
  const data = await sharp(art)
    .resize(SHARE_CARD_SIZE.width, SHARE_CARD_SIZE.height, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toBuffer()
  return dataUri('image/jpeg', data)
}

/** El huevo dentro de su caja, sin agrandarlo más del doble, en PNG para next/og. */
async function eggImage(art: Buffer) {
  const data = await sharp(art)
    .resize(EGG_BOX, EGG_BOX, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()
  return dataUri('image/png', data)
}

function PageCard({ card, zone, egg }: { card: ShareCard; zone?: string; egg?: string }) {
  const textWidth = SHARE_CARD_SIZE.width - 2 * PAD - (egg ? EGG_BOX + EGG_GAP : 0)
  const size = shareTitleSize(card.title, textWidth)
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        background: C.bg,
      }}
    >
      {zone && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og pinta <img> */}
          <img
            src={zone}
            width={SHARE_CARD_SIZE.width}
            height={SHARE_CARD_SIZE.height}
            alt=""
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          {/* El velo, plano: el color del fondo, sin degradado (DESIGN.md, Zone background).
              next/og no entiende inset ni la opacidad de un bloque: medidas y color con alfa. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: SHARE_CARD_SIZE.width,
              height: SHARE_CARD_SIZE.height,
              background: VEIL,
            }}
          />
        </>
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: PAD,
          alignItems: 'center',
          gap: EGG_GAP,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: textWidth,
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span
              style={{
                fontFamily: 'Lexend',
                fontSize: 30,
                color: C.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
              }}
            >
              {shareStrings.kinds[card.kind]}
            </span>
            <div
              style={{
                display: 'block',
                fontFamily: 'Rowdies',
                fontSize: size,
                lineHeight: 1.02,
                color: C.ink,
                textTransform: 'uppercase',
                lineClamp: 3,
              }}
            >
              {card.title}
            </div>
          </div>
          <Lockup size={64} text={28} />
        </div>
        {egg && (
          <div
            style={{
              display: 'flex',
              width: EGG_BOX,
              height: EGG_BOX,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og pinta <img> */}
            <img src={egg} alt="" style={{ maxWidth: EGG_BOX, maxHeight: EGG_BOX }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** La tarjeta de la marca: la portada y los índices cuando Torre no subió imagen. */
function BrandCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 40,
        width: '100%',
        height: '100%',
        padding: 96,
        background: C.bg,
      }}
    >
      <Lockup size={200} text={88} />
      <span style={{ fontFamily: 'Lexend', fontSize: 40, color: C.ink2 }}>
        {shareStrings.brandLine}
      </span>
    </div>
  )
}

export interface RenderedCard {
  body: Buffer
  type: 'image/png' | 'image/jpeg'
}

/**
 * La tarjeta en PNG o JPEG, por debajo de unos 200 KB: con el paisaje, JPEG; plana o con el
 * huevo, PNG de paleta. `art` es el archivo del paisaje o del huevo; sin él, la tarjeta plana.
 */
export async function renderShareCard(
  card: ShareCard | 'brand',
  art: Buffer | null = null,
): Promise<RenderedCard> {
  const page = card === 'brand' ? null : card
  const kind = page && art ? page.art?.kind : undefined
  const element = page ? (
    <PageCard
      card={page}
      zone={kind === 'zone' ? await zoneImage(art!) : undefined}
      egg={kind === 'egg' ? await eggImage(art!) : undefined}
    />
  ) : (
    <BrandCard />
  )
  const response = new ImageResponse(element, { ...SHARE_CARD_SIZE, fonts: await loadFonts() })
  const png = Buffer.from(await response.arrayBuffer())
  const type = page && kind ? shareCardType(page) : 'image/png'
  const body =
    type === 'image/jpeg'
      ? await lightJpeg(png)
      : await sharp(png).png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer()
  return { body, type }
}

/** El peso al que apunta la tarjeta: lo que WhatsApp y Discord bajan sin problema. */
export const SHARE_CARD_MAX_BYTES = 200 * 1024
const JPEG_QUALITIES = [82, 74, 66, 58]

/** El JPEG de mejor calidad que cabe en el peso; un paisaje muy detallado baja la calidad. */
async function lightJpeg(png: Buffer): Promise<Buffer> {
  let body = Buffer.alloc(0)
  for (const quality of JPEG_QUALITIES) {
    body = await sharp(png).jpeg({ quality, mozjpeg: true }).toBuffer()
    if (body.length <= SHARE_CARD_MAX_BYTES) break
  }
  return body
}
