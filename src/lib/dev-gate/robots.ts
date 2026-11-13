import type { MetadataRoute } from 'next'

import { isDevEnvironment } from './dev-gate'

type Env = Record<string, string | undefined>

// robots.txt según el entorno: dev no se rastrea nunca; producción se indexa, salvo el
// panel de Payload, y anuncia /sitemap.xml con el origen público del sitio.
export function robotsFor(env: Env): MetadataRoute.Robots {
  if (isDevEnvironment(env)) return { rules: { userAgent: '*', disallow: '/' } }
  const origin = (env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${origin}/sitemap.xml`,
  }
}
