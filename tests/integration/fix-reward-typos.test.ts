import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { fixRewardTypos } from '@/lib/guides/reward-typos'

import { startPayload } from './payload'

// Las erratas de nombre de objeto de «Recompensas en texto»: solo cambia el nombre, por el
// de DofusDB, y se enlaza su fila; lo demás queda como lo escribió Torre.
describe('fixRewardTypos', () => {
  let payload: Payload
  let guideId: number
  let fragmentId: number
  let iceId: number
  const SLUG = 'vuelta-venenosa-prueba'
  const TEXT = '1 000 XP.\n1 x Fragmento de Ugahruleta.\n1 x Kama de hielo.\n5 x Lana de jalamut.'

  const reread = () =>
    payload.findByID({ collection: 'quest-guides', id: guideId, depth: 0, draft: true })

  beforeAll(async () => {
    payload = await startPayload()
    const fragment = await payload.create({
      collection: 'items',
      data: { dofusId: 990_961, name: 'Fragmento de Ugahlureta', typeId: 119 },
    })
    const ice = await payload.create({
      collection: 'items',
      data: { dofusId: 990_962, name: 'Kama de hielo', typeId: 15 },
    })
    fragmentId = fragment.id
    iceId = ice.id
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 990_963,
        name: 'Vuelta venenosa de prueba',
        rewards: {
          items: [
            { item: fragment.id, quantity: 1 },
            { item: ice.id, quantity: 1 },
          ],
        },
      },
    })
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Vuelta venenosa',
        slug: SLUG,
        quest: quest.id,
        _status: 'published',
        summary: { rewards: TEXT, rewardItems: [{ item: ice.id, quantity: 1 }] },
      },
    })
    guideId = guide.id
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { slug: { equals: SLUG } } })
    await payload.delete({ collection: 'quests', where: { dofusId: { equals: 990_963 } } })
    await payload.delete({
      collection: 'items',
      where: { dofusId: { in: [990_961, 990_962] } },
    })
    await payload.destroy()
  })

  it('en seco, propone la corrección y lista lo que se queda, sin escribir', async () => {
    const result = await fixRewardTypos(payload, { apply: false })
    const ours = result.typos.find((guide) => guide.slug === SLUG)
    expect(ours).toMatchObject({
      fixes: [{ before: '1 x Fragmento de Ugahruleta.', after: '1 x Fragmento de Ugahlureta.' }],
      skipped: [{ line: '5 x Lana de jalamut.', reason: 'noMatch' }],
    })
    expect((await reread()).summary?.rewards).toBe(TEXT)
  })

  it('con apply, cambia solo el nombre y enlaza su fila; lo publicado sigue publicado', async () => {
    await fixRewardTypos(payload, { apply: true })
    const { summary, _status } = await reread()
    expect(_status).toBe('published')
    expect(summary?.rewards).toBe(TEXT.replace('Ugahruleta', 'Ugahlureta'))
    expect(summary?.rewardItems?.map(({ item, quantity }) => [item, quantity])).toEqual([
      [iceId, 1],
      [fragmentId, 1],
    ])
  })

  it('repetirla no cambia nada', async () => {
    const again = await fixRewardTypos(payload, { apply: true })
    const ours = again.typos.find((guide) => guide.slug === SLUG)
    expect(ours?.fixes).toEqual([])
  })
})
