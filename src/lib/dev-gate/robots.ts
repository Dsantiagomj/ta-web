import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site/origin'

import { isDevEnvironment } from './dev-gate'

type Env = Record<string, string | undefined>

// robots.txt según el entorno: dev no se rastrea nunca; producción se indexa, salvo el
// panel de Payload, y anuncia /sitemap.xml con el origen público del sitio.
export function robotsFor(env: Env): MetadataRoute.Robots {
  if (isDevEnvironment(env)) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${siteUrl(env)}/sitemap.xml`,
  }
}
