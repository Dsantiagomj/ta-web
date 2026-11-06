import { describe, expect, it } from 'vitest'

import type { GuideBlock, GuideStep } from '@/lib/guides/page'
import { stepNav, stepPin } from '@/lib/guides/step-nav'

// La lista «Pasos» junto a la guía (DESIGN.md, Steps side list): cada paso con el primer
// término en negrita de su texto, o «Paso N», y sus coordenadas. Nunca una etiqueta inventada.

type TextNode = { type: 'text'; text: string; format?: number; version: 1 }
const text = (value: string, format = 0): TextNode => ({
  type: 'text',
  text: value,
  format,
  version: 1,
})
const bold = (value: string) => text(value, 1)

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

describe('stepNav', () => {
  it('etiqueta cada paso con el primer término en negrita de su texto', () => {
    const nav = stepNav([
      step('a', [prose('a1', text('Habla con '), bold('Hupe Esse'), text(' en [7,-19].'))]),
      step('b', [
        prose('b1', text('Ve al '), bold('zaap de Astrub'), text(' y habla con la ')),
        prose('b2', bold('Aventurera experimentada')),
      ]),
    ])
    expect(nav.map((entry) => entry.label)).toEqual(['Hupe Esse', 'zaap de Astrub'])
  })

  it('sin negrita, «Paso N»', () => {
    const nav = stepNav([
      step('a', [prose('a1', bold('Luci'))]),
      step('b', [prose('b1', text('Escolta a las anutrof fuera de la mina.'))]),
    ])
    expect(nav[1].label).toBe('Paso 2')
  })

  it('no toma una negrita vacía ni una que solo son coordenadas, y quita la puntuación final', () => {
    const nav = stepNav([
      step('a', [prose('a1', bold('  '), bold('[3,-17]'), text(' Habla con '), bold('Luci:'))]),
    ])
    expect(nav[0].label).toBe('Luci')
  })

  it('no mira dentro de los avisos ni de las capturas', () => {
    const callout: GuideBlock = {
      kind: 'callout',
      key: 'c',
      variant: 'warning',
      content: (prose('x', bold('no')) as Extract<GuideBlock, { kind: 'richText' }>).content,
    }
    expect(stepNav([step('a', [callout])])[0].label).toBe('Paso 1')
  })

  it('las coordenadas son las del paso o, sin ellas, las primeras de su texto', () => {
    const nav = stepNav([
      step('a', [prose('a1', text('Ve a [1,-17].'))], { coordinates: { x: 7, y: -19 } }),
      step('b', [prose('b1', text('A continuación, dirígete a [ 1 , -17 ] y luego a [4,-15].'))]),
      step('c', [prose('c1', text('Sin mapa.'))]),
    ])
    expect(nav.map((entry) => entry.coordinates)).toEqual([
      { x: 7, y: -19 },
      { x: 1, y: -17 },
      undefined,
    ])
  })

  it('da a cada paso un ancla estable por su posición', () => {
    const nav = stepNav([step('a', []), step('b', [])])
    expect(nav.map((entry) => entry.id)).toEqual(['paso-1', 'paso-2'])
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
