import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { dungeonNoteReport } from '@/lib/achievements/dungeon-report'

import { startPayload } from './payload'

// Lo que imprime `pnpm data:quests` de las notas de mazmorra de las guías publicadas:
// cuántas se casan con una mazmorra de DofusDB y cuáles no, para que Torre las corrija.

let payload: Payload

async function cleanUp() {
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { like: 'informe-mazmorras-' } },
  })
  await payload.delete({ collection: 'dungeons', where: { dofusId: { equals: 990_131 } } })
  await payload.delete({ collection: 'monsters', where: { dofusId: { equals: 990_394 } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  const kumijo = await payload.create({
    collection: 'monsters',
    data: { dofusId: 990_394, name: 'Kumijo' },
  })
  await payload.create({
    collection: 'dungeons',
    data: { dofusId: 990_131, name: 'Casa de los Espíritus', bosses: [kumijo.id] },
  })
  const guide = (slug: string, notes: string, published: boolean) =>
    payload.create({
      collection: 'quest-guides',
      data: {
        title: slug,
        slug,
        summary: { needs: { notes } },
        _status: published ? 'published' : 'draft',
      },
      draft: !published,
    })
  await guide('informe-mazmorras-uno', '1 x Mazmorra Kumijo\n1 x Combate (solo).', true)
  await guide('informe-mazmorras-dos', 'Mazmorra Kumijo\nMazmorras nivel 200', true)
  // Un borrador no cuenta: la página solo lee lo publicado.
  await guide('informe-mazmorras-tres', 'Mazmorra Inventada', false)
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('dungeonNoteReport', () => {
  it('las notas de mazmorra, una vez cada una, casadas y sin casar', async () => {
    const report = await dungeonNoteReport(payload)
    const ours = (labels: string[]) =>
      labels.filter((label) => /kumijo|nivel 200|inventada/i.test(label))
    expect(ours(report.matched.map(({ label }) => label))).toEqual(['Mazmorra Kumijo'])
    expect(report.matched.find(({ label }) => label === 'Mazmorra Kumijo')?.dungeon).toBe(
      'Casa de los Espíritus',
    )
    expect(ours(report.unmatched)).toEqual(['Mazmorras nivel 200'])
  })
})
