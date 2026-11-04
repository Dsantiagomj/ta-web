import { describe, expect, it } from 'vitest'

import config from '@payload-config'

import { createHtmlToLexical } from '../../scripts/import/rich-text'

type LexicalNode = {
  type: string
  text?: string
  format?: number
  tag?: string
  fields?: { url?: string }
  children?: LexicalNode[]
}

function summarize(node: LexicalNode): unknown {
  if (node.type === 'text')
    return node.format ? { text: node.text, format: node.format } : node.text
  const children = (node.children ?? []).map(summarize)
  if (node.type === 'link') return { link: node.fields?.url, children }
  if (node.type === 'list') return { list: node.tag, children }
  return { [node.type]: children }
}

describe('HTML de Squarespace a Lexical', () => {
  it('convierte párrafos, negritas, enlaces y listas con el editor de Payload', async () => {
    const toLexical = await createHtmlToLexical(await config)
    const state = toLexical(
      '<p class="" style="white-space:pre-wrap;">Ve a <strong>Astrub</strong> y lee <a href="/ron-marino">esto</a>.</p>' +
        '<ul data-rte-list="default"><li><p>Uno</p></li><li><p>Dos</p></li></ul>',
    )
    expect(state.root.children.map((node) => summarize(node as LexicalNode))).toEqual([
      {
        paragraph: [
          'Ve a ',
          { text: 'Astrub', format: 1 },
          ' y lee ',
          { link: '/ron-marino', children: ['esto'] },
          '.',
        ],
      },
      { list: 'ul', children: [{ listitem: ['Uno'] }, { listitem: ['Dos'] }] },
    ])
  })
})
