import { describe, expect, it } from 'vitest'

import { GAME_ICONS } from '@/components/game/game-icons'
import { searchIndex } from '@/components/site/nav'
import {
  QUEST_RESULTS_LIMIT,
  questEntries,
  searchSite,
  searchStatus,
} from '@/components/site/search'
import type { GuideSearchIndex } from '@/lib/search/guide-index'

const index = searchIndex()

const quests = (...titles: string[]) =>
  questEntries({
    guides: titles.map((title, i) => [title, `mision-${i}`, null, null]),
  })

const names = (results: ReturnType<typeof searchSite>, type = 'mision') =>
  results.groups.find((g) => g.type === type)?.items.map((i) => i.name) ?? []

describe('el índice de las guías de misiones', () => {
  it('cada guía enlaza a su página, con el icono de misión', () => {
    const [entry] = questEntries({ guides: [['Seis pies bajo tierra', 'seis-pies', null, null]] })
    expect(entry).toMatchObject({
      type: 'mision',
      name: 'Seis pies bajo tierra',
      href: '/seis-pies',
      image: GAME_ICONS.quest,
    })
    expect(entry.detail).toBeUndefined()
  })

  it('la segunda línea lleva el nivel y el logro, lo que haya', () => {
    const index: GuideSearchIndex = {
      guides: [
        ['A', 'a', 'La ocasión hace al ladrón', 20],
        ['B', 'b', null, 35],
        ['C', 'c', 'Astrub', null],
      ],
    }
    expect(questEntries(index).map((e) => e.detail)).toEqual([
      'Nivel 20 · La ocasión hace al ladrón',
      'Nivel 35',
      'Astrub',
    ])
  })

  it('rechaza una respuesta que no es el índice', () => {
    expect(() => questEntries({} as GuideSearchIndex)).toThrow()
    expect(() =>
      questEntries({ guides: [['solo título']] } as unknown as GuideSearchIndex),
    ).toThrow()
  })
})

describe('la búsqueda de la cabecera', () => {
  it('encuentra misiones sin tildes ni mayúsculas', () => {
    const results = searchSite(index, quests('El señor de los Ébanos', 'Otra'), 'SENOR ebano')
    expect(names(results)).toEqual(['El señor de los Ébanos'])
  })

  it('pide todas las palabras, en cualquier orden', () => {
    const results = searchSite(
      index,
      quests('Seis pies bajo tierra', 'Seis caminos'),
      'tierra seis',
    )
    expect(names(results)).toEqual(['Seis pies bajo tierra'])
  })

  it('primero lo que empieza igual, luego el inicio de una palabra y al final el resto', () => {
    const results = searchSite(
      index,
      quests('Los bandidos del bosque', 'Contrabandidos', 'Bandidos', 'Bandidos y piratas'),
      'bandidos',
    )
    expect(names(results)).toEqual([
      'Bandidos',
      'Bandidos y piratas',
      'Los bandidos del bosque',
      'Contrabandidos',
    ])
  })

  it(`enseña como mucho ${QUEST_RESULTS_LIMIT} misiones y cuenta todas`, () => {
    const many = quests(...Array.from({ length: 15 }, (_, i) => `Prueba ${i + 1}`))
    const results = searchSite(index, many, 'prueba')
    expect(names(results)).toHaveLength(QUEST_RESULTS_LIMIT)
    expect(results.questTotal).toBe(15)
    expect(results.found).toBe(15)
  })

  it('las misiones van primero si encajan tan bien como lo demás', () => {
    const results = searchSite(index, quests('Dofus Ébano y sus secretos'), 'dofus ebano')
    expect(results.groups.map((g) => g.type)).toEqual(['mision', 'dofus'])
  })

  it('lo que encaja mejor va antes, sea misión o no', () => {
    const results = searchSite(index, quests('El amigo de Zurcarák'), 'zurcarak')
    expect(results.groups.map((g) => g.type)).toEqual(['clase', 'mision'])
  })

  it('sin misiones cargadas, busca en el menú como siempre', () => {
    const results = searchSite(index, [], 'ebano')
    expect(results.groups.map((g) => g.type)).toEqual(['dofus'])
    expect(results.found).toBe(1)
  })

  it('sin texto no devuelve nada', () => {
    expect(searchSite(index, quests('Algo'), '  ')).toEqual({ groups: [], found: 0, questTotal: 0 })
  })
})

describe('la línea de estado de la búsqueda', () => {
  const base = { query: 'pies', found: 3, questTotal: 3, guides: 'ready' as const }

  it('sin texto no dice nada, salvo que las misiones no cargaran', () => {
    expect(searchStatus({ ...base, query: ' ' })).toBe('')
    expect(searchStatus({ ...base, query: '', guides: 'error' })).toBe(
      'No se pudieron cargar las misiones. Cierra la búsqueda y ábrela otra vez para reintentarlo.',
    )
  })

  it('cuenta los resultados', () => {
    expect(searchStatus(base)).toBe('3 resultados')
    expect(searchStatus({ ...base, found: 1, questTotal: 1 })).toBe('1 resultado')
  })

  it('avisa de que hay más misiones de las que se ven', () => {
    expect(searchStatus({ ...base, found: 40, questTotal: 37 })).toBe(
      `40 resultados. Se ven las ${QUEST_RESULTS_LIMIT} primeras misiones de 37: escribe más para afinar.`,
    )
  })

  it('mientras cargan las misiones, lo dice en vez de «nada se llama»', () => {
    expect(searchStatus({ ...base, found: 0, questTotal: 0, guides: 'loading' })).toBe(
      'Cargando las misiones…',
    )
    expect(searchStatus({ ...base, found: 2, questTotal: 0, guides: 'loading' })).toBe(
      '2 resultados. Cargando las misiones…',
    )
  })

  it('sin resultados sugiere escribir el nombre del juego', () => {
    expect(searchStatus({ ...base, found: 0, questTotal: 0 })).toBe(
      'Nada se llama «pies». Prueba con el nombre tal como sale en el juego.',
    )
  })

  it('si las misiones no cargaron, lo dice tras lo que encontró en el menú', () => {
    expect(searchStatus({ ...base, found: 1, questTotal: 0, guides: 'error' })).toBe(
      '1 resultado. No se pudieron cargar las misiones. Cierra la búsqueda y ábrela otra vez para reintentarlo.',
    )
  })
})
