import { describe, expect, it } from 'vitest'

import { regenerationRefusal } from '@/lib/media/regenerate'

describe('regenerationRefusal', () => {
  it('en local, contra la base de pnpm db:dev, sigue', () => {
    expect(regenerationRefusal({}, [])).toBeNull()
    expect(
      regenerationRefusal(
        { DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:54329/ta_web' },
        [],
      ),
    ).toBeNull()
    expect(regenerationRefusal({ DATABASE_URL: 'postgres://u:p@localhost/ta_web' }, [])).toBeNull()
  })

  it('en producción se niega sin --production', () => {
    for (const env of [
      { APP_ENV: 'production' },
      { RAILWAY_ENVIRONMENT_NAME: 'production' },
      { NODE_ENV: 'production' },
    ]) {
      expect(regenerationRefusal(env, [])).toMatch(/--production/)
      expect(regenerationRefusal(env, ['--production'])).toBeNull()
    }
  })

  it('contra una base remota se niega sin --remote, porque puede ser la de producción', () => {
    const env = { DATABASE_URL: 'postgres://u:p@ep-algo.eu-central-1.aws.neon.tech/neondb' }
    expect(regenerationRefusal(env, [])).toMatch(/--remote/)
    expect(regenerationRefusal(env, ['--remote'])).toBeNull()
  })

  it('una base remota en producción necesita --production, no basta con --remote', () => {
    const env = {
      APP_ENV: 'production',
      DATABASE_URL: 'postgres://u:p@ep-algo.eu-central-1.aws.neon.tech/neondb',
    }
    expect(regenerationRefusal(env, ['--remote'])).toMatch(/--production/)
    expect(regenerationRefusal(env, ['--production'])).toBeNull()
  })

  it('una DATABASE_URL que no se entiende cuenta como remota', () => {
    expect(regenerationRefusal({ DATABASE_URL: 'no es una url' }, [])).toMatch(/--remote/)
  })
})
