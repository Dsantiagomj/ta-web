import { describe, expect, it, vi } from 'vitest'

import { checkHealth, resolveCommit } from '@/endpoints/health'

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
