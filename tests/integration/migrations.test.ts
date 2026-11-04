import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { migrations } from '../../src/migrations'
import { integrationEnv } from './env'

function payloadCli(command: string): string {
  try {
    return execFileSync('pnpm', ['payload', command], {
      env: { ...process.env, ...integrationEnv(process.env), DATABASE_CONNECTION: 'direct' },
      encoding: 'utf8',
      stdio: 'pipe',
    })
  } catch (error) {
    // Sin esto, el fallo solo dice "Command failed" y esconde el error de Postgres
    const { stdout, stderr } = error as { stdout?: string; stderr?: string }
    throw new Error(`payload ${command} falló:\n${stdout ?? ''}\n${stderr ?? ''}`)
  }
}

// Cada migración se puede revertir: si un `down` falla, un despliegue malo no tiene
// vuelta atrás. Se usa la CLI de Payload, como en producción, porque importa las
// migraciones con Node y no con Vitest. `migrate:down` revierte el último lote (todas
// las migraciones de la base de pruebas, de la más nueva a la más vieja) y `migrate`
// las vuelve a aplicar, así que la base queda como estaba. No se usa
// `migrate:refresh`: en Payload 3.92 revierte de la más vieja a la más nueva y falla.
describe('migraciones', () => {
  it('se revierten y se vuelven a aplicar', () => {
    const latest = migrations.at(-1)!.name

    const down = payloadCli('migrate:down')
    expect(down).toContain(latest)

    const up = payloadCli('migrate')
    expect(up).toContain(`Migrated:  ${latest}`)
    // Arranca la CLI de Payload dos veces; con la máquina cargada pasa de los 30 s por defecto.
  }, 120_000)
})
