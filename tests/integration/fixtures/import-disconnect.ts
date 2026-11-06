import assert from 'node:assert/strict'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '../../../src/payload.config'
import { isLocalDatabaseUrl } from '../../../src/lib/db/database-url'
import { loadQuestGuides } from '../../../scripts/import/load-quest-guides'
import type { ConvertedGuide } from '../../../scripts/import/squarespace/to-quest-guide'
import { tinyPng } from '../payload'

const url = new URL(process.env.DATABASE_URL!)
assert.ok(isLocalDatabaseUrl(url.href), 'La inyección de fallos solo permite Postgres local')
assert.ok(['/ta_web_integration', '/ta_web'].includes(url.pathname), 'Base de pruebas no permitida')
const payload = await getPayload({ config })
const adapter = payload.db as unknown as PostgresAdapter
const slug = 'prueba-desconexion-importador'
const originalUrl = 'https://images.squarespace-cdn.com/prueba-desconexion.png'
const guide: ConvertedGuide = {
  oddities: [],
  guide: {
    slug,
    title: 'Prueba de desconexión',
    originalUrl: `https://www.torrentearcano.com/${slug}`,
    questDofusIds: [],
    summary: {},
    body: [{ blockType: 'image', url: originalUrl, alt: 'Prueba' }],
  },
}
const completed: ConvertedGuide = {
  ...guide,
  guide: { ...guide.guide, slug: `${slug}-terminada`, body: [] },
}
const slugs = [completed.guide.slug, slug, `${slug}-descarga`]
let failedPid = 0
let disconnect = true
payload.collections.media.config.hooks.beforeChange.push(async ({ req, data }) => {
  if (!disconnect || data.originalUrl !== originalUrl) return data
  disconnect = false
  const id = await req.transactionID
  assert.ok(id)
  const session = adapter.sessions[id]!
  const result = await session.db.execute(sql`select pg_backend_pid() as pid`)
  failedPid = Number(result.rows[0]!.pid)
  // No se escucha error aquí: queremos detectar el fallo real del cliente sin manejador.
  const client = (session.db as unknown as { session: { client: NodeJS.EventEmitter } }).session
    .client
  const ended = new Promise<void>((resolve) => client.once('end', resolve))
  await adapter.pool.query('select pg_terminate_backend($1)', [failedPid])
  await ended
  return data
})
try {
  await payload.delete({ collection: 'quest-guides', where: { slug: { in: slugs } } })
  await payload.delete({ collection: 'media', where: { originalUrl: { equals: originalUrl } } })
  for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED']) {
    const downloadGuide: ConvertedGuide = {
      ...guide,
      guide: {
        ...guide.guide,
        slug: `${slug}-descarga`,
        body: [{ blockType: 'image', url: `${originalUrl}?descarga`, alt: 'Prueba' }],
      },
    }
    const result = await loadQuestGuides(payload, [downloadGuide], {
      fetchImage: async () => {
        throw Object.assign(new Error('Descarga interrumpida'), { code })
      },
    })
    assert.match(result.oddities[downloadGuide.guide.slug]!.join('\n'), /Imagen sin importar/)
  }
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { equals: `${slug}-descarga` } },
  })
  const load = () =>
    loadQuestGuides(payload, [completed, guide], { fetchImage: async () => tinyPng() })
  await assert.rejects(load(), /conexi|connection|queryable|terminat|fetch/i)
  assert.deepEqual(Object.keys(adapter.sessions), [])
  assert.equal(
    (await payload.count({ collection: 'media', where: { originalUrl: { equals: originalUrl } } }))
      .totalDocs,
    0,
  )
  assert.equal(
    (await payload.count({ collection: 'quest-guides', where: { slug: { in: slugs } } })).totalDocs,
    1,
  )
  assert.deepEqual((await load()).guides, { created: 1, updated: 0, unchanged: 1, skipped: 0 })
  assert.equal((await load()).guides.unchanged, 2)
  assert.equal(
    (await payload.count({ collection: 'media', where: { originalUrl: { equals: originalUrl } } }))
      .totalDocs,
    1,
  )
  assert.equal(
    (
      await adapter.pool.query('select count(*)::int as n from pg_stat_activity where pid=$1', [
        failedPid,
      ])
    ).rows[0].n,
    0,
  )
  console.log('RECOVERY_OK: transacción fallida, conexión retirada, guía e imagen reconciliadas')
} finally {
  await payload.delete({ collection: 'quest-guides', where: { slug: { in: slugs } } })
  await payload.delete({ collection: 'media', where: { originalUrl: { equals: originalUrl } } })
  await payload.destroy()
}
