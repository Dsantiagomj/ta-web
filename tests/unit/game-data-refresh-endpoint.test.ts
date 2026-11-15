import { describe, expect, it } from 'vitest'

import { gameDataRefreshResponse } from '@/endpoints/game-data-refresh'
import { refreshStatusLine } from '@/lib/game-data/refresh-status'
import type { GameDataRefresh } from '@/payload-types'

// POST /api/game-data/refresh: el botón «Traer ahora» del panel. Solo un administrador lo
// lanza; si ya hay uno en marcha, lo dice y no empieza otro.

const ADMIN = { id: 1, role: 'admin' }
const EDITOR = { id: 2, role: 'editor' }

function run(data: Partial<GameDataRefresh> = {}): GameDataRefresh {
  return {
    id: 7,
    startedAt: '2026-11-15T10:00:00.000Z',
    status: 'running',
    trigger: 'schedule',
    updatedAt: '2026-11-15T10:00:00.000Z',
    createdAt: '2026-11-15T10:00:00.000Z',
    ...data,
  }
}

const never = async () => {
  throw new Error('no debía empezar')
}

describe('gameDataRefreshResponse', () => {
  it('sin sesión, 401', async () => {
    const response = await gameDataRefreshResponse({ user: null, start: never })
    expect(response.status).toBe(401)
  })

  it('un editor no lo lanza: 403', async () => {
    const response = await gameDataRefreshResponse({ user: EDITOR, start: never })
    expect(response.status).toBe(403)
  })

  it('un administrador lo lanza con su cuenta y recibe 202 sin esperar a que acabe', async () => {
    const requested: number[] = []
    const response = await gameDataRefreshResponse({
      user: ADMIN,
      start: async (userId) => {
        requested.push(userId)
        return { status: 'started', run: run(), done: new Promise(() => {}) }
      },
    })

    expect(response.status).toBe(202)
    expect(requested).toEqual([1])
    expect(await response.json()).toEqual({ id: 7, startedAt: '2026-11-15T10:00:00.000Z' })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('con otro en marcha, 409 y desde cuándo', async () => {
    const response = await gameDataRefreshResponse({
      user: ADMIN,
      start: async () => ({ status: 'busy', running: run() }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ startedAt: '2026-11-15T10:00:00.000Z' })
  })
})

describe('refreshStatusLine', () => {
  const format = (iso: string) => `[${iso.slice(0, 10)}]`

  it('sin ninguno, lo dice', () => {
    expect(refreshStatusLine(null, format)).toBe(
      'Todavía no se ha traído nada desde el panel ni la tarea semanal.',
    )
  })

  it('el último: resultado, quién lo lanzó y cuándo', () => {
    expect(
      refreshStatusLine(
        run({ status: 'ok', trigger: 'panel', finishedAt: '2026-11-15T10:05:00.000Z' }),
        format,
      ),
    ).toBe('Último: Hecho · El botón del panel · empezó [2026-11-15], acabó [2026-11-15].')
  })

  it('uno en marcha no tiene fin todavía', () => {
    expect(refreshStatusLine(run(), format)).toBe(
      'Último: En marcha · La tarea semanal · empezó [2026-11-15].',
    )
  })
})
