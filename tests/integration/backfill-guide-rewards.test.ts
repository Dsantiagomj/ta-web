import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { backfillGuideRewards } from '@/lib/guides/backfill-rewards'

import { startPayload } from './payload'

// La carga de una vez de las recompensas en campos: las cifras de Torre de su texto y, donde
// no hay, las de DofusDB. Nunca cambia un campo que ya tiene valor.
describe('backfillGuideRewards', () => {
  let payload: Payload
  let antennaId: number
  let street: number
  let published: number
  let draft: number
  let edited: number

  const reread = (id: number, draftVersion = false) =>
    payload.findByID({ collection: 'quest-guides', id, depth: 0, draft: draftVersion })

  beforeAll(async () => {
    payload = await startPayload()
    const antenna = await payload.create({
      collection: 'items',
      data: { dofusId: 990_901, name: 'Antenas de vilinsekto', typeId: 47 },
    })
    antennaId = antenna.id
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 990_979,
        name: 'Combate de calle',
        rewards: {
          experience: 242_160,
          experienceMin: 129_600,
          kamas: 4760,
          items: [{ item: antenna.id, quantity: 4 }],
        },
      },
    })
    street = quest.id
    // Guías de antes de los campos: sin recompensas en ellos, solo el texto de Torre.
    const guide = async (slug: string, status: 'published' | 'draft', summary: object) => {
      const created = await payload.create({
        collection: 'quest-guides',
        data: { title: slug, slug, quest: street, _status: status },
        draft: status === 'draft',
      })
      // Vacía lo que rellenó DofusDB al crearla, como estaban antes de la migración.
      await payload.update({
        collection: 'quest-guides',
        id: created.id,
        data: {
          summary: {
            rewardExperience: null,
            rewardExperienceMin: null,
            rewardKamas: null,
            rewardItems: [],
            ...summary,
          },
          _status: status,
        },
        draft: status === 'draft',
      })
      return created.id
    }
    published = await guide('combate-de-calle-prueba', 'published', {
      prerequisites: 'Nivel mínimo 20.',
      needs: { items: [{ item: antenna.id, quantity: 2 }], notes: '1 x Combate (solo).' },
      rewards: '2 750 000 XP.\n43 980 kamas.\nCaramelo bendecido de la sacerdotisa de los Doce.',
    })
    draft = await guide('combate-de-calle-borrador', 'draft', { rewards: '242 160 XP.' })
    edited = await guide('combate-de-calle-editada', 'published', {
      rewards: '2 750 000 XP.',
      rewardExperience: 1000,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
    await payload.delete({ collection: 'items', where: { id: { exists: true } } })
    await payload.destroy()
  })

  it('en seco, cuenta lo que haría y las diferencias que resuelve, sin escribir', async () => {
    const result = await backfillGuideRewards(payload, { apply: false })
    expect(result.guides).toBe(3)
    expect(result.fills.map(({ slug }) => slug).sort()).toEqual([
      'combate-de-calle-borrador',
      'combate-de-calle-editada',
      'combate-de-calle-prueba',
    ])
    expect(result.fills.find(({ slug }) => slug === 'combate-de-calle-prueba')).toMatchObject({
      status: 'published',
      differences: [
        { field: 'XP', torre: 2_750_000, dofusDb: 242_160 },
        { field: 'kamas', torre: 43_980, dofusDb: 4760 },
      ],
    })
    expect((await reread(published)).summary?.rewardExperience ?? null).toBeNull()
  })

  it('con apply, escribe lo publicado publicado y el borrador como borrador', async () => {
    const result = await backfillGuideRewards(payload, { apply: true })
    expect(result).toMatchObject({ published: 2, drafts: 1 })

    const shown = await reread(published)
    expect(shown._status).toBe('published')
    expect(shown.summary).toMatchObject({
      rewardExperience: 2_750_000,
      rewardKamas: 43_980,
      rewardNotes: 'Caramelo bendecido de la sacerdotisa de los Doce.',
      // El resto del resumen y su texto se quedan tal cual.
      prerequisites: 'Nivel mínimo 20.',
      needs: { items: [{ item: antennaId, quantity: 2 }], notes: '1 x Combate (solo).' },
      rewards: '2 750 000 XP.\n43 980 kamas.\nCaramelo bendecido de la sacerdotisa de los Doce.',
    })
    expect(shown.summary?.rewardExperienceMin ?? null).toBeNull()
    expect(shown.summary?.rewardItems?.map(({ item, quantity }) => ({ item, quantity }))).toEqual([
      { item: antennaId, quantity: 4 },
    ])

    const pending = await reread(draft, true)
    expect(pending._status).toBe('draft')
    expect(pending.summary).toMatchObject({
      rewardExperience: 242_160,
      rewardExperienceMin: 129_600,
    })

    // Lo que ya tenía valor se queda; lo vacío se llena.
    expect((await reread(edited)).summary).toMatchObject({
      rewardExperience: 1000,
      rewardKamas: 4760,
    })
  })

  it('repetirla no cambia nada', async () => {
    const again = await backfillGuideRewards(payload, { apply: true })
    expect(again.fills).toEqual([])
    expect(again).toMatchObject({ published: 0, drafts: 0 })
  })
})
