import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GAME_ICONS } from '@/components/game/game-icons'
import { searchIndex } from '@/components/site/nav'
import {
  type GuidesState,
  heroResults,
  highlight,
  loadEntries,
  MANY_QUESTS,
  resetEntries,
  searchSite,
  searchStatus,
  SHOWN_WHEN_MANY,
  siteEntries,
  words,
} from '@/components/site/search'
import { queryKind } from '@/components/site/search-query'
import { searchDialogStrings } from '@/components/site/search-strings'
import type { SearchIndex } from '@/lib/search/guide-index'

// Los Dofus llegan de la colección de guías de Dofus (loadDofusNav).
const index = searchIndex([
  { name: 'Dofus Ébano', href: '/dofus-ebano', image: { src: '/media/ebano.webp', size: 128 } },
  { name: 'Dokoko', href: '/dokoko', image: { src: '/media/dokoko.webp', size: 128 } },
])

const quests = (...titles: string[]) =>
  siteEntries({
    guides: titles.map((title, i) => [title, `mision-${i}`, null, null]),
  })
const questEntries = (index: SearchIndex) => siteEntries(index).quests

const NOTHING = {
  groups: [],
  totals: { mision: 0, logro: 0, metalogro: 0 },
  navCount: 0,
}

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
    const index: SearchIndex = {
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
    expect(() => questEntries({} as SearchIndex)).toThrow()
    expect(() => questEntries({ guides: [['solo título']] } as unknown as SearchIndex)).toThrow()
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

  it('la puntuación del principio no cuenta: «¡La cosa…» empieza por «la»', () => {
    const results = searchSite(
      index,
      quests('¡Kapla!', '¡Cuidado con la bestia!', '¡La cosa está que arde!', '¿La prueba?'),
      'la',
    )
    expect(names(results)).toEqual([
      '¿La prueba?',
      '¡La cosa está que arde!',
      '¡Cuidado con la bestia!',
      '¡Kapla!',
    ])
  })

  it('a igualdad, la más corta y luego por orden alfabético', () => {
    const results = searchSite(index, quests('Prueba zeta', 'Prueba alfa', 'Prueba'), 'prueba')
    expect(names(results)).toEqual(['Prueba', 'Prueba alfa', 'Prueba zeta'])
  })

  it(`hasta ${MANY_QUESTS} misiones se ven todas`, () => {
    const many = quests(...Array.from({ length: MANY_QUESTS }, (_, i) => `Prueba ${i + 1}`))
    const results = searchSite(index, many, 'prueba')
    expect(names(results)).toHaveLength(MANY_QUESTS)
    expect(results.totals.mision).toBe(MANY_QUESTS)
  })

  it(`con más de ${MANY_QUESTS}, se ven las ${SHOWN_WHEN_MANY} mejores`, () => {
    const many = quests(...Array.from({ length: MANY_QUESTS + 1 }, (_, i) => `Prueba ${i + 1}`))
    const results = searchSite(index, many, 'prueba')
    expect(names(results)).toHaveLength(SHOWN_WHEN_MANY)
    expect(results.totals.mision).toBe(MANY_QUESTS + 1)
  })

  it('con una sola letra no busca: pide otra', () => {
    expect(queryKind('s')).toBe('hint')
    expect(queryKind(' é ')).toBe('hint')
    expect(queryKind('s e')).toBe('search')
    expect(queryKind('se')).toBe('search')
    expect(queryKind('  ')).toBe('empty')
    expect(searchSite(index, quests('Seis pies'), 's')).toEqual(NOTHING)
  })

  it('las misiones van primero si encajan tan bien como lo demás', () => {
    const results = searchSite(index, quests('Dofus Ébano y sus secretos'), 'dofus ebano')
    expect(results.groups.map((g) => g.type)).toEqual(['mision', 'dofus'])
    expect(results.navCount).toBe(1)
  })

  it('lo que encaja mejor va antes, sea misión o no', () => {
    const results = searchSite(index, quests('El huevo de Dokoko'), 'dokoko')
    expect(results.groups.map((g) => g.type)).toEqual(['dofus', 'mision'])
  })

  it('sin misiones cargadas, busca en el menú como siempre', () => {
    const results = searchSite(index, undefined, 'ebano')
    expect(results.groups.map((g) => g.type)).toEqual(['dofus'])
    expect(results.navCount).toBe(1)
  })

  it('sin texto no devuelve nada', () => {
    expect(searchSite(index, quests('Algo'), '  ')).toEqual(NOTHING)
  })
})

