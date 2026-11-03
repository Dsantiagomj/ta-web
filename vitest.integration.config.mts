import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

import { integrationEnv } from './tests/integration/env.ts'

// Pruebas de integración: Payload de verdad (getPayload) contra un Postgres de verdad,
// con las migraciones aplicadas. Ver tests/integration/global-setup.ts.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    env: integrationEnv(process.env),
    // Todas las pruebas comparten una base: un archivo detrás de otro.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})
