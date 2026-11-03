import type { init } from '@sentry/nextjs'

import { deployedCommit } from '../deploy/commit'
import { isDevEnvironment } from '../dev-gate/dev-gate'

type Env = Record<string, string | undefined>

export type SentryEnvironment = 'dev' | 'production'

// Las opciones que acepta Sentry.init: así el chequeo de tipos avisa si el SDK quita o
// renombra una opción, como pasó con sendDefaultPii en la versión 11.
type SdkOptions = NonNullable<Parameters<typeof init>[0]>
type DataCollection = NonNullable<SdkOptions['dataCollection']>

export type SentryServerOptions = SdkOptions & {
  dsn: string
  environment: SentryEnvironment
  dataCollection: DataCollection
}

// Nada de los visitantes ni del contenido: ni usuario (incluida la IP), cookies,
// cabeceras, cuerpos o query params de las peticiones, ni datos de consultas, colas o
// GraphQL, ni variables locales de la pila, donde puede haber datos de miembros o
// secretos. Sentry 11 lo recoge todo por defecto; aquí se apaga categoría por categoría.
const DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
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
    dataCollection: DATA_COLLECTION,
  }
}
