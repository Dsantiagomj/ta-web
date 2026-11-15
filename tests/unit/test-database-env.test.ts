import { afterEach, describe, expect, it, vi } from 'vitest'

import { E2E_DATABASE_URL } from '../../src/lib/db/dev-database'
import { appWebServers } from '../e2e/app-server'
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
})