describe('los logros y los metalogros', () => {
  const found = siteEntries({
    guides: [
      ['Todos para uno', 'todos-para-uno', 'Todos para uno y uno se lo queda todo', 160],
      ['Hablar de ocre y de ámbar', 'ocre-hablar', null, 40],
    ],
    achievements: [
      ['Ocre de ámbar', 'ocre-de-ambar', 'Misiones de Mundo', 8],
      ['Todos para uno y uno se lo queda todo', 'todos-para-uno-y-uno', 'Isla de Frigost', 1],
    ],
    metalogros: [['Astrub', 'astrub', '7 logros · 32 misiones']],
  })

  it('un logro enlaza a su página y dice su metalogro y sus misiones', () => {
    expect(found.achievements[0]).toMatchObject({
      type: 'logro',
      name: 'Ocre de ámbar',
      href: '/ocre-de-ambar',
      detail: 'Misiones de Mundo · 8 misiones',
      image: GAME_ICONS.achievement,
    })
    expect(found.achievements[1].detail).toBe('Isla de Frigost · 1 misión')
  })

  it('un metalogro enlaza a su panel del índice', () => {
    expect(found.metalogros[0]).toMatchObject({
      type: 'metalogro',
      name: 'Astrub',
      href: '/metalogros#astrub',
      detail: '7 logros · 32 misiones',
    })
  })

  it('un índice sin logros ni metalogros sigue valiendo', () => {
    expect(siteEntries({ guides: [] })).toEqual({ quests: [], achievements: [], metalogros: [] })
  })

  it('rechaza un logro o un metalogro que no es una fila', () => {
    expect(() =>
      siteEntries({ guides: [], achievements: [['solo']] } as unknown as SearchIndex),
    ).toThrow()
    expect(() =>
      siteEntries({ guides: [], metalogros: [[1, 2, 3]] } as unknown as SearchIndex),
    ).toThrow()
  })

  it('cada uno en su grupo; lo que empieza igual va antes', () => {
    const results = searchSite(index, found, 'ocre de ambar')
    expect(results.groups.map((g) => g.type)).toEqual(['logro', 'mision'])
    expect(names(results, 'logro')).toEqual(['Ocre de ámbar'])
    expect(results.totals).toEqual({ mision: 1, logro: 1, metalogro: 0 })
  })

  it('a igualdad, misiones, luego logros, luego metalogros y luego el menú', () => {
    const results = searchSite(index, found, 'todos para uno')
    expect(results.groups.map((g) => g.type)).toEqual(['mision', 'logro'])
    const astrub = searchSite(
      index,
      siteEntries({
        guides: [['Astrub', 'astrub-guia', null, null]],
        achievements: [['Astrub', 'astrub-logro', 'Astrub', 3]],
        metalogros: [['Astrub', 'astrub', '']],
      }),
      'astrub',
    )
    expect(astrub.groups.map((g) => g.type)).toEqual(['mision', 'logro', 'metalogro'])
  })

  it('la portada busca lo mismo sin el menú, y una lista plana para el teclado', () => {
    const hero = heroResults(found, 'ocre')
    expect(hero.groups.map((g) => g.type)).toEqual(['logro', 'mision'])
    expect(hero.items.map((e) => e.name)).toEqual(['Ocre de ámbar', 'Hablar de ocre y de ámbar'])
    expect(hero.status).toBe('1 misión · 1 logro')
    expect(heroResults(found, 'zzzz').status).toBe(
      'Ninguna misión se llama «zzzz». Prueba con otra palabra.',
    )
  })
})

describe('el resaltado de lo que encaja', () => {
  const marked = (name: string, query: string) =>
    highlight(name, words(query))
      .filter((part) => part.mark)
      .map((part) => part.text)

  it('marca cada aparición de cada palabra, sin tildes ni mayúsculas', () => {
    expect(marked('Misión de la misión', 'mision')).toEqual(['Misión', 'misión'])
    expect(marked('Seis pies bajo tierra', 'tierra seis')).toEqual(['Seis', 'tierra'])
  })

  it('devuelve el nombre entero, en trozos, con el texto original', () => {
    const parts = highlight('¡La cosa está que arde!', words('esta'))
    expect(parts.map((p) => p.text).join('')).toBe('¡La cosa está que arde!')
    expect(parts).toContainEqual({ text: 'está', mark: true })
  })

  it('sin palabras no marca nada', () => {
    expect(highlight('Algo', [])).toEqual([{ text: 'Algo', mark: false }])
  })
})

