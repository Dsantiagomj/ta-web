import { defineConfig, devices } from '@playwright/test'

import { appWebServers, loadE2eEnvFromFile } from './tests/e2e/app-server'

// La app tal como corre en el entorno dev (pnpm test:e2e:dev-gate): APP_ENV=dev, pública
// pero sin indexar. Aparte de la suite principal para que esa siga siendo rápida. Con
// E2E_SKIP_BUILD=1 reutiliza el build de pnpm test:e2e: el proxy lee el entorno al
// arrancar, no al compilar.
loadE2eEnvFromFile()

const port = Number(process.env.E2E_DEV_GATE_PORT ?? 3101)

export default defineConfig({
  testDir: './tests/e2e-dev-gate',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    {
      name: 'dev',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${port}` },
    },
  ],
  webServer: appWebServers({ port, env: { APP_ENV: 'dev' } }),
})
