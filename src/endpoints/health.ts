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

// Una sola comprobación de la base a la vez: si se cuelga, los monitores que siguen
// preguntando esperan a la que ya está en marcha en vez de abrir más conexiones. Se
// comparte el resultado, no la Response: su cuerpo solo se puede leer una vez.
let inFlight: Promise<boolean> | undefined

export async function checkHealth({
  pingDatabase,
  version,
  commit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CheckHealthOptions): Promise<Response> {
  inFlight ??= databaseIsUp(pingDatabase, timeoutMs).finally(() => {
    inFlight = undefined
  })
  const headers = { 'Cache-Control': 'no-store' }
  if (await inFlight) {
    return Response.json({ status: 'ok', db: 'ok', version, commit }, { status: 200, headers })
  }
  // El detalle del fallo se queda fuera: puede llevar la URL de la base.
  return Response.json({ status: 'error', db: 'error' }, { status: 503, headers })
}

async function databaseIsUp(pingDatabase: () => Promise<unknown>, timeoutMs: number) {
  try {
    await withTimeout(pingDatabase(), timeoutMs)
    return true
  } catch {
    return false
  }
}

type PoolClientLike = {
  query: (text: string) => Promise<unknown>
  release: (destroy?: boolean) => void
}
type PoolLike = { connect: () => Promise<PoolClientLike> }

/**
 * `select 1` con plazo en las dos puntas: Postgres corta la consulta con un
 * statement_timeout local a la transacción, y si aun así se pasa del plazo (o la conexión llega tarde), la
 * conexión se descarta en vez de volver al pool ocupada.
 */
export async function pingPool(pool: PoolLike, timeoutMs: number): Promise<void> {
  let timedOut = false
  const acquiring = pool.connect()
  let client: PoolClientLike
  try {
    client = await withTimeout(acquiring, timeoutMs, () => {
      timedOut = true
    })
  } catch (error) {
    // La conexión puede llegar después del plazo: se descarta al llegar.
    if (timedOut) acquiring.then((late) => late.release(true)).catch(() => {})
    throw error
  }
  let healthy = false
  try {
    await withTimeout(
      (async () => {
        // set local: el límite muere con la transacción y no se queda en la conexión
        await client.query('begin')
        await client.query(`set local statement_timeout = '${timeoutMs}ms'`)
        await client.query('select 1')
        await client.query('commit')
      })(),
      timeoutMs,
    )
    healthy = true
  } finally {
    // Una conexión que falló o se pasó del plazo no vuelve al pool.
    if (healthy) client.release()
    else client.release(true)
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error('timeout'))
    }, timeoutMs)
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
      pingDatabase: () => pingPool(postgres(req.payload.db).pool, DEFAULT_TIMEOUT_MS),
      version: packageJson.version,
      commit: resolveCommit(process.env),
    }),
}
