import { describe, expect, it } from 'vitest'

import { siteUrl } from '@/lib/site/origin'

// El origen público del sitio (NEXT_PUBLIC_SITE_URL): metadataBase, canónicas, JSON-LD,
// robots.txt, el sitemap y el Location de las redirecciones. Detrás del proxy de Railway
// la petición no conoce el dominio público.
describe('siteUrl', () => {
  it('usa NEXT_PUBLIC_SITE_URL, sin barra final ni espacios', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: ' https://www.torrentearcano.com/ ' })).toBe(
      'https://www.torrentearcano.com',
    )
  })

  it('en desarrollo y pruebas, sin la variable, localhost o el origen que se le pase', () => {
    expect(siteUrl({})).toBe('http://localhost:3000')
    expect(siteUrl({ NODE_ENV: 'development' }, 'http://localhost:3147')).toBe(
      'http://localhost:3147',
    )
  })

  it('en producción, sin la variable, falla: nunca canónicas ni redirecciones a localhost', () => {
    expect(() => siteUrl({ NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
    expect(() => siteUrl({ NODE_ENV: 'production' }, 'http://10.0.0.5:8080')).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    )
  })

  it('el build compila sin la variable', () => {
    expect(siteUrl({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).toBe(
      'http://localhost:3000',
    )
  })
})
