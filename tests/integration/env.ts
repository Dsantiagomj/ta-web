import { isLocalDatabaseUrl } from '../../src/lib/db/database-url.ts'
import { DEV_DATABASE, INTEGRATION_DATABASE_URL } from '../../src/lib/db/dev-database.ts'

type Env = Record<string, string | undefined>

/**
 * Con DATABASE_URL (CI: un Postgres vacío como servicio) las pruebas usan esa base.
 * Sin ella, el Postgres embebido de `pnpm db:dev` con su base de integración, que se
 * vacía en cada ejecución. Solo se lee del entorno del proceso, nunca de .env.
 */
export function usesEmbeddedDatabase(env: Env): boolean {
  return !env.DATABASE_URL?.trim()
}

/** Las variables con las que arrancan Payload y `pnpm migrate` en estas pruebas. */
export function integrationEnv(env: Env): Record<string, string> {
  const databaseUrl = env.DATABASE_URL?.trim() || INTEGRATION_DATABASE_URL
  return {
    DATABASE_URL: databaseUrl,
    // `pnpm migrate` prefiere la URL directa: sin fijarla aquí, una del shell mandaría
    // las migraciones de las pruebas a una base real.
    DATABASE_URL_DIRECT: databaseUrl,
    PAYLOAD_SECRET: env.PAYLOAD_SECRET || 'integracion-local-no-secreto',
    // Marca de esta suite: las pruebas que inyectan fallos solo corren con ella.
    TA_WEB_INTEGRATION: '1',
    // Sin R2: los archivos van al disco local (./media) aunque el shell tenga las S3_*.
    S3_ENDPOINT: '',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    MEDIA_BASE_URL: '',
  }
}

/**
 * Por qué no se puede inyectar un fallo (matar una conexión) en la base de este entorno,
 * o `undefined` si se puede. Vale cualquier base local que use `pnpm test:integration`,
 * se llame como se llame (cada worktree usa la suya), pero nunca una remota ni la base de
 * desarrollo de `pnpm db:dev`, ni fuera de esta suite.
 */
export function faultInjectionRefusal(env: Env): string | undefined {
  const url = env.DATABASE_URL?.trim() ?? ''
  if (!isLocalDatabaseUrl(url)) return 'La inyección de fallos solo permite Postgres local'
  if (env.TA_WEB_INTEGRATION !== '1') {
    return 'La inyección de fallos corre solo dentro de pnpm test:integration'
  }
  const { port, pathname } = new URL(url)
  if (Number(port) === DEV_DATABASE.port && pathname === `/${DEV_DATABASE.database}`) {
    return 'La inyección de fallos no toca la base de desarrollo de pnpm db:dev'
  }
  return undefined
}
