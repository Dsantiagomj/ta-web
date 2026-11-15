import { describe, expect, it } from 'vitest'

import { rewardsReport, rewardsToWrite, type GuideRewardsFill } from '@/lib/guides/backfill-rewards'
import type { LinkedQuest } from '@/lib/guides/summary'

const item = (id: number, name: string) => ({ id, name })

// «Y pum, un chokipik» sin sus niveles, y «Combate de calle» (DofusDB 1979).
const street: LinkedQuest = {
  name: 'Combate de calle',
  rewards: {
    experience: 242_160,
    experienceMin: 129_600,
    kamas: 4760,
    items: [{ item: item(9, 'Antenas de vilinsekto'), quantity: 4 }],
  },
}

describe('rewardsToWrite', () => {
  it('las cifras de Torre ganan; lo que su texto no da lo pone DofusDB', () => {
    const text = '2 750 000 XP.\n43 980 kamas.\nCaramelo bendecido de la sacerdotisa de los Doce.'
    expect(rewardsToWrite({}, text, street)).toMatchObject({
      fill: {
        rewardExperience: 2_750_000,
        rewardKamas: 43_980,
        rewardItems: [{ item: 9, quantity: 4 }],
        rewardNotes: 'Caramelo bendecido de la sacerdotisa de los Doce.',
      },
      differences: [
        { field: 'XP', torre: 2_750_000, dofusDb: 242_160 },
        { field: 'kamas', torre: 43_980, dofusDb: 4760 },
      ],
    })
    // Su XP no es la de DofusDB: la mínima de DofusDB no va con ella.
    expect(rewardsToWrite({}, text, street).fill).not.toHaveProperty('rewardExperienceMin')
  })

  it('con la XP de DofusDB, también su mínima; sin diferencias que contar', () => {
    const result = rewardsToWrite({}, '242 160 XP.\n4 760 kamas.', street)
    expect(result.fill).toMatchObject({
      rewardExperience: 242_160,
      rewardExperienceMin: 129_600,
      rewardKamas: 4760,
    })
    expect(result.differences).toEqual([])
  })

  it('nunca cambia un campo con valor: solo llena lo vacío', () => {
    const current = {
      rewardExperience: 1,
      rewardKamas: 0,
      rewardItems: [{ item: 9, quantity: 1 }],
      rewardNotes: 'Lo suyo.',
    }
    expect(rewardsToWrite(current, '2 750 000 XP.\nEmote: Llorar.', street).fill).toEqual({})
  })

  it('un texto que no se lee da los valores de DofusDB y dice por qué', () => {
    const result = rewardsToWrite({}, 'Si eres nivel 180 a 200:\n1 XP.', street)
    expect(result.unreadable).toBe('Si eres nivel 180 a 200:')
    expect(result.fill).toEqual({
      rewardExperience: 242_160,
      rewardExperienceMin: 129_600,
      rewardKamas: 4760,
      rewardItems: [{ item: 9, quantity: 4 }],
    })
  })

  it('una cantidad distinta de un objeto cuenta como diferencia', () => {
    expect(rewardsToWrite({}, '5 x Antenas de vilinsekto.', street).differences).toEqual([
      { field: 'objeto', name: 'Antenas de vilinsekto', torre: 5, dofusDb: 4 },
    ])
  })

  it('sin misión, solo lo de Torre', () => {
    expect(rewardsToWrite({}, '2 000 XP.\n1 x Pico de tofu.', null).fill).toEqual({
      rewardExperience: 2000,
      rewardNotes: '1 x Pico de tofu.',
    })
  })
})

