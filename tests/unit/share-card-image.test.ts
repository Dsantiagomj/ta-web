import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { SHARE_CARD_VEIL } from '@/lib/seo/share-card'
import { renderShareCard } from '@/lib/seo/share-card-image'

// La tarjeta pintada (DESIGN.md, Share card): 1200 × 630, PNG o JPEG, y ligera para que
// WhatsApp y Discord la bajen siempre (unos 200 KB como mucho).

const MAX_BYTES = 200 * 1024

/** Un paisaje de mentira con mucho detalle: el peor caso para el peso del JPEG. */
const landscape = () =>
  sharp({
    create: {
      width: 1600,
      height: 800,
      channels: 3,
      background: '#5a7a3a',
      noise: { type: 'gaussian', mean: 128, sigma: 60 },
    },
  })
    .jpeg()
    .toBuffer()

const egg = () =>
  sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240"><ellipse cx="100" cy="120" rx="90" ry="115" fill="#e0a030"/></svg>',
    ),
  )
    .png()
    .toBuffer()

async function check(body: Buffer, format: 'png' | 'jpeg') {
  const meta = await sharp(body).metadata()
  expect(meta.format).toBe(format)
  expect([meta.width, meta.height]).toEqual([1200, 630])
  expect(body.length).toBeLessThanOrEqual(MAX_BYTES)
}

describe('renderShareCard', () => {
  it('la de una guía con el paisaje de su zona es un JPEG', async () => {
    const card = await renderShareCard(
      {
        kind: 'quest',
        title: 'La ocasión hace al ladrón',
        art: { kind: 'zone', src: '/x.webp' },
      },
      await landscape(),
    )
    expect(card.type).toBe('image/jpeg')
    await check(card.body, 'jpeg')
  })

  it('el paisaje va bajo el velo plano del fondo: sobre un mapa blanco, la mezcla de los dos', async () => {
    const white = await sharp({
      create: { width: 1600, height: 800, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer()
    const card = await renderShareCard(
      { kind: 'quest', title: 'Corta', art: { kind: 'zone', src: '/x.webp' } },
      white,
    )
    // Una esquina sin texto: el color del velo sobre el blanco, sin degradado.
    const { data } = await sharp(card.body)
      .extract({ left: 1100, top: 300, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const expected = [0x14, 0x11, 0x0e].map(
      (channel) => channel * SHARE_CARD_VEIL + 255 * (1 - SHARE_CARD_VEIL),
    )
    for (const [index, channel] of expected.entries()) {
      expect(Math.abs(data[index]! - channel), `canal ${index}`).toBeLessThanOrEqual(4)
    }
  })

  it('la de una guía de Dofus con su huevo es un PNG', async () => {
    const card = await renderShareCard(
      { kind: 'dofus', title: 'Dofus Ocre', art: { kind: 'egg', src: '/e.png' } },
      await egg(),
    )
    expect(card.type).toBe('image/png')
    await check(card.body, 'png')
  })

  it('sin el archivo del paisaje, la tarjeta plana', async () => {
    const card = await renderShareCard(
      { kind: 'achievement', title: 'Astrub', art: { kind: 'zone', src: '/x.webp' } },
      null,
    )
    expect(card.type).toBe('image/png')
    await check(card.body, 'png')
  })

  it('un título larguísimo y la tarjeta de la marca también se pintan', async () => {
    const long = await renderShareCard({
      kind: 'checklist',
      title:
        'Un título larguísimo que no cabe en tres líneas ni con la letra más pequeña de la tarjeta, de ninguna manera, y sigue',
    })
    await check(long.body, 'png')
    await check((await renderShareCard('brand')).body, 'png')
  })
})
