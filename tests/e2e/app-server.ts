import type { PlaywrightTestConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { DEV_DATABASE, E2E_DATABASE_URL } from '../../src/lib/db/dev-database'

type WebServer = Extract<PlaywrightTestConfig['webServer'], unknown[]>[number]

// De .env solo se leen las variables E2E_*: DATABASE_URL de .env podría apuntar a una
// base real, y las pruebas la migrarían. El entorno del proceso siempre gana.
export function loadE2eEnvFromFile(): void {
  if (!existsSync('.env')) return
  const fromFile = parseEnv(readFileSync('.env', 'utf8'))
  for (const name of ['E2E_PORT', 'E2E_DEV_GATE_PORT', 'E2E_SKIP_BUILD']) {
    if (process.env[name] === undefined && fromFile[name] !== undefined) {
      process.env[name] = fromFile[name]
    }
  }
}

/**
 * Los servidores de las pruebas E2E: el Postgres embebido si no hay DATABASE_URL (CI usa
 * un Postgres vacío como servicio) y la app por el camino de producción: build,
 * migraciones versionadas sobre la base vacía y start. Sin push de esquema.
 * E2E_SKIP_BUILD=1 reutiliza un .next ya compilado.
 */
export function appWebServers({
  port,
  env = {},
}: {
  port: number
  env?: Record<string, string>
}): WebServer[] {
  const useEmbeddedDatabase = !process.env.DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || E2E_DATABASE_URL
  const app = [
    ...(process.env.E2E_SKIP_BUILD === '1' ? [] : ['pnpm build']),
    ...(useEmbeddedDatabase ? ['node scripts/db-e2e-reset.ts'] : []),
    'pnpm migrate',
    `pnpm start --port ${port}`,
  ].join(' && ')

  return [
    ...(useEmbeddedDatabase
      ? [
          {
            command: 'pnpm db:dev',
            port: DEV_DATABASE.port,
            reuseExistingServer: true,
            timeout: 120_000,
          },
        ]
      : []),
    {
      command: app,
      url: `http://localhost:${port}`,
      // También la URL directa, que `pnpm migrate` prefiere: nunca una base real del shell.
      env: { DATABASE_URL: databaseUrl, DATABASE_URL_DIRECT: databaseUrl, ...env },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ]
}
