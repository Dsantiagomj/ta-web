import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '@/migrations/20261114_011851_users_roles'

import { createPanelUser, startPayload } from './payload'

// Los papeles del panel (backlog A-15): nadie pierde acceso en dev ni en producción. Las
// cuentas que ya existen salen administradoras; las que se creen después, editoras. Se
// llaman down y up de esta migración sobre la base de pruebas, ya migrada del todo.
describe('migración de los papeles de users', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  afterAll(async () => {
    await payload.destroy()
  })

  it('las cuentas que ya existen salen administradoras y las nuevas, editoras', async () => {
    const existing = await createPanelUser(payload, 'editor')
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const args = { db, payload, req: {} as PayloadRequest }

    await down(args)
    await up(args)

    const { rows } = await db.execute(sql`select role from users where id = ${existing.id}`)
    expect(rows).toEqual([{ role: 'admin' }])

    const { rows: inserted } = await db.execute(
      sql`insert into users (email, updated_at, created_at)
          values ('migracion-papeles@torrentearcano.test', now(), now()) returning id, role`,
    )
    expect(inserted[0]!.role).toBe('editor')
    await db.execute(sql`delete from users where id = ${inserted[0]!.id}`)
  })
})
