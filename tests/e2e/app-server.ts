import type { PlaywrightTestConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { DEV_DATABASE, E2E_DATABASE_URL } from '../../src/lib/db/dev-database.ts'

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
 * migraciones versionadas sobre la base vacía, las guías de prueba (pnpm seed:e2e) y
 * start. Sin push de esquema. E2E_SKIP_BUILD=1 reutiliza un .next ya compilado.
 */
export function appWebServers({
  port,
  env = {},
}: {
  port: number
  env?: Record<string, string>
}): WebServer[] {
  const configuredUrl = process.env.DATABASE_URL?.trim()
  const useEmbeddedDatabase = !configuredUrl
  const databaseUrl = configuredUrl || E2E_DATABASE_URL
  const app = [
    ...(process.env.E2E_SKIP_BUILD === '1' ? [] : ['pnpm build']),
    ...(useEmbeddedDatabase ? ['node scripts/db-e2e-reset.ts'] : []),
    'pnpm migrate',
    'pnpm seed:e2e',
    // La base es nueva: ninguna guía en caché de una ejecución anterior puede taparla.
    'node scripts/clear-data-cache.ts',
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
      env: {
        // También la URL directa, que `pnpm migrate` prefiere: nunca una base real del shell.
        DATABASE_URL: databaseUrl,
        DATABASE_URL_DIRECT: databaseUrl,
        // El origen público: en producción (next start) es obligatorio (src/lib/site/origin.ts).
        NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
        // Sin R2: la imagen sembrada va al disco local (./media) aunque el shell tenga las S3_*.
        S3_ENDPOINT: '',
        S3_BUCKET: '',
        S3_ACCESS_KEY_ID: '',
        S3_SECRET_ACCESS_KEY: '',
        MEDIA_BASE_URL: '',
        ...env,
      },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ]
}
