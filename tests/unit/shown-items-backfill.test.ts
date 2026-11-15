import { describe, expect, it } from 'vitest'

import type { RawQuest } from '@/lib/dofusdb/types'
import { legacyQuestItems, shownItemsDecision } from '@/lib/guides/shown-items'

import shownItems from '../fixtures/dofusdb/quests-shown-items.json'

// Las guías rellenadas desde DofusDB antes de separar «Enséñale» de «Entrégale» guardan lo
// que se enseña sumado. La puesta al día cambia solo las que siguen con ese valor.

const raw = (id: number) => {
  const found = (shownItems as RawQuest[]).find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
  return structuredClone(found)
}

// El catálogo de items de dev: el Cocobur es una espada; el frasco, un objeto de misión
// (supertipo 14), que la lista de Necesitarás no muestra.
const catalog = new Map([
  [20210, { id: 2239, dofusId: 20210, superTypeId: 2, name: 'Cocobur' }],
  [20211, { id: 9001, dofusId: 20211, superTypeId: 14, name: 'Frasco de agua mágica' }],
])

describe('legacyQuestItems: lo que daba questNeeds antes', () => {
  it('El forjador de leyenda: 2 × Cocobur, como la guía de dev', () => {
    expect(legacyQuestItems(raw(2036))).toEqual([
      { dofusId: 20210, quantity: 2 },
      { dofusId: 20211, quantity: 1 },
    ])
  })
})

describe('shownItemsDecision', () => {
  it('cambia la lista que sigue con lo que rellenaba DofusDB', () => {
    expect(shownItemsDecision([{ item: 2239, quantity: 2 }], raw(2036), catalog)).toEqual({
      status: 'fix',
      from: [{ item: 2239, quantity: 2 }],
      to: [{ item: 2239, quantity: 1 }],
    })
  })

  it('no toca una lista que Torre cambió', () => {
    expect(shownItemsDecision([{ item: 2239, quantity: 3 }], raw(2036), catalog)).toEqual({
      status: 'different',
    })
    expect(shownItemsDecision([], raw(2036), catalog)).toEqual({ status: 'different' })
  })

  it('una lista ya al día no cambia', () => {
    expect(shownItemsDecision([{ item: 2239, quantity: 1 }], raw(2036), catalog)).toEqual({
      status: 'current',
    })
  })

  it('una misión cuyo «Enséñale» no cambiaba nada no se toca', () => {
    // La espada de la roca enseña el Cocobur una vez: antes y ahora, 1.
    expect(shownItemsDecision([{ item: 2239, quantity: 1 }], raw(2035), catalog)).toEqual({
      status: 'current',
    })
  })

  it('el orden de las filas no importa', () => {
    const frasco = { id: 9001, dofusId: 20211, superTypeId: 9, name: 'Frasco de agua mágica' }
    const wide = new Map([...catalog, [20211, frasco]])
    expect(
      shownItemsDecision(
        [
          { item: 9001, quantity: 1 },
          { item: 2239, quantity: 2 },
        ],
        raw(2036),
        wide,
      ),
    ).toEqual({
      status: 'fix',
      from: [
        { item: 9001, quantity: 1 },
        { item: 2239, quantity: 2 },
      ],
      to: [
        { item: 2239, quantity: 1 },
        { item: 9001, quantity: 1 },
      ],
    })
  })
})
