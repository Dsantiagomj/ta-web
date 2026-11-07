import { describe, expect, it } from 'vitest'

import { databaseScriptRefusal } from '@/lib/db/script-guard'

// Los scripts que escriben en la base (pnpm media:sizes, pnpm guides:fights) se niegan a
// tocar producción sin --production y una base remota sin --remote.

describe('databaseScriptRefusal', () => {
  it('en local sigue; en producción y contra una base remota pide la marca, y dice qué haría', () => {
    expect(databaseScriptRefusal({}, [], 'convertir los combates')).toBeNull()
    expect(databaseScriptRefusal({ APP_ENV: 'production' }, [], 'convertir los combates')).toBe(
      'Esto es producción: repite con --production si de verdad quieres convertir los combates.',
    )
    const remote = { DATABASE_URL: 'postgres://u:p@ep-algo.eu-central-1.aws.neon.tech/neondb' }
    expect(databaseScriptRefusal(remote, [], 'convertir los combates')).toMatch(/--remote/)
    expect(databaseScriptRefusal(remote, ['--remote'], 'convertir los combates')).toBeNull()
  })
})
