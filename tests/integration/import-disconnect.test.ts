import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

it('sobrevive a la pérdida real de una conexión del importador y reconcilia la siguiente carga', async () => {
  const { stdout } = await promisify(execFile)(
    'corepack',
    ['pnpm', 'payload', 'run', 'tests/integration/fixtures/import-disconnect.ts'],
    {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL!.replace('127.0.0.1', 'localhost'),
      },
      timeout: 25_000,
      maxBuffer: 1024 * 1024,
    },
  )
  expect(stdout).toContain('RECOVERY_OK')
})

it.each([
  ['postgres://postgres:postgres@remote.invalid/ta_web', '1', /solo permite Postgres local/],
  ['postgres://postgres:postgres@localhost/otra_base', '', /solo dentro de pnpm test:integration/],
  ['postgres://postgres:postgres@localhost:54329/ta_web', '1', /base de desarrollo/],
])(
  'rechaza la inyección de fallos fuera de una base local de las pruebas (%s)',
  async (url, suite, error) => {
    await expect(
      promisify(execFile)(
        'corepack',
        ['pnpm', 'payload', 'run', 'tests/integration/fixtures/import-disconnect.ts'],
        {
          env: { ...process.env, DATABASE_URL: url, TA_WEB_INTEGRATION: suite },
          timeout: 25_000,
        },
      ),
    ).rejects.toThrow(error)
  },
)