describe('el índice compartido', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetEntries()
  })

  const ok = () =>
    new Response(JSON.stringify({ guides: [['Seis pies', 'seis-pies', null, 20]] }), {
      status: 200,
    })

  it('lo pide una vez aunque lo pidan la portada y el diálogo', async () => {
    const fetch = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetch)
    const [a, b] = await Promise.all([loadEntries(), loadEntries()])
    expect(a).toBe(b)
    await loadEntries()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('si falla, la siguiente vez lo pide de nuevo', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetch)
    await expect(loadEntries()).rejects.toThrow()
    fetch.mockImplementation(async () => ok())
    await expect(loadEntries()).resolves.toMatchObject({ quests: [{ name: 'Seis pies' }] })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('la línea de estado de la búsqueda', () => {
  const notes = searchDialogStrings
  const status = ({
    query = 'pies',
    guides = 'ready',
    questTotal = 3,
    logros = 0,
    metalogros = 0,
    navCount = 0,
  }: {
    query?: string
    guides?: GuidesState
    questTotal?: number
    logros?: number
    metalogros?: number
    navCount?: number
  }) =>
    searchStatus({
      query,
      guides,
      results: {
        groups: [],
        totals: { mision: questTotal, logro: logros, metalogro: metalogros },
        navCount,
      },
      notes,
    })

  it('sin texto no dice nada, salvo que las misiones estén cargando o no cargaran', () => {
    expect(status({ query: ' ' })).toBe('')
    expect(status({ query: '', guides: 'idle' })).toBe('')
    // Al abrir la búsqueda, antes de escribir, ya se ve que las misiones vienen en camino.
    expect(status({ query: '', guides: 'loading' })).toBe('Cargando las misiones…')
    expect(status({ query: '', guides: 'error' })).toBe(
      'No se pudieron cargar las misiones. Vuelve a intentarlo.',
    )
  })

  it('con una letra pide otra', () => {
    expect(status({ query: 's' })).toBe('Escribe una letra más para buscar.')
  })

  it('cuenta las misiones', () => {
    expect(status({})).toBe('3 misiones')
    expect(status({ questTotal: 1 })).toBe('1 misión')
    expect(status({ questTotal: MANY_QUESTS })).toBe(`${MANY_QUESTS} misiones`)
  })

  it('con más de 50 pide que siga escribiendo', () => {
    expect(status({ questTotal: MANY_QUESTS + 1 })).toBe('Más de 50 misiones: sigue escribiendo')
  })

  it('suma lo que encontró en el menú', () => {
    expect(status({ navCount: 1 })).toBe('3 misiones · 1 resultado del menú')
    expect(status({ questTotal: 1, navCount: 2 })).toBe('1 misión · 2 resultados del menú')
  })

  it('sin misiones dice cuál buscó, o lo que hay en el menú', () => {
    expect(status({ questTotal: 0 })).toBe(
      'Ninguna misión se llama «pies». Prueba con otra palabra.',
    )
    expect(status({ questTotal: 0, navCount: 2 })).toBe('Ninguna misión; 2 resultados del menú.')
  })

  it('suma los logros y los metalogros, con o sin misiones', () => {
    expect(status({ logros: 2, metalogros: 1 })).toBe('3 misiones · 2 logros · 1 metalogro')
    expect(status({ questTotal: 0, logros: 1 })).toBe('1 logro')
    expect(status({ questTotal: 0, metalogros: 2, navCount: 1 })).toBe(
      '2 metalogros · 1 resultado del menú',
    )
  })

  it('con más de 50 logros o metalogros también pide que siga escribiendo', () => {
    expect(status({ questTotal: 0, logros: MANY_QUESTS + 1 })).toBe(
      'Más de 50 logros: sigue escribiendo',
    )
    expect(status({ questTotal: 2, metalogros: MANY_QUESTS + 1, navCount: 1 })).toBe(
      '2 misiones · más de 50 metalogros: sigue escribiendo · 1 resultado del menú',
    )
    expect(status({ questTotal: MANY_QUESTS + 1, navCount: 1 })).toBe(
      'Más de 50 misiones: sigue escribiendo · 1 resultado del menú',
    )
  })

  it('mientras cargan las misiones lo dice, y si fallaron también', () => {
    expect(status({ questTotal: 0, guides: 'loading' })).toBe('Cargando las misiones…')
    expect(status({ questTotal: 0, guides: 'idle' })).toBe('Cargando las misiones…')
    expect(status({ questTotal: 0, navCount: 1, guides: 'error' })).toBe(
      'No se pudieron cargar las misiones. Vuelve a intentarlo.',
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
