import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '@/migrations/20261104_195910_needs_list'

import { startPayload } from './payload'

// La migración que pasa Necesitarás de texto a lista no pierde el texto de las guías
// importadas: queda en las notas, por idioma, en la guía y en sus versiones. Se llaman
// down y up de esta migración sobre la base de pruebas, ya migrada del todo.
describe('migración de Necesitarás a lista', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.destroy()
  })

  it('el texto de Necesitarás pasa a las notas y vuelve al revertir', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'El cazador cazado',
        slug: 'el-cazador-cazado-migracion',
        summary: { needs: { notes: 'Literalmente nada xD.' } },
      },
      draft: true,
    })
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const args = { db, payload, req: {} as PayloadRequest }
    const textIn = async (table: string, column: string, parent: string) => {
      const { rows } = await db.execute(
        sql`select ${sql.identifier(column)} as text from ${sql.identifier(table)}
            where ${sql.identifier(parent)} = ${guide.id}`,
      )
      return rows.map((row) => row.text)
    }

    let reverted = false
    try {
      await down(args)
      reverted = true
      // Con el esquema anterior, el texto está en la columna de texto de antes
      expect(await textIn('quest_guides_locales', 'summary_needs', '_parent_id')).toEqual([
        'Literalmente nada xD.',
      ])
      // Una guía importada antes de la lista, con otro texto
      await db.execute(
        sql`update quest_guides_locales set summary_needs = '1 x Combate (solo).'
            where _parent_id = ${guide.id}`,
      )
      await db.execute(
        sql`update _quest_guides_v_locales set version_summary_needs = '1 x Combate (solo).'
            where _parent_id in (select id from _quest_guides_v where parent_id = ${guide.id})`,
      )
    } finally {
      if (reverted) await up(args)
    }

    const migrated = await payload.findByID({
      collection: 'quest-guides',
      id: guide.id,
      draft: true,
    })
    expect(migrated.summary?.needs).toMatchObject({ notes: '1 x Combate (solo).', items: [] })
    const versions = await payload.findVersions({
      collection: 'quest-guides',
      where: { parent: { equals: guide.id } },
    })
    expect(versions.docs.map((version) => version.version.summary?.needs?.notes)).toEqual([
      '1 x Combate (solo).',
    ])
  })
})
