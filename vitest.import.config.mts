import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Las páginas de oro de la importación de Squarespace (pnpm test:import): cada página guardada
// en tests/fixtures/import-golden/pages/ pasa por su conversor y la salida tiene que ser la
// revisada de .../expected/. Sin base ni red: los conversores son código puro.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/import/**/*.test.ts'],
  },
})
