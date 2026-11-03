import { describe, expect, it } from 'vitest'

import { sentryServerOptions } from '@/lib/monitoring/sentry'

// DSN de ejemplo con el formato real; no apunta a ningún proyecto.
const DSN = 'https://clave@o0.ingest.us.sentry.io/0'

describe('sentryServerOptions', () => {
  it('no activa Sentry sin SENTRY_DSN, aunque sea producción', () => {
    expect(sentryServerOptions({ RAILWAY_ENVIRONMENT_NAME: 'production' })).toBeUndefined()
    expect(
      sentryServerOptions({ RAILWAY_ENVIRONMENT_NAME: 'production', SENTRY_DSN: '  ' }),
    ).toBeUndefined()
  })

  it('no envía nada en local ni en CI: sin entorno conocido no hay opciones', () => {
    expect(sentryServerOptions({ SENTRY_DSN: DSN })).toBeUndefined()
    expect(sentryServerOptions({ SENTRY_DSN: DSN, APP_ENV: 'development' })).toBeUndefined()
    expect(
      sentryServerOptions({ SENTRY_DSN: DSN, RAILWAY_ENVIRONMENT_NAME: 'staging' }),
    ).toBeUndefined()
  })

  it('en el entorno dev de Railway, o con APP_ENV=dev, el entorno es dev', () => {
    expect(
      sentryServerOptions({ SENTRY_DSN: DSN, RAILWAY_ENVIRONMENT_NAME: 'dev' })?.environment,
    ).toBe('dev')
    expect(sentryServerOptions({ SENTRY_DSN: DSN, APP_ENV: 'dev' })?.environment).toBe('dev')
  })

  it('en el entorno production de Railway, el entorno es production', () => {
    expect(
      sentryServerOptions({ SENTRY_DSN: DSN, RAILWAY_ENVIRONMENT_NAME: 'production' })?.environment,
    ).toBe('production')
    expect(sentryServerOptions({ SENTRY_DSN: DSN, APP_ENV: ' Production ' })?.environment).toBe(
      'production',
    )
  })

  it('usa el DSN sin espacios y no recoge datos de los visitantes ni del contenido', () => {
    const options = sentryServerOptions({
      SENTRY_DSN: ` ${DSN}\n`,
      RAILWAY_ENVIRONMENT_NAME: 'production',
    })

    expect(options?.dsn).toBe(DSN)
    // Sentry 11 quitó sendDefaultPii: lo que se recoge se decide con dataCollection, que
    // por defecto lo recoge todo (cookies, cabeceras, cuerpos, query params, usuario).
    expect(options).not.toHaveProperty('sendDefaultPii')
    expect(options?.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    })
  })

  it('no graba trazas de rendimiento: solo errores', () => {
    const options = sentryServerOptions({ SENTRY_DSN: DSN, RAILWAY_ENVIRONMENT_NAME: 'dev' })

    expect(options).toBeDefined()
    // Ni 0: con cualquier número el SDK monta la instrumentación de trazas.
    expect(options).not.toHaveProperty('tracesSampleRate')
    expect(options).not.toHaveProperty('tracesSampler')
  })

  it('la release es el commit desplegado, el mismo que muestra /api/health', () => {
    const base = { SENTRY_DSN: DSN, RAILWAY_ENVIRONMENT_NAME: 'production' }

    expect(
      sentryServerOptions({ ...base, RAILWAY_GIT_COMMIT_SHA: 'railway', GIT_COMMIT_SHA: 'git' })
        ?.release,
    ).toBe('railway')
    expect(sentryServerOptions({ ...base, GIT_COMMIT_SHA: 'git' })?.release).toBe('git')
  })

  it('sin commit conocido no inventa una release', () => {
    const options = sentryServerOptions({
      SENTRY_DSN: DSN,
      RAILWAY_ENVIRONMENT_NAME: 'production',
      GIT_COMMIT_SHA: ' ',
    })

    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('release')
  })
})
