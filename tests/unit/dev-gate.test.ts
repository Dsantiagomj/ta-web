import { describe, expect, it } from 'vitest'

import {
  DEV_GATE_EXEMPT_PATHS,
  NOINDEX_HEADER,
  decideDevGate,
  devGateResponse,
  isDevEnvironment,
} from '@/lib/dev-gate/dev-gate'

const credentials = { DEV_BASIC_AUTH_USER: 'torre', DEV_BASIC_AUTH_PASSWORD: 'clave-ñandú' }
const devEnv = { APP_ENV: 'dev', ...credentials }

function basic(user: string, password: string): string {
  const bytes = new TextEncoder().encode(`${user}:${password}`)
  return `Basic ${btoa(String.fromCharCode(...bytes))}`
}

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

describe('decideDevGate', () => {
  it('fuera de dev deja pasar todo sin credenciales', () => {
    expect(decideDevGate({ env: {}, pathname: '/', authorization: null })).toEqual({
      kind: 'open',
    })
    expect(
      decideDevGate({ env: { APP_ENV: 'production' }, pathname: '/admin', authorization: null }),
    ).toEqual({ kind: 'open' })
  })

  it('en dev pide credenciales en cualquier ruta', () => {
    for (const pathname of ['/', '/admin', '/api/users', '/robots.txt', '/_next/static/x.js']) {
      expect(decideDevGate({ env: devEnv, pathname, authorization: null })).toEqual({
        kind: 'challenge',
      })
    }
  })

  it('en dev deja pasar con las credenciales correctas, también con caracteres no ASCII', () => {
    expect(
      decideDevGate({ env: devEnv, pathname: '/', authorization: basic('torre', 'clave-ñandú') }),
    ).toEqual({ kind: 'allow' })
  })

  it('una contraseña con dos puntos sigue valiendo', () => {
    const env = { APP_ENV: 'dev', DEV_BASIC_AUTH_USER: 'torre', DEV_BASIC_AUTH_PASSWORD: 'a:b:c' }
    expect(decideDevGate({ env, pathname: '/', authorization: basic('torre', 'a:b:c') })).toEqual({
      kind: 'allow',
    })
  })

  it('rechaza usuario o contraseña incorrectos', () => {
    for (const authorization of [
      basic('torre', 'otra'),
      basic('otro', 'clave-ñandú'),
      basic('torre', 'clave-ñandú-y-más'),
      basic('torre', ''),
      basic('', ''),
    ]) {
      expect(decideDevGate({ env: devEnv, pathname: '/', authorization })).toEqual({
        kind: 'challenge',
      })
    }
  })

  it('rechaza cabeceras mal formadas o de otro esquema', () => {
    for (const authorization of [
      'Bearer abc',
      'Basic',
      'Basic %%%no-es-base64',
      `Basic ${btoa('sin-dos-puntos')}`,
      'JWT abc',
    ]) {
      expect(decideDevGate({ env: devEnv, pathname: '/', authorization })).toEqual({
        kind: 'challenge',
      })
    }
  })

  it('acepta el esquema en minúsculas', () => {
    const authorization = basic('torre', 'clave-ñandú').replace('Basic', 'basic')
    expect(decideDevGate({ env: devEnv, pathname: '/', authorization })).toEqual({
      kind: 'allow',
    })
  })

  it('deja /api/health sin credenciales, para los monitores', () => {
    expect(DEV_GATE_EXEMPT_PATHS).toEqual(['/api/health'])
    expect(decideDevGate({ env: devEnv, pathname: '/api/health', authorization: null })).toEqual({
      kind: 'allow',
    })
  })

  it('la excepción es solo esa ruta exacta', () => {
    for (const pathname of ['/api/health/x', '/api/healthz', '/api/health-admin', '/api/Health']) {
      expect(decideDevGate({ env: devEnv, pathname, authorization: null })).toEqual({
        kind: 'challenge',
      })
    }
  })

  it('sin credenciales configuradas en dev, cierra en vez de servir sin protección', () => {
    for (const env of [
      { APP_ENV: 'dev' },
      { APP_ENV: 'dev', DEV_BASIC_AUTH_USER: 'torre' },
      { APP_ENV: 'dev', DEV_BASIC_AUTH_PASSWORD: 'clave' },
      { APP_ENV: 'dev', DEV_BASIC_AUTH_USER: ' ', DEV_BASIC_AUTH_PASSWORD: 'clave' },
      { RAILWAY_ENVIRONMENT_NAME: 'dev' },
    ]) {
      expect(decideDevGate({ env, pathname: '/', authorization: basic('torre', 'clave') })).toEqual(
        { kind: 'misconfigured' },
      )
    }
  })

  it('sin credenciales configuradas, /api/health sigue respondiendo', () => {
    expect(
      decideDevGate({ env: { APP_ENV: 'dev' }, pathname: '/api/health', authorization: null }),
    ).toEqual({ kind: 'allow' })
  })
})

describe('devGateResponse', () => {
  it('401 con WWW-Authenticate Basic, un realm en español y noindex', async () => {
    const response = devGateResponse({ kind: 'challenge' })

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      'Basic realm="Torrente Arcano: entorno de desarrollo", charset="UTF-8"',
    )
    expect(response.headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toMatch(/usuario y la contraseña/)
  })

  it('503 con un mensaje en español cuando faltan las credenciales', async () => {
    const response = devGateResponse({ kind: 'misconfigured' })

    expect(response.status).toBe(503)
    expect(response.headers.get('www-authenticate')).toBeNull()
    expect(response.headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.text()
    expect(body).toMatch(/no está disponible/)
    // El mensaje es público: no nombra variables ni valores.
    expect(body).not.toMatch(/DEV_BASIC_AUTH/)
  })

  it('la cabecera noindex bloquea indexar y seguir enlaces', () => {
    expect(NOINDEX_HEADER).toBe('noindex, nofollow')
  })
})
