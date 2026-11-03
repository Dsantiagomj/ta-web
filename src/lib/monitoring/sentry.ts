import { deployedCommit } from '../deploy/commit'
import { isDevEnvironment } from '../dev-gate/dev-gate'

type Env = Record<string, string | undefined>

export type SentryEnvironment = 'dev' | 'production'

export type SentryServerOptions = {
  dsn: string
  environment: SentryEnvironment
  release?: string
  sendDefaultPii: false
}

// Entorno desplegado: el mismo criterio que la puerta de dev para "dev"; "production"
// por APP_ENV o por el RAILWAY_ENVIRONMENT_NAME que inyecta Railway. Local, CI o un
// entorno desconocido: undefined.
function deployedEnvironment(env: Env): SentryEnvironment | undefined {
  if (isDevEnvironment(env)) return 'dev'
  const isProduction = [env.APP_ENV, env.RAILWAY_ENVIRONMENT_NAME].some(
    (value) => value?.trim().toLowerCase() === 'production',
  )
  return isProduction ? 'production' : undefined
}

/**
 * Opciones del SDK de Sentry en el servidor, o undefined si no debe arrancar: hace falta
 * SENTRY_DSN y un entorno desplegado (dev o production), así que en local y en CI no se
 * envía nada.
 *
 * Solo errores: sin tracesSampleRate. Con cualquier valor, incluso 0, el SDK monta la
 * instrumentación de trazas en cada petición; sin él no la monta ni gasta cuota de
 * transacciones. Si hacen falta trazas, se añade más adelante con un valor pequeño.
 */
export function sentryServerOptions(env: Env): SentryServerOptions | undefined {
  const dsn = env.SENTRY_DSN?.trim()
  if (!dsn) return undefined
  const environment = deployedEnvironment(env)
  if (!environment) return undefined

  const release = deployedCommit(env)
  return {
    dsn,
    environment,
    ...(release ? { release } : {}),
    // Sin IP, cookies ni cabeceras de los visitantes.
    sendDefaultPii: false,
  }
}
