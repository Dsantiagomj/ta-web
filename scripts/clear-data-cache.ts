// Vacía la caché de datos de Next (.next/cache/fetch-cache), donde unstable_cache guarda
// las guías leídas de Postgres (src/lib/guides/cache.ts). Las E2E y Lighthouse CI la
// vacían antes de `pnpm start`: la base acaba de sembrarse y una guía guardada por una
// ejecución anterior (o restaurada por la caché de CI) no debe tapar la nueva.
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const DATA_CACHE_DIR = '.next/cache/fetch-cache'

export function clearDataCache(): void {
  rmSync(DATA_CACHE_DIR, { recursive: true, force: true })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) clearDataCache()
