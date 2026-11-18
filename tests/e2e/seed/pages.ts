// Páginas sueltas de prueba para las E2E (backlog B-09): «Emotes» publicada y un emote suyo
// con texto, una captura, un paso con coordenadas, un aviso y enlaces de Torre a su propia web
// (a una página de aquí, a una que solo está en Squarespace y a una URL que aquí responde 410,
// src/lib/site/site-links.ts); el aviso legal En preparación,
// que lleva a Squarespace; y la política de cookies publicada, para el pie. Se siembra con
// scripts/seed-e2e.ts sobre la base vacía de las pruebas, nunca sobre una real.
import path from 'node:path'
import type { Payload } from 'payload'

import type { RichTextBlock } from '../../../src/payload-types.ts'

export const seedPages = {
  emotes: {
    title: 'Emotes',
    slug: 'emotes-global',
    intro: 'Aquí tienes todos los emotes disponibles en la página web.',
  },
  emote: {
    title: 'Señalar con el dedo',
    slug: 'emote-sealar-con-el-dedo',
    metaTitle: 'Emote: Señalar con el dedo',
    metaDescription: 'Cómo conseguir el emote de señalar con el dedo en Dofus.',
    intro: 'Para conseguir este emote, simplemente debes pasar una vez la mazmorra de los Bworks.',
    step: 'Entra en la mazmorra y gana el último combate.',
    warning: 'Una vez salgas de la mazmorra, ya tendrás el emote.',
    image: { file: 'public/img/sistema/seis-pies-combate.webp', alt: 'La sala del Bworknoso' },
    links: {
      text: 'Más emotes:',
      served: { name: 'todos los emotes', url: 'https://www.torrentearcano.com/emotes-global' },
      missing: { name: 'bailar', url: '/emote-bailar' },
      gone: { name: 'la tienda', url: 'https://www.torrentearcano.com/cart' },
    },
  },
  notice: {
    title: 'Aviso Legal',
    slug: 'aviso-legal',
    legacyHref: 'https://www.torrentearcano.com/aviso-legal',
  },
  cookies: {
    title: 'Política de Cookies de torrentearcano.com',
    slug: 'politica-de-cookies',
    intro: 'En este sitio web utilizamos cookies.',
  },
} as const

type LexicalNode = Record<string, unknown>

const text = (value: string): LexicalNode => ({
  type: 'text',
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})

const element = (type: string, children: LexicalNode[], extra: LexicalNode = {}): LexicalNode => ({
  type,
  children,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  ...extra,
})

const richText = (value: string) =>
  ({
    root: element('root', [element('paragraph', [text(value)], { textFormat: 0, textStyle: '' })]),
  }) as unknown as RichTextBlock['content']

/** Un párrafo con enlaces escritos (no internos), como los que trajo la importación. */
const linksText = (lead: string, links: { name: string; url: string }[]) =>
  ({
    root: element('root', [
      element(
        'paragraph',
        [
          text(`${lead} `),
          ...links.flatMap(({ name, url }) => [
            element('link', [text(name)], { fields: { url, linkType: 'custom', newTab: false } }),
            text(' '),
          ]),
        ],
        { textFormat: 0, textStyle: '' },
      ),
    ]),
  }) as unknown as RichTextBlock['content']

async function upsert(payload: Payload, data: Record<string, unknown> & { slug: string }) {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: data.slug } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0]
  return payload.create({ collection: 'pages', data: { ...data, _status: 'published' } as never })
}

export async function seedPagesData(payload: Payload): Promise<void> {
  const { emotes, emote, notice, cookies } = seedPages
  const parent = await upsert(payload, {
    title: emotes.title,
    slug: emotes.slug,
    state: 'published',
    body: [{ blockType: 'richText', content: richText(emotes.intro) }],
  })

  const found = await payload.find({
    collection: 'media',
    where: { alt: { equals: emote.image.alt } },
    limit: 1,
  })
  const image =
    found.docs[0] ??
    (await payload.create({
      collection: 'media',
      data: { alt: emote.image.alt },
      filePath: path.resolve(emote.image.file),
    }))

  await upsert(payload, {
    title: emote.title,
    slug: emote.slug,
    state: 'published',
    parent: parent.id,
    seo: { metaTitle: emote.metaTitle, metaDescription: emote.metaDescription },
    body: [
      { blockType: 'richText', content: richText(emote.intro) },
      { blockType: 'image', image: image.id },
      {
        blockType: 'step',
        x: -5,
        y: 10,
        body: [{ blockType: 'richText', content: richText(emote.step) }],
      },
      { blockType: 'callout', variant: 'warning', content: richText(emote.warning) },
      {
        blockType: 'richText',
        content: linksText(emote.links.text, [
          emote.links.served,
          emote.links.missing,
          emote.links.gone,
        ]),
      },
    ],
  })

  await upsert(payload, {
    title: notice.title,
    slug: notice.slug,
    state: 'preparing',
    legacyHref: notice.legacyHref,
    body: [{ blockType: 'richText', content: richText('Texto del aviso legal.') }],
  })

  await upsert(payload, {
    title: cookies.title,
    slug: cookies.slug,
    state: 'published',
    body: [{ blockType: 'richText', content: richText(cookies.intro) }],
  })
}
