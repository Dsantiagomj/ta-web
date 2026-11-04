import { afterEach, describe, expect, it, vi } from 'vitest'

import { E2E_DATABASE_URL } from '../../src/lib/db/dev-database'
import { appWebServers } from '../e2e/app-server'
import { integrationEnv } from '../integration/env'

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
})
