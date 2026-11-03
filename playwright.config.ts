import { defineConfig, devices } from '@playwright/test'

import { DEV_DATABASE, E2E_DATABASE_URL } from './src/lib/db/dev-database'

// Puerto propio, para no reutilizar por error un `pnpm dev` abierto en el 3000.
const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://localhost:${port}`

// Con DATABASE_URL (CI: un Postgres vacío como servicio) se usa esa base. Sin ella, las
// pruebas arrancan el Postgres embebido de pnpm db:dev y vacían su base E2E.
const useEmbeddedDatabase = !process.env.DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || E2E_DATABASE_URL

// El camino de producción: build, migraciones versionadas sobre la base vacía y start.
// Sin push de esquema. E2E_SKIP_BUILD=1 reutiliza un .next ya compilado.
const app = [
  ...(process.env.E2E_SKIP_BUILD === '1' ? [] : ['pnpm build']),
  ...(useEmbeddedDatabase ? ['node scripts/db-e2e-reset.ts'] : []),
  'pnpm migrate',
  `pnpm start --port ${port}`,
].join(' && ')

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
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
      url: baseURL,
      env: { DATABASE_URL: databaseUrl },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
})
