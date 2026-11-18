import { afterEach, describe, expect, it, vi } from 'vitest'

import { E2E_DATABASE_URL } from '../../src/lib/db/dev-database'
import config from '../../playwright.config'
import { analyticsWebServer, ANALYTICS_E2E, appWebServers } from '../e2e/app-server'
import { faultInjectionRefusal, integrationEnv } from '../integration/env'

// `pnpm migrate` prefiere DATABASE_URL_DIRECT: si las pruebas no la fijan, una URL
// directa del shell mandaría sus migraciones a una base real.

describe('integrationEnv', () => {
  it('apunta la URL directa a la misma base de pruebas que DATABASE_URL', () => {
    const env = integrationEnv({ DATABASE_URL_DIRECT: 'postgres://real:clave@neon/prod' })

    expect(env.DATABASE_URL_DIRECT).toBe(env.DATABASE_URL)
    expect(env.DATABASE_URL_DIRECT).not.toMatch(/neon/)
  })

  it('usa la base del CI para las dos', () => {
    const env = integrationEnv({
      DATABASE_URL: 'postgres://ci@localhost/pruebas',
      DATABASE_URL_DIRECT: 'postgres://real:clave@neon/prod',
    })

    expect(env.DATABASE_URL).toBe('postgres://ci@localhost/pruebas')
    expect(env.DATABASE_URL_DIRECT).toBe('postgres://ci@localhost/pruebas')
  })
})

describe('faultInjectionRefusal', () => {
  const suite = (DATABASE_URL: string) => ({ ...integrationEnv({ DATABASE_URL }) })

  it('acepta cualquier base local de las pruebas de integración, se llame como se llame', () => {
    for (const url of [
      'postgres://postgres:postgres@127.0.0.1:54329/ta_web_integration',
      'postgres://postgres:postgres@127.0.0.1:54329/ta_web_int_t3_4c855ee7',
      'postgres://postgres:postgres@localhost:5432/ta_web',
    ]) {
      expect(faultInjectionRefusal(suite(url)), url).toBeUndefined()
    }
  })

  it('rechaza una base remota', () => {
    expect(faultInjectionRefusal(suite('postgres://u:p@remote.invalid/ta_web'))).toMatch(
      /solo permite Postgres local/,
    )
  })

  it('rechaza la base de desarrollo de pnpm db:dev', () => {
    expect(
      faultInjectionRefusal(suite('postgres://postgres:postgres@localhost:54329/ta_web')),
    ).toMatch(/base de desarrollo/)
  })

  it('rechaza una base local fuera de las pruebas de integración', () => {
    expect(
      faultInjectionRefusal({ DATABASE_URL: 'postgres://postgres:postgres@localhost/otra_base' }),
    ).toMatch(/solo dentro de pnpm test:integration/)
  })
})

describe('appWebServers', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('arranca la app con la URL directa apuntando a la base de pruebas', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://ci@localhost/pruebas')
    vi.stubEnv('DATABASE_URL_DIRECT', 'postgres://real:clave@neon/prod')

    const app = appWebServers({ port: 3100 }).at(-1)

    expect(app?.env?.DATABASE_URL).toBe('postgres://ci@localhost/pruebas')
    expect(app?.env?.DATABASE_URL_DIRECT).toBe('postgres://ci@localhost/pruebas')
  })

  it('arranca sin el worker de Twitch: las pruebas no salen a la red', () => {
    vi.stubEnv('TWITCH_LIVE_URL', 'https://real.example/')

    expect(appWebServers({ port: 3100 }).at(-1)?.env?.TWITCH_LIVE_URL).toBe('off')
  })

  it('trata una DATABASE_URL en blanco como vacía: base embebida, como pnpm test:lhci', () => {
    vi.stubEnv('DATABASE_URL', '  ')

    const servers = appWebServers({ port: 3100 })

    expect(servers[0]?.command).toBe('pnpm db:dev')
    expect(servers.at(-1)?.env?.DATABASE_URL).toBe(E2E_DATABASE_URL)
  })

  it('siembra las guías de prueba después de migrar y vacía la caché de datos antes de arrancar', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://ci@localhost/pruebas')

    const command = appWebServers({ port: 3100 }).at(-1)?.command ?? ''

    expect(command).toMatch(
      /pnpm migrate && pnpm seed:e2e && node scripts\/clear-data-cache.ts && pnpm start --port 3100$/,
    )
  })

  it('sin R2: los archivos sembrados van al disco local aunque el shell tenga las S3_*', () => {
    vi.stubEnv('S3_BUCKET', 'real')
    vi.stubEnv('MEDIA_BASE_URL', 'https://cdn')

    const env = appWebServers({ port: 3100 }).at(-1)?.env ?? {}

    for (const name of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      expect(env[name], name).toBe('')
    }
    expect(env.MEDIA_BASE_URL).toBe('')
  })

  it('el origen público es el del servidor de pruebas: producción lo exige', () => {
    const env = appWebServers({ port: 3147 }).at(-1)?.env ?? {}

    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3147')
  })

  it('sin Umami aunque el shell tenga sus variables: las pruebas nunca cuentan visitas', () => {
    vi.stubEnv('UMAMI_HOST', 'https://umami.ejemplo.com')
    vi.stubEnv('UMAMI_WEBSITE_ID', '5f0e2a3b-1c4d-4e8f-9a0b-1c2d3e4f5a6b')

    const env = appWebServers({ port: 3100 }).at(-1)?.env ?? {}

    expect(env.UMAMI_HOST).toBe('')
    expect(env.UMAMI_WEBSITE_ID).toBe('')
  })

  it('las variables propias de una suite (env) ganan a las de la base', () => {
    const env = appWebServers({ port: 3100, env: { UMAMI_HOST: 'https://umami.invalid' } }).at(
      -1,
    )?.env

    expect(env?.UMAMI_HOST).toBe('https://umami.invalid')
  })
})

describe('analyticsWebServer', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('arranca el mismo build en otro puerto, sobre la misma base, con Umami encendido', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://ci@localhost/pruebas')

    const server = analyticsWebServer({ port: 3102 })

    expect(server.command).toBe('pnpm start --port 3102')
    expect(server.url).toBe('http://localhost:3102')
    expect(server.env).toMatchObject({
      DATABASE_URL: 'postgres://ci@localhost/pruebas',
      DATABASE_URL_DIRECT: 'postgres://ci@localhost/pruebas',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3102',
      UMAMI_HOST: ANALYTICS_E2E.host,
      UMAMI_WEBSITE_ID: ANALYTICS_E2E.websiteId,
    })
  })

  it('va después de la app principal en la configuración, que compila, migra y siembra', () => {
    const servers = [config.webServer].flat()
    const commands = servers.map((server) => server?.command ?? '')

    expect(commands.at(-1)).toMatch(/^pnpm start --port \d+$/)
    expect(commands.at(-2)).toMatch(/pnpm seed:e2e/)
  })
})
