import { describe, expect, it } from 'vitest'

import type { GuideBlock, GuideStep } from '@/lib/guides/page'
import { stepAnchor, stepPin } from '@/lib/guides/step-nav'

// El ancla de cada paso y la chincheta de sus coordenadas (DESIGN.md, Steps).

type TextNode = { type: 'text'; text: string; format?: number; version: 1 }
const text = (value: string, format = 0): TextNode => ({
  type: 'text',
  text: value,
  format,
  version: 1,
})

function prose(key: string, ...children: TextNode[]): GuideBlock {
  return {
    kind: 'richText',
    key,
    content: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [{ type: 'paragraph', version: 1, children }],
      },
    },
  }
}

const step = (key: string, blocks: GuideBlock[], extra: Partial<GuideStep> = {}): GuideStep => ({
  key,
  blocks,
  ...extra,
})

describe('stepAnchor', () => {
  it('da a cada paso un ancla estable por su posición', () => {
    expect([0, 1].map(stepAnchor)).toEqual(['paso-1', 'paso-2'])
  })
})

describe('stepPin', () => {
  it('las coordenadas del paso van como chip solo si su texto no las nombra', () => {
    const coordinates = { x: 7, y: -19 }
    expect(
      stepPin(step('a', [prose('a1', text('Habla con Hupe Esse en [7,-19].'))], { coordinates })),
    ).toBeUndefined()
    expect(
      stepPin(step('b', [prose('b1', text('Habla con Hupe Esse.'))], { coordinates })),
    ).toEqual(coordinates)
    expect(stepPin(step('c', [prose('c1', text('Ve a [1,-17].'))]))).toBeUndefined()
  })
})
