import type { MetadataRoute } from 'next'

import { isDevEnvironment } from './dev-gate'

type Env = Record<string, string | undefined>

// robots.txt según el entorno: dev no se rastrea nunca; producción se indexa, salvo el
// panel de Payload.
export function robotsFor(env: Env): MetadataRoute.Robots {
  if (isDevEnvironment(env)) return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: '/admin' } }
}
