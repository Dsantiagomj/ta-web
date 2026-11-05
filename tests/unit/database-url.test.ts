import { describe, expect, it } from 'vitest'

import packageJson from '../../package.json'
import {
  DEV_DATABASE_URL,
  isLocalDatabaseUrl,
  resolveDatabaseUrl,
  shouldPushSchema,
} from '@/lib/db/database-url'

describe('resolveDatabaseUrl', () => {
  it('usa la base embebida de pnpm db:dev en desarrollo si no hay DATABASE_URL', () => {
    expect(resolveDatabaseUrl({ NODE_ENV: 'development' })).toBe(DEV_DATABASE_URL)
    expect(DEV_DATABASE_URL).toBe('postgres://postgres:postgres@127.0.0.1:54329/ta_web')
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

describe('resolveDatabaseUrl para las migraciones (DATABASE_CONNECTION=direct)', () => {
  const pooled = 'postgres://app:clave@ep-rama-pooler.us-east-1.aws.neon.tech/torrente'
  const direct = 'postgres://app:clave@ep-rama.us-east-1.aws.neon.tech/torrente'

  it('usa la URL directa de Neon (sin pooler) cuando existe', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        DATABASE_CONNECTION: 'direct',
        DATABASE_URL: pooled,
        DATABASE_URL_DIRECT: direct,
      }),
    ).toBe(direct)
  })

  it('vuelve a DATABASE_URL si no hay URL directa, como en CI y en local', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        DATABASE_CONNECTION: 'direct',
        DATABASE_URL: pooled,
      }),
    ).toBe(pooled)
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        DATABASE_CONNECTION: 'direct',
        DATABASE_URL: pooled,
        DATABASE_URL_DIRECT: ' ',
      }),
    ).toBe(pooled)
  })

  it('sin ninguna de las dos, en local usa la base embebida', () => {
    expect(resolveDatabaseUrl({ DATABASE_CONNECTION: 'direct' })).toBe(DEV_DATABASE_URL)
  })

  it('sin ninguna de las dos, en producción falla', () => {
    expect(() =>
      resolveDatabaseUrl({ NODE_ENV: 'production', DATABASE_CONNECTION: 'direct' }),
    ).toThrow(/DATABASE_URL/)
  })

  it('la app en marcha ignora la URL directa y usa siempre la del pooler', () => {
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        DATABASE_URL: pooled,
        DATABASE_URL_DIRECT: direct,
      }),
    ).toBe(pooled)
  })

  it('la app en marcha no arranca en producción solo con la URL directa', () => {
    expect(() =>
      resolveDatabaseUrl({ NODE_ENV: 'production', DATABASE_URL_DIRECT: direct }),
    ).toThrow(/DATABASE_URL/)
  })
})

describe('pnpm migrate', () => {
  it('pide la conexión directa con DATABASE_CONNECTION=direct', () => {
    expect(packageJson.scripts.migrate).toMatch(
      /\bDATABASE_CONNECTION=direct\b.*\bpayload migrate\b/,
    )
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

describe('isLocalDatabaseUrl', () => {
  it('acepta las bases locales de las pruebas: la embebida y la del servicio de CI', () => {
    expect(isLocalDatabaseUrl('postgres://postgres:postgres@127.0.0.1:54329/ta_web_e2e')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://postgres:postgres@localhost:5432/ta_web')).toBe(true)
  })

  it('rechaza cualquier otra, para no sembrar datos de prueba en una base real', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@ep-x.eu-central-1.aws.neon.tech/ta_web')).toBe(false)
    expect(isLocalDatabaseUrl('postgres://u:p@localhost.evil.example/ta_web')).toBe(false)
    expect(isLocalDatabaseUrl('no es una url')).toBe(false)
    expect(isLocalDatabaseUrl('')).toBe(false)
  })
})
