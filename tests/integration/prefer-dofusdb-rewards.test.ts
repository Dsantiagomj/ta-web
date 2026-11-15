import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { preferDofusDbRewards } from '@/lib/guides/prefer-dofusdb'

import { startPayload } from './payload'

// Las cifras de recompensa de Torre a un 10 % o menos de las de DofusDB pasan a las de
// DofusDB; las demás se quedan. «Recompensas en texto» no se toca.
describe('preferDofusDbRewards', () => {
  let payload: Payload
  let guideId: number
  const TEXT = '250 000 XP.\n1 000 kamas.\n95 x Perla.'

  const reread = () =>
    payload.findByID({ collection: 'quest-guides', id: guideId, depth: 0, draft: true })

  beforeAll(async () => {
    payload = await startPayload()
    const pearl = await payload.create({
      collection: 'items',
      data: { dofusId: 990_951, name: 'Perla', typeId: 47 },
    })
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 990_952,
        name: 'Misión de prueba del margen',
        rewards: {
          experience: 242_160,
          experienceMin: 129_600,
          kamas: 4760,
          items: [{ item: pearl.id, quantity: 100 }],
          byLevel: [
            { levelMin: 1, levelMax: 109, experience: 1_329_586, kamas: 14_041, items: [] },
            { levelMin: 110, levelMax: 200, experience: 2_750_000, kamas: 43_980, items: [] },
          ],
        },
      },
    })
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Guía de prueba del margen',
        slug: 'guia-prueba-margen',
        quest: quest.id,
        _status: 'published',
        summary: {
          rewards: TEXT,
          rewardExperience: 250_000,
          rewardKamas: 1000,
          rewardItems: [{ item: pearl.id, quantity: 95 }],
          rewardLevels: [
            { levelMin: 1, levelMax: 109, experience: 1_300_000, kamas: 14_041, items: [] },
            { levelMin: 110, levelMax: 200, experience: 2_750_000, kamas: 60_000, items: [] },
          ],
        },
      },
    })
    guideId = guide.id
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'quest-guides',
      where: { slug: { equals: 'guia-prueba-margen' } },
    })
    await payload.delete({ collection: 'quests', where: { dofusId: { equals: 990_952 } } })
    await payload.delete({ collection: 'items', where: { dofusId: { equals: 990_951 } } })
    await payload.destroy()
  })

  it('en seco, cuenta lo que haría sin escribir', async () => {
    const result = await preferDofusDbRewards(payload, { apply: false })
    const ours = result.preferences.find((guide) => guide.slug === 'guia-prueba-margen')
    expect(ours?.switched.map((entry) => [entry.field, entry.level ?? null])).toEqual([
      ['XP', null],
      ['objeto', null],
      ['XP', 'Nivel 1 a 109'],
    ])
    expect(ours?.kept.map((entry) => [entry.field, entry.level ?? null])).toEqual([
      ['kamas', null],
      ['kamas', 'Nivel 110 a 200'],
    ])
    expect((await reread()).summary?.rewardExperience).toBe(250_000)
  })

  it('con apply, guarda las de DofusDB, deja las de Torre lejanas y su texto tal cual', async () => {
    await preferDofusDbRewards(payload, { apply: true })
    const { summary, _status } = await reread()
    expect(_status).toBe('published')
    expect(summary).toMatchObject({
      rewards: TEXT,
      rewardExperience: 242_160,
      rewardExperienceMin: 129_600,
      rewardKamas: 1000,
      rewardItems: [{ quantity: 100 }],
    })
    expect(summary?.rewardLevels?.map((row) => [row.experience, row.kamas])).toEqual([
      [1_329_586, 14_041],
      [2_750_000, 60_000],
    ])
  })

  it('repetirla no cambia nada', async () => {
    const again = await preferDofusDbRewards(payload, { apply: true })
    const ours = again.preferences.find((guide) => guide.slug === 'guia-prueba-margen')
    expect(ours?.update).toEqual({})
    expect(ours?.switched).toEqual([])
  })
})
