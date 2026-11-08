import { isDevEnvironment } from '@/lib/dev-gate/dev-gate'

type Env = Record<string, string | undefined>

/** Si Torre está en directo y con qué título, cuando se sepa. */
export interface LiveState {
  live: boolean
  title?: string
}

/**
 * El directo de Torre. Aún no se lee la API de Twitch (planeado en src/globals/), así que,
 * como en el pie, nunca está en directo. En desarrollo y en el entorno dev, ?directo=1 lo
 * simula para ver la portada en ese estado; en producción no hace nada.
 */
export function liveState(simulate: string | string[] | undefined, env: Env): LiveState {
  const devOnly = env.NODE_ENV === 'development' || isDevEnvironment(env)
  return devOnly && simulate === '1' ? { live: true } : { live: false }
}
