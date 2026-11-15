import { describe, expect, it } from 'vitest'

import { NEEDS_PATH, REWARD_ITEMS_PATH, plannedFormFill, stillEmpty } from '@/lib/guides/form-fill'
import type { LinkedQuest } from '@/lib/guides/summary'

const hunter: LinkedQuest = {
  name: 'El cazador cazado',
  levelMin: 25,
  rewards: {
    experience: 24_316,
    experienceMin: 14_062,
    kamas: 552,
    items: [{ item: { id: 7, name: 'Colmillos de ratas' }, quantity: 2 }],
  },
  startPositions: [{ npcName: 'Kerubim Crepin', x: 3, y: -17 }],
  needs: { items: [{ item: { id: 5, name: 'Pico de tofu', superTypeId: 9 }, quantity: 3 }] },
}

/** Un formulario: lee cada campo por su ruta, como getDataByPath. */
function form(values: Record<string, unknown> = {}) {
  return (path: string) => values[path]
}

describe('plannedFormFill', () => {
  it('planea rellenar todo lo vacío desde la misión', () => {
    const planned = plannedFormFill(form(), hunter)
    expect(planned.values).toMatchObject({
      title: 'El cazador cazado',
      slug: 'el-cazador-cazado',
      'seo.metaTitle': 'El cazador cazado: guía de la misión de Dofus',
      'summary.rewards': '24 316 XP.\n552 kamas.\n2 x Colmillos de ratas.',
      'summary.rewardExperience': 24_316,
      'summary.rewardExperienceMin': 14_062,
      'summary.rewardKamas': 552,
      'summary.startNpc': 'Kerubim Crepin',
      'summary.startX': 3,
      'summary.startY': -17,
    })
    expect(planned.values).toHaveProperty('seo.metaDescription')
    expect(planned.needsItems).toEqual([{ item: 5, quantity: 3 }])
    expect(planned.rewardItems).toEqual([{ item: 7, quantity: 2 }])
  })

  it('no toca las recompensas escritas, y la XP mínima solo va con la XP de DofusDB', () => {
    const planned = plannedFormFill(
      form({
        'summary.rewardExperience': 30_000,
        'summary.rewardKamas': 0,
        [REWARD_ITEMS_PATH]: [{ item: 9, quantity: 1 }],
      }),
      hunter,
    )
    expect(planned.values).not.toHaveProperty('summary.rewardExperience')
    expect(planned.values).not.toHaveProperty('summary.rewardExperienceMin')
    expect(planned.values).not.toHaveProperty('summary.rewardKamas')
    expect(planned.rewardItems).toEqual([])
  })

  it('no planea nada para lo que ya está escrito', () => {
    const planned = plannedFormFill(
      form({ title: 'Mi guía', 'summary.startX': 0, [NEEDS_PATH]: [{ item: 9, quantity: 1 }] }),
      hunter,
    )
    expect(planned.values).not.toHaveProperty('title')
    expect(planned.values).not.toHaveProperty('summary.startX')
    expect(planned.needsItems).toEqual([])
  })
})

describe('stillEmpty', () => {
  it('lo que Torre escribe mientras se comprueba el slug no se pisa', () => {
    const planned = plannedFormFill(form(), hunter)
    // Durante la petición, Torre escribe el título, las recompensas y añade un objeto
    const typed = form({
      title: 'Mi título',
      'summary.rewards': 'Lo que diga Torre.',
      [NEEDS_PATH]: [{ item: 9, quantity: 1 }],
    })

    const apply = stillEmpty(planned, typed)
    expect(apply.values).not.toHaveProperty('title')
    expect(apply.values).not.toHaveProperty('summary.rewards')
    expect(apply.needsItems).toEqual([])
    // Lo que sigue vacío se rellena
    expect(apply.values).toMatchObject({
      slug: 'el-cazador-cazado',
      'summary.startNpc': 'Kerubim Crepin',
    })
  })

  it('un texto con solo espacios y una lista sin filas siguen vacíos', () => {
    const planned = plannedFormFill(form(), hunter)
    const apply = stillEmpty(planned, form({ title: '   ', [NEEDS_PATH]: [] }))
    expect(apply.values).toHaveProperty('title', 'El cazador cazado')
    expect(apply.needsItems).toEqual([{ item: 5, quantity: 3 }])
    expect(apply.rewardItems).toEqual([{ item: 7, quantity: 2 }])
  })

  it('si Torre escribe la XP entre medias, la mínima de DofusDB no se copia', () => {
    const planned = plannedFormFill(form(), hunter)
    const apply = stillEmpty(planned, form({ 'summary.rewardExperience': 30_000 }))
    expect(apply.values).not.toHaveProperty('summary.rewardExperience')
    expect(apply.values).not.toHaveProperty('summary.rewardExperienceMin')
    expect(apply.values).toHaveProperty('summary.rewardKamas', 552)
  })

  it('una lista de recompensas que Torre llenó entre medias no se pisa', () => {
    const planned = plannedFormFill(form(), hunter)
    const apply = stillEmpty(planned, form({ [REWARD_ITEMS_PATH]: 1 }))
    expect(apply.rewardItems).toEqual([])
  })
})
