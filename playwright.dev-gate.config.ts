import { defineConfig, devices } from '@playwright/test'

import { appWebServers, loadE2eEnvFromFile } from './tests/e2e/app-server'
import { DEV_GATE_TEST_CREDENTIALS } from './tests/e2e-dev-gate/credentials'

// La app tal como corre en el entorno dev (pnpm test:e2e:dev-gate): APP_ENV=dev, detrás
// de basic auth. Aparte de la suite principal para que esa siga siendo rápida. Con
// E2E_SKIP_BUILD=1 reutiliza el build de pnpm test:e2e: la puerta lee el entorno al
// arrancar, no al compilar.
loadE2eEnvFromFile()

const port = Number(process.env.E2E_DEV_GATE_PORT ?? 3101)
// Una segunda instancia en dev sin credenciales configuradas, para ver que cierra.
const unconfiguredPort = port + 1

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
      testMatch: 'gate.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${port}` },
    },
    {
      name: 'dev-sin-credenciales',
      testMatch: 'unconfigured.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${unconfiguredPort}` },
    },
  ],
  webServer: [
    ...appWebServers({
      port,
      env: {
        APP_ENV: 'dev',
        DEV_BASIC_AUTH_USER: DEV_GATE_TEST_CREDENTIALS.username,
        DEV_BASIC_AUTH_PASSWORD: DEV_GATE_TEST_CREDENTIALS.password,
      },
    }),
    // Arranca después de la primera, que ya compiló y migró. Responde 503 en todo, así
    // que se espera al puerto y no a una URL.
    {
      command: `pnpm start --port ${unconfiguredPort}`,
      port: unconfiguredPort,
      env: { APP_ENV: 'dev', DEV_BASIC_AUTH_USER: '', DEV_BASIC_AUTH_PASSWORD: '' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
