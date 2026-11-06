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
  ['postgres://postgres:postgres@remote.invalid/ta_web', /solo permite Postgres local/],
  ['postgres://postgres:postgres@localhost/otra_base', /Base de pruebas no permitida/],
])(
  'rechaza la inyección de fallos fuera de las bases locales permitidas (%s)',
  async (url, error) => {
    await expect(
      promisify(execFile)(
        'corepack',
        ['pnpm', 'payload', 'run', 'tests/integration/fixtures/import-disconnect.ts'],
        { env: { ...process.env, DATABASE_URL: url }, timeout: 25_000 },
      ),
    ).rejects.toThrow(error)
  },
)
