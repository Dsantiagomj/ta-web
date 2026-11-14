import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  itemNamePattern,
  onlyItem,
  singularForms,
} from '../../scripts/import/dofus-guides/item-match'
import { parseDofusGuide, type DofusGuideSource } from '../../scripts/import/dofus-guides/parse'
import type { RawItem } from '@/lib/dofusdb/types'

// Una fila de Necesitarás sin cantidad es un objeto solo si un único objeto del juego se llama
// así, sin mirar mayúsculas ni tildes. Con ninguno o con varios se queda como nota.

const cacao = parseDofusGuide(
  readFileSync(new URL('../fixtures/dofus-guides/dofus-cacao.html', import.meta.url), 'utf8'),
) as DofusGuideSource
const varita = cacao
  .needs!.groups.flatMap((group) => group.rows)
  .find((row) => row.text === 'Varita pitusa.')!

const item = (id: number, name: string, typeId = 1): RawItem => ({ id, name: { es: name }, typeId })

/** Lo que devolvería DofusDB para el patrón: lo filtra igual que su $regex con $options i. */
const search = (name: string | string[], items: RawItem[]) => {
  const pattern = new RegExp(itemNamePattern(name), 'i')
  return items.filter((row) => pattern.test(row.name?.es ?? ''))
}

describe('onlyItem', () => {
  it('casa la Varita pitusa del Cacao, sin «1 x», con el único objeto que se llama así', () => {
    const rows = search(varita.name!, [item(8102, 'Varita pitusa'), item(8103, 'Varita pitusa+')])
    expect(onlyItem(varita.name!, rows)).toEqual(item(8102, 'Varita pitusa'))
  })

  it('no mira mayúsculas ni tildes', () => {
    const rows = search('Piel de Rojiva', [item(17298, 'Piel de rojiva')])
    expect(onlyItem('Piel de Rojiva', rows)).toEqual(item(17298, 'Piel de rojiva'))
    const accents = search('Tunica del jefe', [item(5, 'Túnica del jefe')])
    expect(onlyItem('Tunica del jefe', accents)).toEqual(item(5, 'Túnica del jefe'))
  })

  it('sin ningún objeto con ese nombre, nada: la fila queda como nota', () => {
    const rows = search('Un par de combates por allí y por allá', [item(8102, 'Varita pitusa')])
    expect(rows).toEqual([])
    expect(onlyItem('Un par de combates por allí y por allá', rows)).toBeNull()
  })

  it('con varios objetos del mismo nombre no adivina: nada', () => {
    const rows = search(varita.name!, [item(8102, 'Varita pitusa'), item(19001, 'Varita Pitusa')])
    expect(rows).toHaveLength(2)
    expect(onlyItem(varita.name!, rows)).toBeNull()
  })

  it('el patrón casa el nombre entero, con sus signos tal cual', () => {
    const pattern = new RegExp(itemNamePattern('Llave (Kanojedo)'), 'i')
    expect(pattern.test('Llave (Kanojedo)')).toBe(true)
    expect(pattern.test('Llave (Kanojedo) dorada')).toBe(false)
    expect(pattern.test('Llave Kanojedo')).toBe(false)
  })
})

describe('singularForms', () => {
  it('quita la «s» o la «es» final de una palabra sola', () => {
    expect(singularForms('Bananaranjas')).toEqual(['Bananaranja'])
    expect(singularForms('Pepitas')).toEqual(['Pepita'])
    expect(singularForms('Flores')).toEqual(['Flore', 'Flor'])
  })

  it('en un nombre de varias palabras, el sustantivo del principio, la última palabra o ambos', () => {
    expect(singularForms('Orejas de buldogro')).toEqual(['Oreja de buldogro'])
    expect(singularForms('Alas rojas')).toEqual(['Ala rojas', 'Alas roja', 'Ala roja'])
  })

  it('sin plural no hay nada que probar', () => {
    expect(singularForms('Varita pitusa')).toEqual([])
    expect(singularForms('Gas')).toEqual([])
  })
})

describe('onlyItem en singular', () => {
  const items = [
    item(16834, 'Bananaranja'),
    item(16835, 'Bananaranja de oro'),
    item(311, 'Pepita'),
    item(380, 'Oreja de buldogro'),
    item(401, 'Flor'),
    item(402, 'Flore'),
    // El mismo objeto repetido (mismo nombre y tipo): el de ID más bajo.
    item(501, 'Llave'),
    item(502, 'Llave'),
    // Dos objetos distintos con el mismo nombre (otro tipo): no se adivina.
    item(601, 'Capa', 17),
    item(602, 'Capa', 16),
  ]
  const singular = (name: string) => {
    const forms = singularForms(name)
    return onlyItem(forms, search(forms, items))
  }

  it('«8 x Bananaranjas» es la Bananaranja', () => {
    expect(singular('Bananaranjas')).toEqual(item(16834, 'Bananaranja'))
    expect(singular('Pepitas')).toEqual(item(311, 'Pepita'))
    expect(singular('Orejas de buldogro')).toEqual(item(380, 'Oreja de buldogro'))
  })

  it('si el singular casa con varios objetos no adivina', () => {
    // «Flores»: «Flore» y «Flor» son dos objetos distintos.
    expect(singular('Flores')).toBeNull()
    // «Capas»: dos objetos distintos que se llaman «Capa».
    expect(singular('Capas')).toBeNull()
  })

  it('el mismo objeto repetido en DofusDB no es duda: vale el de ID más bajo', () => {
    expect(singular('Llaves')).toEqual(item(501, 'Llave'))
  })

  it('si el singular no casa con nada, nada', () => {
    expect(singular('Combates')).toBeNull()
  })
})
