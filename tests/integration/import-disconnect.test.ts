import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

it('sobrevive a la pérdida real de una conexión del importador y reconcilia la siguiente carga', async () => {
  const { stdout } = await promisify(execFile)(
    'corepack',
    ['pnpm', 'payload', 'run', 'tests/integration/fixtures/import-disconnect.ts'],
    {
      env: process.env,
      timeout: 25_000,
      maxBuffer: 1024 * 1024,
    },
  )
  expect(stdout).toContain('RECOVERY_OK')
})
