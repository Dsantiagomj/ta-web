import { describe, expect, it } from 'vitest'

import { createDofusDbClient, type FetchLike } from '@/lib/dofusdb/client'

type Page = { total: number; data: unknown[] }

/** Un fetch falso que responde con las páginas dadas, en orden, y guarda cada llamada. */
function fakeFetch(pages: Page[]) {
  const calls: { url: string; headers: Headers }[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers) })
    const page = pages[calls.length - 1] ?? { total: 0, data: [] }
    return Response.json({ limit: 50, skip: 0, ...page })
  }
  return { fetch, calls }
}

const noSleep = async () => {}

function rows(from: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: from + index }))
}

describe('cliente de DofusDB', () => {
  describe('fetchAll', () => {
    it('pide páginas de 50 hasta llegar al total', async () => {
      const { fetch, calls } = fakeFetch([
        { total: 120, data: rows(0, 50) },
        { total: 120, data: rows(50, 50) },
        { total: 120, data: rows(100, 20) },
      ])
      const sleeps: number[] = []
      const client = createDofusDbClient({
        fetch,
        sleep: async (ms) => {
          sleeps.push(ms)
        },
      })

      const all = await client.fetchAll('quests')

      expect(all).toHaveLength(120)
      expect(calls.map((call) => call.url)).toEqual([
        'https://api.dofusdb.fr/quests?$limit=50&$skip=0',
        'https://api.dofusdb.fr/quests?$limit=50&$skip=50',
        'https://api.dofusdb.fr/quests?$limit=50&$skip=100',
      ])
      // Una pausa entre páginas, ninguna después de la última.
      expect(sleeps).toEqual([50, 50])
    })

    it('para si una página llega vacía antes del total', async () => {
      const { fetch, calls } = fakeFetch([
        { total: 500, data: rows(0, 50) },
        { total: 500, data: [] },
      ])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      expect(await client.fetchAll('quests')).toHaveLength(50)
      expect(calls).toHaveLength(2)
    })

    it('pide solo los campos de select, si los hay', async () => {
      const { fetch, calls } = fakeFetch([{ total: 1, data: rows(0, 1) }])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      await client.fetchAll('items', { select: ['id', 'name'] })

      expect(calls.map((call) => call.url)).toEqual([
        'https://api.dofusdb.fr/items?$limit=50&$skip=0&$select[]=id&$select[]=name',
      ])
    })

    it('se identifica con un User-Agent genérico', async () => {
      const { fetch, calls } = fakeFetch([{ total: 0, data: [] }])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      await client.fetchAll('quests')

      expect(calls[0].headers.get('user-agent')).toBe('ta-web/datos-del-juego')
    })
  })

  describe('fetchByIds', () => {
    it('pide los IDs sin repetir, en grupos de 40', async () => {
      const ids = [...rows(1, 90).map((row) => row.id), 1, 2]
      const { fetch, calls } = fakeFetch([
        { total: 40, data: rows(1, 40) },
        { total: 40, data: rows(41, 40) },
        { total: 10, data: rows(81, 10) },
      ])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      const found = await client.fetchByIds('npcs', ids)

      expect(found).toHaveLength(90)
      expect(calls).toHaveLength(3)
      const idsPerCall = calls.map((call) => new URL(call.url).searchParams.getAll('id[$in][]'))
      expect(idsPerCall.map((chunk) => chunk.length)).toEqual([40, 40, 10])
      expect(idsPerCall.flat().map(Number)).toEqual(rows(1, 90).map((row) => row.id))
      expect(calls[0].url).toMatch(
        /^https:\/\/api\.dofusdb\.fr\/npcs\?\$limit=50&id\[\$in\]\[\]=1&/,
      )
    })

    it('no pide nada sin IDs', async () => {
      const { fetch, calls } = fakeFetch([])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      expect(await client.fetchByIds('npcs', [])).toEqual([])
      expect(calls).toHaveLength(0)
    })
  })

  it('falla con un error claro si DofusDB no responde 2xx', async () => {
    const fetch: FetchLike = async () =>
      new Response('{"message":"Page not found"}', { status: 404, statusText: 'Not Found' })
    const client = createDofusDbClient({ fetch, sleep: noSleep })

    await expect(client.fetchAll('quests')).rejects.toThrow(
      'DofusDB respondió 404 Not Found en https://api.dofusdb.fr/quests?$limit=50&$skip=0',
    )
    await expect(client.fetchByIds('npcs', [1])).rejects.toThrow('DofusDB respondió 404')
  })
})
