import { LHCI_DATABASE_URL } from '../src/lib/db/dev-database.ts'

type Env = Record<string, string | undefined>

/**
 * Las variables con las que `pnpm test:lhci` compila, migra y arranca la app. Con
 * DATABASE_URL (CI: el Postgres vacío del job E2E) usa esa base; sin ella, la base
 * ta_web_lhci del Postgres embebido de `pnpm db:dev`, que se vacía en cada ejecución.
 */
export function lhciEnv(env: Env, siteUrl = 'http://localhost:3000'): Record<string, string> {
  const databaseUrl = env.DATABASE_URL?.trim() || LHCI_DATABASE_URL
  return {
    DATABASE_URL: databaseUrl,
    // `pnpm migrate` prefiere la URL directa: sin fijarla aquí, una del shell mandaría
    // las migraciones a una base real.
    DATABASE_URL_DIRECT: databaseUrl,
    PAYLOAD_SECRET: env.PAYLOAD_SECRET || 'lhci-local-no-secreto',
    // El origen público: en producción (next start) es obligatorio (src/lib/site/origin.ts).
    NEXT_PUBLIC_SITE_URL: siteUrl,
    // Se mide el sitio de producción, sin la cabecera noindex del entorno dev.
    APP_ENV: '',
    // Sin R2: los archivos van al disco local (./media) aunque el shell tenga las S3_*.
    S3_ENDPOINT: '',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    MEDIA_BASE_URL: '',
  }
}
