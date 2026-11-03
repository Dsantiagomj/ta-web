import { describe, expect, it, vi } from 'vitest'

import { checkHealth, pingPool, resolveCommit } from '@/endpoints/health'

const info = { version: '1.2.3', commit: 'abc123' }

describe('checkHealth', () => {
  it('responde 200 con la versión y el commit si la base contesta', async () => {
    const pingDatabase = vi.fn().mockResolvedValue(undefined)

    const response = await checkHealth({ ...info, pingDatabase })

    expect(pingDatabase).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      status: 'ok',
      db: 'ok',
      version: '1.2.3',
      commit: 'abc123',
    })
  })

  it('responde 503 sin detalles del error si la base falla', async () => {
    const pingDatabase = vi
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED postgres://usuario:clave@db:5432'))

    const response = await checkHealth({ ...info, pingDatabase })

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ status: 'error', db: 'error' })
    expect(body).not.toMatch(/ECONNREFUSED|clave/)
  })

  it('responde 503 si la base no contesta antes del tiempo límite', async () => {
    vi.useFakeTimers()
    try {
      const pingDatabase = () => new Promise<void>(() => {})

      const pending = checkHealth({ ...info, pingDatabase, timeoutMs: 2000 })
      await vi.advanceTimersByTimeAsync(2000)
      const response = await pending

      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ status: 'error', db: 'error' })
    } finally {
      vi.useRealTimers()
    }
  })
  it('comparte una sola comprobación entre peticiones simultáneas', async () => {
    let finish: () => void = () => {}
    const pingDatabase = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))

    const both = Promise.all([
      checkHealth({ ...info, pingDatabase }),
      checkHealth({ ...info, pingDatabase }),
    ])
    finish()
    const [a, b] = await both

    expect(pingDatabase).toHaveBeenCalledOnce()
    expect(a).not.toBe(b)
    for (const response of [a, b]) {
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ status: 'ok', db: 'ok' })
    }
  })
})

function fakeClient(query: (text: string) => Promise<unknown>) {
  return { query: vi.fn(query), release: vi.fn((_destroy?: boolean) => {}) }
}
type FakeClient = ReturnType<typeof fakeClient>

describe('pingPool', () => {
  it('limita la consulta en el servidor y devuelve la conexión al pool', async () => {
    const client = fakeClient(async () => ({}))
    const pool = { connect: vi.fn(async () => client) }

    await pingPool(pool, 2000)

    expect(client.query.mock.calls.map(([text]) => text)).toEqual([
      'begin',
      "set local statement_timeout = '2000ms'",
      'select 1',
      'commit',
    ])
    expect(client.release).toHaveBeenCalledWith()
  })

  it('descarta la conexión si la consulta pasa del tiempo límite', async () => {
    vi.useFakeTimers()
    try {
      const client = fakeClient((text) =>
        text === 'select 1' ? new Promise(() => {}) : Promise.resolve({}),
      )
      const pool = { connect: vi.fn(async () => client) }

      const pending = pingPool(pool, 2000)
      const outcome = expect(pending).rejects.toThrow('timeout')
      await vi.advanceTimersByTimeAsync(2000)
      await outcome

      expect(client.release).toHaveBeenCalledWith(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('devuelve al pool una conexión que llega después del tiempo límite', async () => {
    vi.useFakeTimers()
    try {
      const client = fakeClient(async () => ({}))
      let deliver: (c: FakeClient) => void = () => {}
      const pool = {
        connect: vi.fn(() => new Promise<FakeClient>((resolve) => (deliver = resolve))),
      }

      const pending = pingPool(pool, 2000)
      const outcome = expect(pending).rejects.toThrow('timeout')
      await vi.advanceTimersByTimeAsync(2000)
      await outcome
      deliver(client)
      await vi.advanceTimersByTimeAsync(0)

      expect(client.query).not.toHaveBeenCalled()
      expect(client.release).toHaveBeenCalledWith(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('resolveCommit', () => {
  it('prefiere el commit que inyecta Railway', () => {
    expect(resolveCommit({ RAILWAY_GIT_COMMIT_SHA: 'railway', GIT_COMMIT_SHA: 'git' })).toBe(
      'railway',
    )
  })

  it('usa GIT_COMMIT_SHA fuera de Railway', () => {
    expect(resolveCommit({ GIT_COMMIT_SHA: 'git' })).toBe('git')
  })

  it('devuelve dev sin ninguna de las dos, o si están vacías', () => {
    expect(resolveCommit({})).toBe('dev')
    expect(resolveCommit({ RAILWAY_GIT_COMMIT_SHA: ' ', GIT_COMMIT_SHA: '' })).toBe('dev')
  })
})