describe('rewardsToWrite con tramos de nivel', () => {
  const coupon = (id: number, name: string) => ({ item: item(id, name), quantity: 5 })
  // La crisis de fe (2056), con sus tres tramos en DofusDB.
  const crisis: LinkedQuest = {
    name: 'La crisis de fe',
    rewards: {
      experience: 2_750_000,
      experienceMin: 2_750_000,
      kamas: 43_980,
      items: [coupon(3, 'Cupón praliné')],
      byLevel: [
        {
          levelMin: 1,
          levelMax: 109,
          experience: 1_329_586,
          kamas: 14_041,
          items: [coupon(1, 'Cupón chocolate')],
        },
        {
          levelMin: 110,
          levelMax: 179,
          experience: 2_544_537,
          kamas: 35_601,
          items: [coupon(2, 'Cupón avellana')],
        },
        {
          levelMin: 180,
          levelMax: 200,
          experience: 2_750_000,
          kamas: 43_980,
          items: [coupon(3, 'Cupón praliné')],
        },
      ],
    },
  }
  const text = [
    'Si eres nivel 1 a 109: 1 300 000 XP.14 041 kamas.5 x Cupón chocolate.',
    'Si eres nivel 110 a 179: 2 544 537 XP.35 601 kamas.5 x Cupón avellana.',
    'Si eres nivel 180 a 200: 2 750 000 XP.43 980 kamas.5 x Cupón praliné.',
  ].join('\n')
  // Como en dev tras la primera carga: las cifras sueltas ya están, «Por nivel» no.
  const filled = {
    rewardExperience: 2_750_000,
    rewardExperienceMin: 2_750_000,
    rewardKamas: 43_980,
    rewardItems: [{ item: 3, quantity: 5 }],
  }

  it('llena «Por nivel» con los tramos de su texto y cuenta los que no son los de DofusDB', () => {
    const result = rewardsToWrite(filled, text, crisis)
    expect(result.fill).toEqual({
      rewardLevels: [
        {
          levelMin: 1,
          levelMax: 109,
          experience: 1_300_000,
          kamas: 14_041,
          items: [{ item: 1, quantity: 5 }],
        },
        {
          levelMin: 110,
          levelMax: 179,
          experience: 2_544_537,
          kamas: 35_601,
          items: [{ item: 2, quantity: 5 }],
        },
        {
          levelMin: 180,
          levelMax: 200,
          experience: 2_750_000,
          kamas: 43_980,
          items: [{ item: 3, quantity: 5 }],
        },
      ],
    })
    expect(result.differences).toEqual([
      { field: 'XP', level: 'Nivel 1 a 109', torre: 1_300_000, dofusDb: 1_329_586 },
    ])
    // Las cifras sueltas ya estaban: su texto por tramos no se avisa otra vez.
    expect(result.unreadable).toBeUndefined()
    expect(result.levelsFrom).toBe('torre')
  })

  it('sin tramos en su texto, «Por nivel» lleva los de DofusDB', () => {
    const result = rewardsToWrite(filled, '2 750 000 XP.', crisis)
    expect(result.fill.rewardLevels?.map((tier) => tier.experience)).toEqual([
      1_329_586, 2_544_537, 2_750_000,
    ])
    expect(result.levelsFrom).toBe('dofusDb')
  })

  it('nunca toca un «Por nivel» con filas', () => {
    const own = { ...filled, rewardLevels: [{ levelMin: 1, levelMax: 200, items: [] }] }
    expect(rewardsToWrite(own, text, crisis).fill).toEqual({})
  })
})

describe('rewardsReport', () => {
  const fill = (slug: string, decision: Partial<GuideRewardsFill>): GuideRewardsFill => ({
    slug,
    status: 'published',
    fill: { rewardExperience: 1 },
    differences: [],
    unmatchedItems: [],
    ...decision,
  })

  it('lista las diferencias que resuelve, lo que no se lee y los objetos sin casar', () => {
    const lines = rewardsReport(
      {
        guides: 6,
        fills: [
          fill('combate-de-calle', {
            differences: [
              { field: 'XP', torre: 2_750_000, dofusDb: 242_160 },
              { field: 'objeto', name: 'Perla', torre: 12, dofusDb: 10 },
            ],
          }),
          fill('y-pum-un-chokipik', { status: 'draft', unreadable: 'Si eres nivel 1 a 109:' }),
          fill('vuelta-venenosa', { unmatchedItems: ['1 x Fragmento de ugahruleta.'] }),
          fill('la-crisis-de-fe', { fill: { rewardLevels: [] }, levelsFrom: 'torre' }),
          fill('reparto-de-castanas', { fill: { rewardLevels: [] }, levelsFrom: 'dofusDb' }),
        ],
        published: 0,
        drafts: 0,
      },
      false,
    )
    expect(lines).toEqual([
      'Gana Torre en combate-de-calle: XP 2 750 000 (DofusDB 242 160); 12 x Perla (DofusDB 10)',
      'Sin leer en y-pum-un-chokipik (borrador): «Si eres nivel 1 a 109:». Van las de DofusDB; revísala a mano.',
      'Objeto sin casar en vuelta-venenosa: «1 x Fragmento de ugahruleta.». No se inventa; revísalo a mano.',
      '«Por nivel» en la-crisis-de-fe: los tramos de su texto.',
      '«Por nivel» en reparto-de-castanas: los tramos de DofusDB.',
      'Guías leídas: 6. Con campos por llenar: 5 (publicadas: 4, borradores: 1).',
      'Guías donde gana una cifra de Torre: 1 (XP: 1, kamas: 0, objetos: 1).',
      'Textos sin leer: 1. Líneas de objeto sin casar: 1.',
      '«Por nivel» por llenar: 2 (de su texto: 1, de DofusDB: 1).',
      'En seco: sin --apply no se escribe nada.',
    ])
  })
})
