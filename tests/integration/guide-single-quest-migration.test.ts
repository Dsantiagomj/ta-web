import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '@/migrations/20261104_210644_guide_single_quest'
import type { Quest } from '@/payload-types'

import { startPayload } from './payload'

const DOFUS_IDS = [990_001, 990_002]

// La migración que deja una sola misión por guía no pierde el enlace: cada guía y cada
// versión se queda con su primera misión. Se llaman down y up de esta migración sobre la
// base de pruebas, ya migrada del todo.
describe('migración a una sola misión por guía', () => {
  let payload: Payload

  async function cleanUp() {
    await payload.delete({
      collection: 'quest-guides',
      where: { slug: { equals: 'una-mision-migracion' } },
    })
    await payload.delete({ collection: 'quests', where: { dofusId: { in: DOFUS_IDS } } })
  }

  beforeAll(async () => {
    payload = await startPayload()
    await cleanUp()
  })

  afterAll(async () => {
    await cleanUp()
    await payload.destroy()
  })

  it('la misión pasa de las filas de relación a la columna y vuelve al revertir', async () => {
    const [hunter, other] = (await Promise.all(
      DOFUS_IDS.map((dofusId, index) =>
        payload.create({
          collection: 'quests',
          data: { dofusId, name: `Misión ${index + 1}` },
        }),
      ),
    )) as [Quest, Quest]
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'El cazador cazado', slug: 'una-mision-migracion', quest: hunter.id },
      draft: true,
    })
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const args = { db, payload, req: {} as PayloadRequest }
    const versionIds = sql`select id from _quest_guides_v where parent_id = ${guide.id}`
    const linkedIn = async (table: string, path: string, parents: ReturnType<typeof sql>) => {
      const { rows } = await db.execute(
        sql`select quests_id from ${sql.identifier(table)}
            where path = ${path} and parent_id in (${parents}) order by "order"`,
      )
      return rows.map((row) => row.quests_id)
    }

    let reverted = false
    try {
      await down(args)
      reverted = true
      // Con el esquema anterior, la misión es una fila de relación, en la guía y en su versión
      expect(await linkedIn('quest_guides_rels', 'quests', sql`${guide.id}`)).toEqual([hunter.id])
      expect(await linkedIn('_quest_guides_v_rels', 'version.quests', versionIds)).toEqual([
        hunter.id,
      ])
      // Una guía con una segunda misión detrás: se queda la primera
      await db.execute(
        sql`insert into quest_guides_rels ("order", parent_id, path, quests_id)
            values (2, ${guide.id}, 'quests', ${other.id})`,
      )
      await db.execute(
        sql`insert into _quest_guides_v_rels ("order", parent_id, path, quests_id)
            select 2, id, 'version.quests', ${other.id} from _quest_guides_v
            where parent_id = ${guide.id}`,
      )
    } finally {
      if (reverted) await up(args)
    }

    const { rows: guideRows } = await db.execute(
      sql`select quest_id from quest_guides where id = ${guide.id}`,
    )
    expect(guideRows.map((row) => row.quest_id)).toEqual([hunter.id])
    const { rows: versionRows } = await db.execute(
      sql`select version_quest_id from _quest_guides_v where parent_id = ${guide.id}`,
    )
    expect(versionRows.map((row) => row.version_quest_id)).toEqual([hunter.id])

    const migrated = await payload.findByID({
      collection: 'quest-guides',
      id: guide.id,
      depth: 0,
      draft: true,
    })
    expect(migrated.quest).toBe(hunter.id)
    const versions = await payload.findVersions({
      collection: 'quest-guides',
      where: { parent: { equals: guide.id } },
      depth: 0,
    })
    expect(versions.docs.map((version) => version.version.quest)).toEqual([hunter.id])
  })
})
