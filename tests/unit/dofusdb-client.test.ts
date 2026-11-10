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

  describe('fetchWhere', () => {
    it('pide la primera página de las filas que cumplen la consulta, con los valores codificados', async () => {
      const { fetch, calls } = fakeFetch([{ total: 1, data: [{ id: 7298 }] }])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      const found = await client.fetchWhere('items', { 'name.es': 'Piel de rojiva' })

      expect(found).toEqual([{ id: 7298 }])
      expect(calls.map((call) => call.url)).toEqual([
        'https://api.dofusdb.fr/items?$limit=50&name.es=Piel%20de%20rojiva',
      ])
    })

    it('admite la búsqueda sin mayúsculas de Feathers y la selección de campos', async () => {
      const { fetch, calls } = fakeFetch([{ total: 0, data: [] }])
      const client = createDofusDbClient({ fetch, sleep: noSleep })

      await client.fetchWhere(
        'items',
        { 'name.es[$regex]': '^Piel \\(x\\)$', 'name.es[$options]': 'i' },
        { select: ['id', 'name'] },
      )

      expect(calls[0]!.url).toBe(
        'https://api.dofusdb.fr/items?$limit=50&name.es[$regex]=%5EPiel%20%5C(x%5C)%24' +
          '&name.es[$options]=i&$select[]=id&$select[]=name',
      )
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

  describe('reintentos', () => {
    const page = { total: 1, data: rows(0, 1) }
    const url = 'https://api.dofusdb.fr/quests?$limit=50&$skip=0'

    /** Un fetch que sigue el guion: un error lanza, un número responde ese estado. */
    function scriptedFetch(script: (Error | number | Response)[]) {
      const calls: string[] = []
      const fetch: FetchLike = async (requested) => {
        calls.push(String(requested))
        const step = script[calls.length - 1] ?? 200
        if (step instanceof Error) throw step
        if (step instanceof Response) return step
        if (step === 200) return Response.json({ limit: 50, skip: 0, ...page })
        return new Response('{}', { status: step, statusText: `Estado ${step}` })
      }
      return { fetch, calls }
    }

    function retryingClient(fetch: FetchLike) {
      const sleeps: number[] = []
      const logs: string[] = []
      const client = createDofusDbClient({
        fetch,
        sleep: async (ms) => {
          sleeps.push(ms)
        },
        log: (message) => logs.push(message),
        random: () => 0,
      })
      return { client, sleeps, logs }
    }

    it('reintenta los fallos de red y los 502, 503 y 504 con esperas que se doblan', async () => {
      const { fetch, calls } = scriptedFetch([
        new TypeError('fetch failed', { cause: new Error('read ECONNRESET') }),
        502,
        503,
        504,
        200,
      ])
      const { client, sleeps, logs } = retryingClient(fetch)

      expect(await client.fetchAll('quests')).toHaveLength(1)
      expect(calls).toEqual([url, url, url, url, url])
      expect(sleeps).toEqual([500, 1000, 2000, 4000])
      expect(logs).toHaveLength(4)
      expect(logs[0]).toContain('reintento 1 de 4')
      expect(logs[0]).toContain(url)
    })

    it('añade a la espera un poco de azar', async () => {
      const { fetch } = scriptedFetch([503, 200])
      const sleeps: number[] = []
      const client = createDofusDbClient({
        fetch,
        sleep: async (ms) => {
          sleeps.push(ms)
        },
        random: () => 0.5,
      })

      await client.fetchAll('quests')

      expect(sleeps[0]).toBeGreaterThan(500)
      expect(sleeps[0]).toBeLessThan(750)
    })

    it('se rinde tras 4 reintentos con la URL y los intentos en el error', async () => {
      const { fetch, calls } = scriptedFetch([503, 503, 503, 503, 503, 200])
      const { client } = retryingClient(fetch)

      await expect(client.fetchAll('quests')).rejects.toThrow(
        `DofusDB respondió 503 Estado 503 en ${url} tras 5 intentos`,
      )
      expect(calls).toHaveLength(5)
    })

    it('se rinde también si la red sigue fallando', async () => {
      const { fetch } = scriptedFetch(
        Array.from({ length: 5 }, () => new TypeError('fetch failed')),
      )
      const { client } = retryingClient(fetch)

      await expect(client.fetchAll('quests')).rejects.toThrow(
        `DofusDB no respondió en ${url} tras 5 intentos: fetch failed`,
      )
    })

    it('no reintenta un 404 ni otro 4xx que no sea 429', async () => {
      for (const status of [400, 404]) {
        const { fetch, calls } = scriptedFetch([status, 200])
        const { client, sleeps } = retryingClient(fetch)

        await expect(client.fetchAll('quests')).rejects.toThrow(`DofusDB respondió ${status}`)
        expect(calls).toHaveLength(1)
        expect(sleeps).toEqual([])
      }
    })

    it('respeta el Retry-After de un 429', async () => {
      const { fetch } = scriptedFetch([
        new Response('{}', { status: 429, headers: { 'Retry-After': '7' } }),
        200,
      ])
      const { client, sleeps } = retryingClient(fetch)

      expect(await client.fetchAll('quests')).toHaveLength(1)
      expect(sleeps).toEqual([7000])
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
