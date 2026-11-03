import { describe, expect, it } from 'vitest'

import { DEV_DATABASE_URL, resolveDatabaseUrl, shouldPushSchema } from '@/lib/db/database-url'

describe('resolveDatabaseUrl', () => {
  it('usa la base embebida de pnpm db:dev en desarrollo si no hay DATABASE_URL', () => {
    expect(resolveDatabaseUrl({ NODE_ENV: 'development' })).toBe(DEV_DATABASE_URL)
    expect(DEV_DATABASE_URL).toBe('postgres://postgres:postgres@127.0.0.1:54329/torrente_arcano')
  })

  it('respeta cualquier DATABASE_URL, por ejemplo una rama de Neon', () => {
    const neon =
      'postgres://usuario:clave@ep-rama.eu-central-1.aws.neon.tech/torrente?sslmode=require'
    expect(resolveDatabaseUrl({ NODE_ENV: 'development', DATABASE_URL: neon })).toBe(neon)
    expect(resolveDatabaseUrl({ NODE_ENV: 'production', DATABASE_URL: neon })).toBe(neon)
  })

  it('trata una DATABASE_URL vacía como ausente', () => {
    expect(resolveDatabaseUrl({ NODE_ENV: 'test', DATABASE_URL: '  ' })).toBe(DEV_DATABASE_URL)
  })

  it('falla en producción sin DATABASE_URL, para no conectar a una base local por error', () => {
    expect(() => resolveDatabaseUrl({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/)
  })

  it('deja compilar sin DATABASE_URL: next build no abre conexiones', () => {
    expect(
      resolveDatabaseUrl({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }),
    ).toBe(DEV_DATABASE_URL)
  })
})

describe('shouldPushSchema', () => {
  it('solo empuja el esquema con next dev', () => {
    expect(shouldPushSchema({ NODE_ENV: 'development' })).toBe(true)
  })

  it('nunca fuera de desarrollo: producción, pruebas o la CLI de Payload aplican migraciones', () => {
    expect(shouldPushSchema({ NODE_ENV: 'production' })).toBe(false)
    expect(shouldPushSchema({ NODE_ENV: 'test' })).toBe(false)
    expect(shouldPushSchema({})).toBe(false)
  })
})
