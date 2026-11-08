import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { countSiteGuides } from '@/lib/site/counts'

import { startPayload } from './payload'

// Las cifras del menú de Misiones: guías publicadas y páginas de logro publicadas, las mismas
// que el índice de metalogros.
// La base es compartida, así que se mide la diferencia con lo que ya había.
describe('las cifras de la cabecera', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  it('cuenta solo las guías publicadas y cada logro una vez', async () => {
    const before = await countSiteGuides(payload)
    const quest = (dofusId: number, achievement?: number) =>
      payload.create({
        collection: 'quests',
        data: {
          dofusId,
          name: `Misión ${dofusId}`,
          ...(achievement && {
            achievement: { dofusId: achievement, name: `Logro ${achievement}` },
          }),
        },
      })
    const guide = async (slug: string, questId: number, published: boolean) =>
      payload.create({
        collection: 'quest-guides',
        data: { title: slug, slug, quest: questId, _status: published ? 'published' : 'draft' },
        draft: !published,
      })

    const a = await quest(990001, 880001)
    const b = await quest(990002, 880001)
    const c = await quest(990003, 880002)
    const d = await quest(990004)
    const e = await quest(990005, 880003)
    await guide('cifras-a', a.id, true)
    await guide('cifras-b', b.id, true)
    await guide('cifras-c', c.id, true)
    await guide('cifras-d', d.id, true)
    await guide('cifras-borrador', e.id, false)

    const after = await countSiteGuides(payload)
    expect(after.guides - before.guides).toBe(4)
    // Los logros no salen de las misiones de las guías: son las páginas de logro.
    expect(after.achievements - before.achievements).toBe(0)
  })

  it('cuenta los logros: las páginas de logro publicadas y no En preparación', async () => {
    const before = await countSiteGuides(payload)
    const page = async (dofusId: number, state: 'published' | 'preparing', draft = false) => {
      const achievement = await payload.create({
        collection: 'achievements',
        data: { dofusId, name: `Logro ${dofusId}` },
      })
      return payload.create({
        collection: 'achievement-pages',
        data: {
          achievement: achievement.id,
          name: `Logro ${dofusId}`,
          slug: `cifras-logro-${dofusId}`,
          state,
          _status: draft ? 'draft' : 'published',
        },
        draft,
      })
    }
    await page(880101, 'published')
    await page(880102, 'published')
    await page(880103, 'preparing')
    await page(880104, 'published', true)
    const after = await countSiteGuides(payload)
    expect(after.achievements - before.achievements).toBe(2)
  })
})
