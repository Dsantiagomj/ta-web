import { describe, expect, it } from 'vitest'

import { robotsFor } from '@/lib/dev-gate/robots'

describe('robotsFor', () => {
  it('en dev prohíbe rastrear todo', () => {
    expect(robotsFor({ APP_ENV: 'dev' })).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    expect(robotsFor({ RAILWAY_ENVIRONMENT_NAME: 'dev' })).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    })
  })

  it('en producción permite indexar la web pero no el panel, y apunta al sitemap', () => {
    expect(
      robotsFor({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://www.torrentearcano.com/',
      }),
    ).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/admin' },
      sitemap: 'https://www.torrentearcano.com/sitemap.xml',
    })
    expect(robotsFor({ NODE_ENV: 'test' })).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/admin' },
      sitemap: 'http://localhost:3000/sitemap.xml',
    })
  })

  it('en producción sin NEXT_PUBLIC_SITE_URL falla en vez de anunciar localhost', () => {
    expect(() => robotsFor({ NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('en dev no anuncia el sitemap: nada se rastrea', () => {
    expect(
      robotsFor({ APP_ENV: 'dev', NEXT_PUBLIC_SITE_URL: 'https://dev.example' }),
    ).not.toHaveProperty('sitemap')
  })
})
