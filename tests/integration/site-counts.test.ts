import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { countSiteGuides } from '@/lib/site/counts'

import { startPayload } from './payload'

// Las cifras del menú de Misiones: guías publicadas y logros distintos de sus misiones.
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
    expect(after.achievements - before.achievements).toBe(2)
  })
})
