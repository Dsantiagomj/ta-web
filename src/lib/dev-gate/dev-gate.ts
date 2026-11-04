import { createHash, timingSafeEqual } from 'node:crypto'

import { devGateStrings } from './strings'

type Env = Record<string, string | undefined>

// Puerta del entorno de desarrollo (docs/legacy/infra.md, sección 7): basic auth en todo el
// sitio y noindex. Se activa con APP_ENV=dev o en el entorno `dev` de Railway; en
// producción, en local y en CI no hace nada.

export const NOINDEX_HEADER = 'noindex, nofollow'

// Sin credenciales: la comprobación de salud solo dice ok o error y no lleva secretos,
// y así los monitores de disponibilidad no necesitan la contraseña. Ruta exacta.
export const DEV_GATE_EXEMPT_PATHS = ['/api/health'] as const

export type DevGateDecision =
  | { kind: 'open' } // fuera de dev
  | { kind: 'allow' } // dev, con credenciales correctas o ruta exenta
  | { kind: 'challenge' } // dev, sin credenciales o incorrectas: 401
  | { kind: 'misconfigured' } // dev sin usuario o contraseña configurados: 503

export function isDevEnvironment(env: Env): boolean {
  return [env.APP_ENV, env.RAILWAY_ENVIRONMENT_NAME].some(
    (value) => value?.trim().toLowerCase() === 'dev',
  )
}

export function decideDevGate({
  env,
  pathname,
  authorization,
}: {
  env: Env
  pathname: string
  authorization: string | null
}): DevGateDecision {
  if (!isDevEnvironment(env)) return { kind: 'open' }
  if ((DEV_GATE_EXEMPT_PATHS as readonly string[]).includes(pathname)) return { kind: 'allow' }

  const expectedUser = env.DEV_BASIC_AUTH_USER
  const expectedPassword = env.DEV_BASIC_AUTH_PASSWORD
  // Mejor un 503 que servir el entorno sin protección por un olvido.
  if (!expectedUser?.trim() || !expectedPassword?.trim()) return { kind: 'misconfigured' }

  const given = parseBasicAuth(authorization)
  if (!given) return { kind: 'challenge' }
  // Se comparan siempre los dos, para no delatar cuál de ellos falló por el tiempo.
  const userOk = safeEqual(given.user, expectedUser)
  const passwordOk = safeEqual(given.password, expectedPassword)
  return userOk && passwordOk ? { kind: 'allow' } : { kind: 'challenge' }
}

export function devGateResponse(decision: { kind: 'challenge' | 'misconfigured' }): Response {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Robots-Tag': NOINDEX_HEADER,
  }
  if (decision.kind === 'misconfigured') {
    return new Response(devGateStrings.unavailable, { status: 503, headers })
  }
  headers['WWW-Authenticate'] = `Basic realm="${devGateStrings.realm}", charset="UTF-8"`
  return new Response(devGateStrings.unauthorized, { status: 401, headers })
}

function parseBasicAuth(header: string | null): { user: string; password: string } | undefined {
  const match = header?.match(/^basic\s+([A-Za-z0-9+/=]+)\s*$/i)
  if (!match) return undefined
  let decoded: string
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8')
  } catch {
    return undefined
  }
  const separator = decoded.indexOf(':')
  if (separator === -1) return undefined
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) }
}

// Tiempo constante: se comparan los hashes, que siempre miden lo mismo, para que ni la
// longitud ni el primer carácter distinto se noten en el tiempo de respuesta.
function safeEqual(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()
  return timingSafeEqual(digest(given), digest(expected))
}
