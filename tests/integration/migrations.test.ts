import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { migrations } from '../../src/migrations'
import { integrationEnv } from './env'
import { startPayload } from './payload'

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
  // Con filas que usan los valores nuevos de un enum (un tramo «Nota», un logro «Hasta una
  // misión»): revertir la migración que los añadió no puede fallar al volver al enum de antes.
  it('se revierten aunque haya filas con los valores nuevos de los tramos y logros', async () => {
    const payload = await startPayload()
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: 996_001, name: 'Logro de la migración' },
      overrideAccess: true,
    })
    const created = await payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist de la migración',
        slug: 'prueba-migracion-enums',
        order: 96,
        state: 'preparing',
        steps: [
          {
            segments: [{ kind: 'note', text: 'Una nota de la guía.' }],
            achievements: [{ achievement: achievement.id, mode: 'upto', on: [1] }],
          },
        ],
        _status: 'published',
      },
      overrideAccess: true,
    })
    try {
      const down = payloadCli('migrate:down')
      expect(down).toContain(migrations.at(-1)!.name)
      payloadCli('migrate')
    } finally {
      // Revertir todas las migraciones ya borró las filas: se limpia lo que quede, si queda.
      await payload.delete({
        collection: 'checklists',
        where: { id: { equals: created.id } },
        overrideAccess: true,
      })
      await payload.delete({
        collection: 'achievements',
        where: { id: { equals: achievement.id } },
        overrideAccess: true,
      })
      await payload.destroy()
    }
  }, 180_000)

  it('se revierten y se vuelven a aplicar', () => {
    const latest = migrations.at(-1)!.name

    const down = payloadCli('migrate:down')
    expect(down).toContain(latest)

    const up = payloadCli('migrate')
    expect(up).toContain(`Migrated:  ${latest}`)
    // Arranca la CLI de Payload dos veces; con la máquina cargada pasa de los 30 s por defecto.
  }, 120_000)
})
