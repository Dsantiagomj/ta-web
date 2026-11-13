type Env = Record<string, string | undefined>

/**
 * El origen público del sitio, NEXT_PUBLIC_SITE_URL: metadataBase, canónicas, JSON-LD,
 * robots.txt, el sitemap y el Location de las redirecciones. Detrás del proxy de Railway la
 * petición no conoce el dominio público, así que nunca sale de la petición en producción.
 * Sin la variable, desarrollo y pruebas usan `fallback`; producción falla, como DATABASE_URL
 * (src/lib/db/database-url.ts). `next build` compila sin ella.
 */
export function siteUrl(env: Env, fallback = 'http://localhost:3000'): string {
  const url = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (url) return url
  const isBuild = env.NEXT_PHASE === 'phase-production-build'
  if (env.NODE_ENV === 'production' && !isBuild) {
    throw new Error('Falta NEXT_PUBLIC_SITE_URL: en producción no hay origen público por defecto')
  }
  return fallback.replace(/\/+$/, '')
}

/** El origen público, leído al arrancar el servidor (ver siteUrl). */
export const SITE_URL = siteUrl(process.env)
