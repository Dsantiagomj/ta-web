import { DEV_DATABASE_URL } from './dev-database'

export { DEV_DATABASE_URL }

type Env = Record<string, string | undefined>

/**
 * La cadena de conexión de Postgres. DATABASE_URL siempre gana (Neon, CI, producción).
 * Sin ella, desarrollo y pruebas usan la base embebida de `pnpm db:dev`; producción
 * falla en vez de conectar a una base local. `next build` no abre conexiones, así que
 * compila sin la variable.
 */
export function resolveDatabaseUrl(env: Env): string {
  const url = env.DATABASE_URL?.trim()
  if (url) return url

  const isBuild = env.NEXT_PHASE === 'phase-production-build'
  if (env.NODE_ENV === 'production' && !isBuild) {
    throw new Error('Falta DATABASE_URL: en producción no hay base de datos por defecto')
  }

  return DEV_DATABASE_URL
}
