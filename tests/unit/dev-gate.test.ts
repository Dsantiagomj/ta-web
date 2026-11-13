import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as devGate from '@/lib/dev-gate/dev-gate'
import { NOINDEX_HEADER, isDevEnvironment } from '@/lib/dev-gate/dev-gate'
import { proxy } from '@/proxy'

describe('isDevEnvironment', () => {
  it('reconoce APP_ENV=dev', () => {
    expect(isDevEnvironment({ APP_ENV: 'dev' })).toBe(true)
  })

  it('reconoce también el entorno dev de Railway', () => {
    expect(isDevEnvironment({ RAILWAY_ENVIRONMENT_NAME: 'dev' })).toBe(true)
  })

  it('tolera espacios y mayúsculas', () => {
    expect(isDevEnvironment({ APP_ENV: ' Dev ' })).toBe(true)
  })

  it('producción, local y CI no son dev', () => {
    expect(isDevEnvironment({})).toBe(false)
    expect(isDevEnvironment({ APP_ENV: 'production' })).toBe(false)
    expect(isDevEnvironment({ RAILWAY_ENVIRONMENT_NAME: 'production' })).toBe(false)
    expect(isDevEnvironment({ APP_ENV: 'development' })).toBe(false)
  })
})

// El proxy corre en cada petición (sin matcher): páginas, panel, API y estáticos. Para el
// noindex no mira la ruta ni las cabeceras; solo el entorno.
const request = (path = '/') => new NextRequest(`http://localhost:3000${path}`)

describe('proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('en dev deja pasar sin pedir credenciales y añade noindex', () => {
    vi.stubEnv('APP_ENV', 'dev')

    const response = proxy(request())

    expect(response.status).toBe(200)
    expect(response.headers.get('www-authenticate')).toBeNull()
    // NextResponse.next(): la petición sigue hasta la página.
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
  })

  it('en el entorno dev de Railway también añade noindex', () => {
    vi.stubEnv('RAILWAY_ENVIRONMENT_NAME', 'dev')

    expect(proxy(request()).headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
  })

  it('fuera de dev no toca la respuesta: producción se indexa', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('RAILWAY_ENVIRONMENT_NAME', 'production')

    const response = proxy(request())

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-robots-tag')).toBeNull()
  })

  it('la cabecera noindex bloquea indexar y seguir enlaces', () => {
    expect(NOINDEX_HEADER).toBe('noindex, nofollow')
  })

  it('el módulo ya no tiene puerta de basic auth', () => {
    expect(Object.keys(devGate).sort()).toEqual(['NOINDEX_HEADER', 'isDevEnvironment'])
  })
})
