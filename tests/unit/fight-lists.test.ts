import { describe, expect, it } from 'vitest'

import { comparableMonsterName, splitFightLists } from '@/lib/guides/fight-lists'

// Las listas «N x Monstruo» después de «lucha contra» pasan a un bloque Combate (DESIGN.md,
// Monster chip and fight block). Lo que no casa con un monstruo de DofusDB se queda en texto.

type Node = Record<string, unknown>
const text = (value: string, format = 0): Node => ({
  type: 'text',
  text: value,
  format,
  version: 1,
})
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', version: 1, children })
const item = (value: string): Node => ({ type: 'listitem', version: 1, children: [text(value)] })
const list = (...values: string[]): Node => ({
  type: 'list',
  listType: 'bullet',
  tag: 'ul',
  version: 1,
  children: values.map(item),
})
const richText = (id: string, ...children: Node[]) => ({
  id,
  blockType: 'richText',
  content: { root: { type: 'root', version: 1, children } },
})

const MONSTERS: Record<string, number> = {
  'ramán famélico': 11,
  'milirrata famélica': 12,
  'miserata famélica': 13,
}
const lookup = (name: string) => MONSTERS[comparableMonsterName(name)]

const intro = paragraph(
  text('Habla con '),
  text('Luci [3,-17]', 1),
  text('. Vas a empezar una lucha contra:'),
)
const fight = list('1 x Ramán famélico', '1 x Milirrata famélica', '2 x Miserata famélica.')
const after = paragraph(text('Básicamente tienen los mismos hechizos.'))

describe('splitFightLists', () => {
  it('parte el texto: lo de antes, el bloque Combate y lo de después', () => {
    const result = splitFightLists([richText('a', intro, fight, after)], lookup)

    expect(result.converted).toBe(1)
    expect(result.unmatched).toEqual([])
    expect(result.body).toEqual([
      richText('a', intro),
      {
        blockType: 'fight',
        monsters: [
          { monster: 11, quantity: 1 },
          { monster: 12, quantity: 1 },
          { monster: 13, quantity: 2 },
        ],
      },
      { blockType: 'richText', content: { root: { type: 'root', version: 1, children: [after] } } },
    ])
  })

  it('también dentro de los pasos, y sin texto detrás no deja un bloque vacío', () => {
    const step = { id: 's', blockType: 'step', x: 3, y: -17, body: [richText('a', intro, fight)] }
    const result = splitFightLists([step], lookup)

    expect(result.converted).toBe(1)
    expect(result.body).toEqual([
      { ...step, body: [richText('a', intro), expect.objectContaining({ blockType: 'fight' })] },
    ])
  })

  it('acepta una coma o un punto y coma al final de cada fila, como en algunas guías', () => {
    const commas = list('1 x Ramán famélico,', '1 x Milirrata famélica;', '1 x Miserata famélica')
    expect(splitFightLists([richText('a', intro, commas)], lookup).converted).toBe(1)
  })

  it('un nombre que no casa deja la lista en texto y se apunta', () => {
    const odd = list('1 x Ramán famélico', '1 x Jalató desconocido')
    const result = splitFightLists([richText('a', intro, odd)], lookup)

    expect(result.converted).toBe(0)
    expect(result.unmatched).toEqual(['Jalató desconocido'])
    expect(result.body).toEqual([richText('a', intro, odd)])
  })

  it('una lista sin la forma «N x Nombre» se salta y se cuenta', () => {
    const prose = list('Ramán famélico', 'y sus amigos')
    const result = splitFightLists([richText('a', intro, prose)], lookup)

    expect(result).toMatchObject({ converted: 0, skipped: 1, unmatched: [] })
    expect(result.body).toEqual([richText('a', intro, prose)])
  })

  it('solo las listas que van detrás de «lucha contra»', () => {
    const shopping = paragraph(text('Necesitarás:'))
    const body = [richText('a', shopping, list('1 x Ramán famélico'))]
    expect(splitFightLists(body, lookup)).toMatchObject({ converted: 0, skipped: 0, body })
  })

  it('repetirlo no cambia nada: ya no queda la lista', () => {
    const once = splitFightLists([richText('a', intro, fight, after)], lookup)
    const twice = splitFightLists(once.body, lookup)
    expect(twice).toMatchObject({ converted: 0, skipped: 0, unmatched: [] })
    expect(twice.body).toEqual(once.body)
  })
})

describe('comparableMonsterName', () => {
  it('sin mayúsculas, espacios de más ni el punto final', () => {
    expect(comparableMonsterName('  Miserata  Famélica. ')).toBe('miserata famélica')
  })
})
