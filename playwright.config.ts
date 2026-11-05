import { defineConfig, devices } from '@playwright/test'

import { appWebServers, loadE2eEnvFromFile } from './tests/e2e/app-server'

loadE2eEnvFromFile()

// Puerto propio, para no reutilizar por error un `pnpm dev` abierto en el 3000.
const port = Number(process.env.E2E_PORT ?? 3100)

// Smoke tests contra un entorno desplegado (pnpm test:smoke): con SMOKE_BASE_URL no se
// arranca nada en local, ni build, ni migraciones, ni base. Solo se lee del entorno del
// proceso, nunca de .env, para no apuntar las pruebas a un despliegue sin querer.
const smokeBaseUrl = process.env.SMOKE_BASE_URL?.trim() || undefined
const baseURL = smokeBaseUrl ?? `http://localhost:${port}`

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
  // E2E_DESIGN_CATALOG=1 abre el catálogo /sistema en el build de producción de las pruebas
  // (src/lib/dev-gate/design-catalog.ts). Nunca se pone en un entorno desplegado.
  webServer: smokeBaseUrl ? [] : appWebServers({ port, env: { E2E_DESIGN_CATALOG: '1' } }),
})
