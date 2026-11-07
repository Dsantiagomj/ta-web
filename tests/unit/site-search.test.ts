import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { GAME_ICONS } from '@/components/game/game-icons'
import { searchIndex } from '@/components/site/nav'
import {
  type GuidesState,
  QUEST_RESULTS_LIMIT,
  questEntries,
  searchSite,
  searchStatus,
} from '@/components/site/search'
import { searchDialogStrings } from '@/components/site/search-strings'
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
  const base = {
    query: 'pies',
    found: 3,
    questTotal: 3,
    questShown: 3,
    guides: 'ready' as GuidesState,
  }
  // La nota de carga o de error la pone la isla, que tiene esos textos (search-strings.ts).
  const status = (args: typeof base) =>
    searchStatus({
      ...args,
      note:
        args.guides === 'loading'
          ? searchDialogStrings.guidesLoading
          : args.guides === 'error'
            ? searchDialogStrings.guidesError
            : '',
    })

  it('sin texto no dice nada, salvo que las misiones estén cargando o no cargaran', () => {
    expect(status({ ...base, query: ' ' })).toBe('')
    expect(status({ ...base, query: '', guides: 'idle' })).toBe('')
    // Al abrir la búsqueda, antes de escribir, ya se ve que las misiones vienen en camino.
    expect(status({ ...base, query: '', guides: 'loading' })).toBe('Cargando las misiones…')
    expect(status({ ...base, query: '', guides: 'error' })).toBe(
      'No se pudieron cargar las misiones. Cierra la búsqueda y ábrela otra vez para reintentarlo.',
    )
  })

  it('cuenta los resultados', () => {
    expect(status(base)).toBe('3 resultados')
    expect(status({ ...base, found: 1, questTotal: 1 })).toBe('1 resultado')
  })

  it('avisa de que hay más misiones de las que se ven', () => {
    expect(status({ ...base, found: 40, questTotal: 37, questShown: QUEST_RESULTS_LIMIT })).toBe(
      `40 resultados. Se ven las ${QUEST_RESULTS_LIMIT} primeras misiones de 37: escribe más para afinar.`,
    )
  })

  it('mientras cargan las misiones, lo dice en vez de «nada se llama»', () => {
    expect(status({ ...base, found: 0, questTotal: 0, guides: 'loading' })).toBe(
      'Cargando las misiones…',
    )
    expect(status({ ...base, found: 2, questTotal: 0, guides: 'loading' })).toBe(
      '2 resultados. Cargando las misiones…',
    )
  })

  it('sin resultados sugiere escribir el nombre del juego', () => {
    expect(status({ ...base, found: 0, questTotal: 0 })).toBe(
      'Nada se llama «pies». Prueba con el nombre tal como sale en el juego.',
    )
  })

  it('si las misiones no cargaron, lo dice tras lo que encontró en el menú', () => {
    expect(status({ ...base, found: 1, questTotal: 0, guides: 'error' })).toBe(
      '1 resultado. No se pudieron cargar las misiones. Cierra la búsqueda y ábrela otra vez para reintentarlo.',
    )
  })
})

describe('el peso de la isla de la cabecera', () => {
  const read = (file: string) => readFileSync(`src/components/site/${file}`, 'utf8')
  const island = read('HeaderIsland.tsx')

  it('la búsqueda y sus resultados llegan con import() al abrir el diálogo', () => {
    expect(island).toMatch(/import\('\.\/SearchList'\)/)
    // Solo tipos: un import de valor los metería en el JavaScript inicial de cada página.
    expect(island).not.toMatch(/^import (?!type )[^\n]*from '\.\/(search|SearchList|StaticImg)'/m)
    expect(island).not.toMatch(/from '@\/(components\/game\/game-icons|lib\/search\/guide-index)'/)
  })

  it('la isla y lo que carga después no comparten módulos de textos ni de iconos', () => {
    // Un módulo que usan los dos chunks se descarga entero con la isla.
    expect(island).not.toMatch(/from '\.\/(strings|search-result-strings)'/)
    for (const file of ['search.ts', 'SearchList.tsx']) {
      expect(read(file), file).not.toMatch(/from '\.\/(strings|search-strings|icons)'/)
    }
  })
})
