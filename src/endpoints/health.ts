import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { Endpoint } from 'payload'

import packageJson from '../../package.json'

// Comprobación de salud para los smoke tests tras un despliegue y los monitores de
// disponibilidad. Pública: no lleva autenticación, así que nunca devuelve secretos,
// mensajes de error ni trazas.

const DEFAULT_TIMEOUT_MS = 2000

type CheckHealthOptions = {
  pingDatabase: () => Promise<unknown>
  version: string
  commit: string
  timeoutMs?: number
}

export async function checkHealth({
  pingDatabase,
  version,
  commit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CheckHealthOptions): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    await withTimeout(pingDatabase(), timeoutMs)
    return Response.json({ status: 'ok', db: 'ok', version, commit }, { status: 200, headers })
  } catch {
    // El detalle del fallo se queda fuera: puede llevar la URL de la base.
    return Response.json({ status: 'error', db: 'error' }, { status: 503, headers })
  }
}

// El commit desplegado: Railway lo inyecta; en otros entornos se pasa a mano.
export function resolveCommit(env: Record<string, string | undefined>): string {
  for (const name of ['RAILWAY_GIT_COMMIT_SHA', 'GIT_COMMIT_SHA']) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return 'dev'
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

// Payload tipa db como el adaptador genérico; en esta app siempre es el de Postgres.
function postgres(db: unknown): Pick<PostgresAdapter, 'pool'> {
  return db as PostgresAdapter
}

// Montado por Payload en /api/health, dentro de su ruta catch-all de /api.
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: (req) =>
    checkHealth({
      pingDatabase: () => postgres(req.payload.db).pool.query('select 1'),
      version: packageJson.version,
      commit: resolveCommit(process.env),
    }),
}
