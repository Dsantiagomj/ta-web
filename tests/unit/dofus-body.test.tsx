import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DofusBody } from '@/components/dofus/DofusGuideParts'
import type { GuideContent, RichTextState } from '@/lib/guides/page'

// El paso a paso de una guía de Dofus (la Piñata de pino): la prosa, las capturas y los pasos,
// como en una guía de misión. Antes no se pintaba nada bajo «Paso a paso».

const text = (value: string): RichTextState => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: [{ type: 'text', text: value, format: 0, version: 1 }],
      },
    ],
  },
})

const content: GuideContent = {
  intro: [
    { kind: 'richText', key: 'a', content: text('Allí encontrarás a Gobalden.') },
    {
      kind: 'image',
      key: 'b',
      image: { src: '/media/579152.webp', width: 800, height: 600 },
      alt: 'Las respuestas de Gobalden',
      priority: false,
    },
  ],
  steps: [
    {
      key: 'c',
      coordinates: { x: 38, y: -80 },
      blocks: [{ kind: 'richText', key: 'd', content: text('Habla con Goblepino.') }],
    },
  ],
  outro: [{ kind: 'richText', key: 'e', content: text('Por fin obtendrás tu piñata de pino.') }],
}

describe('DofusBody', () => {
  it('pinta la prosa, las capturas y los pasos bajo «Paso a paso»', () => {
    const html = renderToStaticMarkup(<DofusBody content={content} />)
    expect(html).toContain('Paso a paso')
    expect(html).toContain('Allí encontrarás a Gobalden.')
    expect(html).toContain('Las respuestas de Gobalden')
    expect(html).toContain('Habla con Goblepino.')
    expect(html).toContain('38,-80')
    expect(html).toContain('Por fin obtendrás tu piñata de pino.')
  })

  it('sin cuerpo no hay sección', () => {
    expect(renderToStaticMarkup(<DofusBody content={{ intro: [], steps: [], outro: [] }} />)).toBe(
      '',
    )
  })
})
