import type { Block, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { classifyLink, reportLines, type LegacyLinkEntry } from '../../scripts/legacy-links/report'
import { hasLinkFields, scanLinks } from '../../scripts/legacy-links/scan'

// pnpm links:legacy: lo que el sitio pintaría hacia la web de Squarespace, sacado del código y
// del contenido, y si este sitio servirá esa ruta tras el cambio de dominio.

const link = (url: string) => ({
  type: 'link',
  fields: { url, linkType: 'custom' },
  children: [{ type: 'text', text: 'aquí' }],
})
const richText = (...children: unknown[]) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children }] },
})

const step: Block = {
  slug: 'step',
  fields: [{ name: 'content', type: 'richText' }],
}

const fields: Field[] = [
  { name: 'title', type: 'text' },
  { name: 'originalUrl', type: 'text' },
  { name: 'intro', type: 'richText' },
  { name: 'legacyHref', type: 'text' },
  { name: 'importSnapshot', type: 'json' },
  {
    type: 'tabs',
    tabs: [
      { label: 'Contenido', fields: [{ name: 'body', type: 'blocks', blocks: [step] }] },
      {
        name: 'checklist',
        label: 'Checklist',
        fields: [{ name: 'url', type: 'text' }],
      },
    ],
  },
  {
    type: 'row',
    fields: [
      {
        name: 'rows',
        type: 'array',
        fields: [
          { name: 'link', type: 'text' },
          { name: 'achievement', type: 'relationship', relationTo: 'achievement-pages' },
        ],
      },
    ],
  },
]

describe('scanLinks', () => {
  it('los enlaces del texto rico y los campos de enlace, con dónde están', () => {
    const doc = {
      title: 'https://www.torrentearcano.com/no-es-un-enlace',
      originalUrl: 'https://www.torrentearcano.com/su-url-de-siempre',
      intro: richText(link('https://www.torrentearcano.com/emotes')),
      legacyHref: 'https://www.torrentearcano.com/guia',
      importSnapshot: { intro: richText(link('/viejo')) },
      body: [{ blockType: 'step', content: richText(link('/emote-bailar')) }],
      checklist: { url: 'https://www.torrentearcano.com/lista-ocre' },
      rows: [{ link: '/al-partir', achievement: 7 }, { link: null }],
    }
    expect(scanLinks(fields, doc)).toEqual([
      { href: 'https://www.torrentearcano.com/emotes', field: 'intro', parent: doc },
      { href: 'https://www.torrentearcano.com/guia', field: 'legacyHref', parent: doc },
      { href: '/emote-bailar', field: 'body.1.content', parent: doc.body[0] },
      {
        href: 'https://www.torrentearcano.com/lista-ocre',
        field: 'checklist.url',
        parent: doc.checklist,
      },
      { href: '/al-partir', field: 'rows.1.link', parent: doc.rows[0] },
    ])
  })

  it('sabe qué colecciones tienen dónde guardar un enlace', () => {
    expect(hasLinkFields(fields)).toBe(true)
    expect(hasLinkFields([{ name: 'name', type: 'text' }])).toBe(false)
  })
})

const live = (slug: string) => ['emotes', 'aviso-legal'].includes(slug)

describe('classifyLink', () => {
  it('lo que pinta el sitio y qué responderá esa ruta tras el cambio', () => {
    expect(classifyLink('https://www.torrentearcano.com/emotes', live)).toEqual({
      path: '/emotes',
      served: 'page',
      rendered: '/emotes',
    })
    expect(classifyLink('/metalogro-alineamiento', live)).toMatchObject({ served: 'redirect' })
    expect(classifyLink('https://torrentearcano.com/cart', live)).toEqual({
      path: '/cart',
      served: 'gone',
      rendered: 'https://torrentearcano.com/cart',
    })
    expect(classifyLink('/emote-bailar', live)).toEqual({
      path: '/emote-bailar',
      served: null,
      rendered: 'https://www.torrentearcano.com/emote-bailar',
    })
    expect(classifyLink('https://www.youtube.com/watch?v=x', live)).toBeNull()
  })
})

describe('reportLines', () => {
  const entries: LegacyLinkEntry[] = [
    {
      source: 'code',
      where: 'Menú, pie y portada: sección «Clases»',
      href: 'https://www.torrentearcano.com/clases-1',
      served: null,
      note: 'hoy no se enlaza: «Próximamente»',
    },
    {
      source: 'content',
      where: 'Guía de misión «Seis pies» (/seis-pies), body.2.content',
      href: 'https://www.torrentearcano.com/emote-bailar',
      served: null,
    },
    {
      source: 'content',
      where: 'Página «Emotes» (/emotes), body.1.content',
      href: 'https://www.torrentearcano.com/cart',
      served: 'gone',
    },
    {
      source: 'preparing',
      where: 'Checklist «Hielos» (/checklist-hielos)',
      href: 'https://www.torrentearcano.com/checklist-hielos',
      served: null,
    },
  ]

  it('agrupa por de dónde sale y dice qué responderá la ruta', () => {
    const text = reportLines(entries, { relative: { page: 3, redirect: 1, route: 0 } })
    expect(text).toContain('Del código (1)')
    expect(text).toContain(
      '  Menú, pie y portada: sección «Clases» → https://www.torrentearcano.com/clases-1 · 404 tras el cambio · hoy no se enlaza: «Próximamente»',
    )
    expect(text).toContain('Del contenido (2)')
    expect(text).toContain(
      '  Página «Emotes» (/emotes), body.1.content → https://www.torrentearcano.com/cart · 410 tras el cambio',
    )
    expect(text).toContain('En preparación, lo decide Torre (1)')
    expect(text.at(-1)).toBe(
      'Resumen: 4 por resolver (1 del código, 2 del contenido, 1 en preparación). Ya van a este sitio: 4 (3 páginas, 1 redirección).',
    )
  })

  it('sin nada por resolver, lo dice', () => {
    const text = reportLines([], { relative: { page: 0, redirect: 0, route: 0 } })
    expect(text.at(-1)).toBe('Resumen: nada por resolver. Ya van a este sitio: 0.')
  })
})
