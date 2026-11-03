import { describe, expect, it } from 'vitest'

import { robotsFor } from '@/lib/dev-gate/robots'

describe('robotsFor', () => {
  it('en dev prohíbe rastrear todo', () => {
    expect(robotsFor({ APP_ENV: 'dev' })).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    expect(robotsFor({ RAILWAY_ENVIRONMENT_NAME: 'dev' })).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    })
  })

  it('en producción permite indexar la web pero no el panel', () => {
    expect(robotsFor({ RAILWAY_ENVIRONMENT_NAME: 'production' })).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    })
    expect(robotsFor({})).toEqual({ rules: { userAgent: '*', allow: '/', disallow: '/admin' } })
  })
})
