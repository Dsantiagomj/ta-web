import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { checkLiveness, healthEndpoint, resolveCommit, resolveVersion } from '@/endpoints/health'

// Un payload cuya base revienta en cuanto alguien la toca: el pool, una consulta o
// cualquier otro miembro del adaptador.
function payloadWithForbiddenDb() {
  const touched: PropertyKey[] = []
  const db = new Proxy(
    {},
    {
      get(_target, key) {
        touched.push(key)
        throw new Error(`/api/health tocó payload.db.${String(key)}`)
      },
    },
  )
  return { payload: { db }, touched }
}

describe('checkLiveness', () => {
  it('responde 200 con la versión y el commit, sin decir nada de la base', async () => {
    const response = checkLiveness({ version: '1.2.3', commit: 'abc123' })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ok', version: '1.2.3', commit: 'abc123' })
  })
})

describe('healthEndpoint', () => {
  // La salvaguarda del corte del 2026-11-13: los monitores llaman a /api/health cada
  // pocos minutos, y si toca la base Neon nunca escala a cero y agota la cuota.
  it('nunca toca la base de datos', async () => {
    const { payload, touched } = payloadWithForbiddenDb()

    const response = await healthEndpoint.handler({ payload } as unknown as PayloadRequest)

    expect(touched).toEqual([])
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
  })

  it('se monta en GET /health', () => {
    expect(healthEndpoint.path).toBe('/health')
    expect(healthEndpoint.method).toBe('get')
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

describe('resolveVersion', () => {
  it('usa la versión del release que fija APP_VERSION', () => {
    expect(resolveVersion({ APP_VERSION: '0.2.0' }, '0.0.0')).toBe('0.2.0')
  })

  it('quita los espacios de APP_VERSION', () => {
    expect(resolveVersion({ APP_VERSION: ' 1.2.3-rc.1 ' }, '0.0.0')).toBe('1.2.3-rc.1')
  })

  it('sin APP_VERSION, o vacía, usa la versión de package.json', () => {
    expect(resolveVersion({}, '0.0.0')).toBe('0.0.0')
    expect(resolveVersion({ APP_VERSION: ' ' }, '0.0.0')).toBe('0.0.0')
  })
})
