import { isDevEnvironment } from '@/lib/dev-gate/dev-gate'

type Env = Record<string, string | undefined>

/** Si Torre está en directo y con qué título, cuando se sepa. */
export interface LiveState {
  live: boolean
  title?: string
}

/**
 * El worker de Cloudflare de Torre que pregunta a Twitch si está en directo. Responde
 * `{"live":false,"channel":"torrentearcano","url":"…"}` con `max-age=120`; en directo trae
 * además, cabe esperar, el título del directo (`title`).
 */
export const TWITCH_LIVE_URL = 'https://torrente-twitch-live.torrentearcano.workers.dev/'

/**
 * Cada cuántos segundos se vuelve a preguntar al worker (unstable_cache en site-data.ts). Con
 * los 120 s de caché del propio worker, un directo que empieza sale en la portada en 3 minutos
 * como mucho.
 */
export const LIVE_REVALIDATE = 60

/** Cuánto se espera al worker antes de dar el directo por apagado. */
export const LIVE_TIMEOUT_MS = 2000

/**
 * La URL del worker: TWITCH_LIVE_URL la cambia y `off` la apaga (las pruebas E2E y Lighthouse
 * no salen a la red). Vacía o sin definir, la de Torre.
 */
export function liveUrl(env: Env): string | null {
  const value = env.TWITCH_LIVE_URL?.trim()
  if (!value) return TWITCH_LIVE_URL
  return value.toLowerCase() === 'off' ? null : value
}

const OFFLINE: LiveState = { live: false }

/** Lo que dice el worker, sin fiarse de su forma: solo `live: true` cuenta como directo. */
export function parseLiveResponse(body: unknown): LiveState {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return OFFLINE
  const { live, title } = body as Record<string, unknown>
  if (live !== true) return OFFLINE
  const name = typeof title === 'string' ? title.trim() : ''
  return name ? { live: true, title: name } : { live: true }
}

/**
 * Pregunta al worker. Nunca lanza: un error de red, una respuesta que no es 2xx, un JSON roto
 * o un worker que tarda más de `timeoutMs` dan «no está en directo», así la página no se rompe.
 */
export async function fetchLiveState(
  url: string | null,
  {
    fetch: fetcher = fetch,
    timeoutMs = LIVE_TIMEOUT_MS,
  }: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<LiveState> {
  if (!url) return OFFLINE
  try {
    const res = await fetcher(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return OFFLINE
    return parseLiveResponse(await res.json())
  } catch {
    return OFFLINE
  }
}

/**
 * El directo de Torre en la portada. En desarrollo y en el entorno dev, ?directo=1 lo simula
 * sin preguntar al worker; en producción no hace nada. Si no, lo que dé `read`, la lectura en
 * caché del worker (loadLiveState en src/app/(frontend)/site-data.ts).
 */
export async function liveState(
  simulate: string | string[] | undefined,
  env: Env,
  read: () => Promise<LiveState>,
): Promise<LiveState> {
  const devOnly = env.NODE_ENV === 'development' || isDevEnvironment(env)
  if (devOnly && simulate === '1') return { live: true }
  return read()
}
