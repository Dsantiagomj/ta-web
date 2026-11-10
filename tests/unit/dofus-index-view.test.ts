import { describe, expect, it } from 'vitest'

import { dofusIndexView, matchesDofus } from '@/lib/dofus-guides/index-view'
import type { DofusListDoc } from '@/lib/dofus-guides/page'

// El índice /guias-dofus: una tarjeta por Dofus, en el orden de Torre, con lo que dice la
// colección. Ninguna cifra en los títulos: hoy son 30 y mañana más.

const doc = (overrides: Partial<DofusListDoc>): DofusListDoc => ({
  id: 1,
  name: 'Dofus Abisal',
  slug: 'dofus-abisal',
  state: 'published',
  level: 180,
  achievements: 7,
  quests: 40,
  ...overrides,
})

describe('dofusIndexView', () => {
  const view = dofusIndexView([
    doc({
      id: 2,
      name: 'Dofus Esmeralda',
      slug: 'dofus-esmeralda',
      tag: 'primordial',
      color: '#2ecd68',
    }),
    doc({ id: 3, name: 'Jyfus', slug: 'jyfus', state: 'preparing', tag: 'event', level: 20 }),
    doc({
      id: 4,
      name: 'Dofus Zanahowia',
      slug: 'dofus-zanahowia',
      aliases: 'zanahoria',
      achievements: 3,
      quests: 11,
    }),
  ])

  it('cada tarjeta enlaza su guía con sus cifras; una En preparación no enlaza', () => {
    expect(view.cards.map((card) => [card.name, card.href, card.disabled, card.meta])).toEqual([
      ['Dofus Esmeralda', '/dofus-esmeralda', false, '7 logros - 40 misiones - Nivel 180'],
      ['Jyfus', undefined, true, 'Nivel 20'],
      ['Dofus Zanahowia', '/dofus-zanahowia', false, '3 logros - 11 misiones - Nivel 180'],
    ])
  })

  it('lleva la etiqueta y el color de cada Dofus', () => {
    expect(view.cards[0]).toMatchObject({
      tag: 'primordial',
      tagLabel: 'Primordial',
      color: '#2ecd68',
    })
    expect(view.cards[1]).toMatchObject({ tag: 'event', tagLabel: 'Evento' })
    expect(view.cards[2]!.tag).toBeUndefined()
  })

  it('los filtros solo salen si hay Dofus con esa etiqueta', () => {
    expect(view.filters).toEqual(['all', 'primordial', 'event'])
    expect(dofusIndexView([doc({})]).filters).toEqual([])
  })
})

describe('matchesDofus', () => {
  const card = { search: 'dofus zanahowia zanahoria', tag: undefined }

  it('busca sin tildes ni mayúsculas, cada palabra en cualquier orden, también en otros nombres', () => {
    expect(matchesDofus(card, 'ZANAHORIA', 'all')).toBe(true)
    expect(matchesDofus(card, 'zanahowia dofus', 'all')).toBe(true)
    expect(matchesDofus(card, 'ébano', 'all')).toBe(false)
  })

  it('el filtro deja solo los de su etiqueta', () => {
    expect(matchesDofus({ search: 'dofus ocre', tag: 'primordial' }, '', 'primordial')).toBe(true)
    expect(matchesDofus(card, '', 'primordial')).toBe(false)
    expect(matchesDofus(card, '', 'all')).toBe(true)
  })
})
