import { describe, expect, it } from 'vitest'

import { readRewardsText, torreLevelRewards, torreRewards } from '@/lib/guides/reward-text'
import type { LinkedQuest } from '@/lib/guides/summary'

describe('readRewardsText', () => {
  it('lee la XP, los kamas y los objetos de las líneas de Torre', () => {
    expect(
      readRewardsText('2 625 000 XP.\n43 980 kamas.\n10 x Perla de las profundidades.\n'),
    ).toEqual({
      experience: 2_625_000,
      kamas: 43_980,
      items: [
        {
          quantity: 10,
          name: 'Perla de las profundidades',
          line: '10 x Perla de las profundidades.',
        },
      ],
      notes: [],
    })
  })

  it('acepta Kamas, xp, miles con espacio duro o estrecho y «2 040x»', () => {
    expect(readRewardsText('1 957 037 xp\n53 712 Kamas.\n2 040x Sebuscalín.')).toEqual({
      experience: 1_957_037,
      kamas: 53_712,
      items: [{ quantity: 2040, name: 'Sebuscalín', line: '2 040x Sebuscalín.' }],
      notes: [],
    })
  })

  it('lo que no es XP, kamas ni objeto queda como nota, tal cual', () => {
    expect(readRewardsText('478 314 XP.\nEmote: Flores.\n\nOrnamento brakmariano 4')).toMatchObject(
      {
        experience: 478_314,
        notes: ['Emote: Flores.', 'Ornamento brakmariano 4'],
      },
    )
    expect(readRewardsText('Nada xD.')).toEqual({ items: [], notes: ['Nada xD.'] })
  })

  it('sin texto, nada', () => {
    expect(readRewardsText(null)).toEqual({ items: [], notes: [] })
    expect(readRewardsText('  \n')).toEqual({ items: [], notes: [] })
  })

  it('no lee un texto por niveles: se revisa a mano', () => {
    const tiers = 'Si eres nivel 1 a 109:\n664 793 XP.\nSi eres nivel 180 a 200:\n1 375 000 XP.'
    expect(readRewardsText(tiers)).toEqual({ unreadable: 'Si eres nivel 1 a 109:' })
    expect(readRewardsText('Al 200: 1 000 XP y 10 Kamas.')).toEqual({
      unreadable: 'Al 200: 1 000 XP y 10 Kamas.',
    })
  })

  it('no lee una XP o unos kamas con algo más, ni dos XP, ni una cifra sola', () => {
    for (const text of [
      '38 644 211 XP (sumando todas las 8 etapas).',
      '1 000 XP repartidos.',
      '116 437 XP - 1 750 000 XP.',
      '1 000 kamas (en total).',
      '975 000 XP.\n11 980 XP.',
      '10 kamas.\n20 kamas.',
      '2 500 000',
    ]) {
      expect(readRewardsText(text)).toHaveProperty('unreadable')
    }
  })
})

const item = (id: number, name: string, correction?: { name: string }) => ({
  id,
  name,
  ...(correction && { correction }),
})

// «A la pesca de información» (DofusDB 1731), con sus objetos en el orden de DofusDB.
const fishing: LinkedQuest = {
  name: 'A la pesca de información',
  rewards: {
    experience: 2_500_000,
    experienceMin: 2_500_000,
    kamas: 43_980,
    items: [
      { item: item(4, 'Piedra angular'), quantity: 1 },
      { item: item(3, 'Piel de trithón'), quantity: 1 },
      { item: item(2, 'Parásito acuático'), quantity: 1 },
      { item: item(1, 'Perla de las profundidades'), quantity: 10 },
    ],
  },
}

describe('torreRewards', () => {
  it('sus cifras van a los campos; los objetos son los de DofusDB, en su orden de Torre', () => {
    const text =
      '2 625 000 XP.\n43 980 kamas.\n12 x Perla de las profundidades.\n1 x Piedra angular.'
    expect(torreRewards(text, fishing)).toEqual({
      fields: {
        rewardExperience: 2_625_000,
        rewardKamas: 43_980,
        rewardItems: [
          { item: 1, quantity: 12 },
          { item: 2, quantity: 1 },
          { item: 3, quantity: 1 },
          { item: 4, quantity: 1 },
        ],
      },
      quantityChanges: [{ name: 'Perla de las profundidades', from: 10, to: 12 }],
      unmatchedItems: [],
    })
  })

  it('sin cantidades distintas, la lista de objetos la pone DofusDB: no la escribe', () => {
    const text = '10 x Perla de las profundidades.\n1 x Piedra angular.'
    expect(torreRewards(text, fishing).fields).not.toHaveProperty('rewardItems')
  })

  it('casa los objetos por nombre sin tildes ni mayúsculas, también por la corrección de Torre', () => {
    const quest: LinkedQuest = {
      rewards: {
        items: [
          { item: item(7, 'Sebuscalin'), quantity: 1560 },
          { item: item(8, 'Kama de hielo', { name: 'Kama helado' }), quantity: 3 },
        ],
      },
    }
    expect(torreRewards('1 560 x Sebuscalín.\n4 x kama helado', quest)).toMatchObject({
      fields: {
        rewardItems: [
          { item: 8, quantity: 4 },
          { item: 7, quantity: 1560 },
        ],
      },
      unmatchedItems: [],
    })
  })

  it('el apóstrofo curvo de Torre casa con el recto de DofusDB', () => {
    const quest: LinkedQuest = {
      rewards: { items: [{ item: item(5, "Tentáculo de n'yalg"), quantity: 5 }] },
    }
    expect(torreRewards('5 x Tentáculo de N’yalg.', quest).unmatchedItems).toEqual([])
  })

  it('un objeto suyo que DofusDB no da no se inventa: se lista para revisarlo', () => {
    const result = torreRewards('1 x Fragmento de ugahruleta.', fishing)
    expect(result.fields).toEqual({})
    expect(result.unmatchedItems).toEqual(['1 x Fragmento de ugahruleta.'])
  })

  it('si DofusDB no da objetos, sus líneas de objetos quedan como notas, tal cual', () => {
    const result = torreRewards('2 000 XP.\n1 x Pico de tofu.\nEmote: Llorar.', null)
    expect(result.fields).toEqual({
      rewardExperience: 2000,
      rewardNotes: '1 x Pico de tofu.\nEmote: Llorar.',
    })
    expect(result.unmatchedItems).toEqual([])
  })

  it('sus otras recompensas van a «Otras recompensas», línea a línea', () => {
    expect(torreRewards('5 000 000 XP.\nEmote: Facepalm.', fishing).fields).toEqual({
      rewardExperience: 5_000_000,
      rewardNotes: 'Emote: Facepalm.',
    })
  })

  it('un texto que no se lee no escribe nada y dice por qué línea', () => {
    expect(torreRewards('Si eres nivel 1 a 109:\n1 XP.', fishing)).toEqual({
      fields: {},
      unreadable: 'Si eres nivel 1 a 109:',
      quantityChanges: [],
      unmatchedItems: [],
    })
  })
})

// Los textos por tramo de Torre (los eventos de Pazcuak), como los deja la importación: en su
// página cada tramo es un elemento de lista con sus cifras en una sublista, así que va la
// línea del tramo y, debajo, sus cifras, una por línea.
const CRISIS = [
  'Si eres nivel 1 a 109:',
  '1 329 586 XP.',
  '14 041 kamas.',
  '5 x Cupón chocolate.',
  'Si eres nivel 110 a 179:',
  '2 544 537 XP.',
  '35 601 kamas.',
  '5 x Cupón avellana.',
  'Si eres nivel 180 a 200:',
  '2 750 000 XP.',
  '43 980 kamas.',
  '5 x Cupón praliné.',
].join('\n')

// Lo que guardaba la importación antes de leer bien las sublistas, y sigue en las guías que
// no se han puesto al día: el texto del tramo con sus cifras pegadas y, debajo, otra vez.
const CRISIS_BEFORE = [
  'Si eres nivel 1 a 109: 1 329 586 XP.14 041 kamas.5 x Cupón chocolate.',
  '1 329 586 XP.',
  '14 041 kamas.',
  '5 x Cupón chocolate.',
  'Si eres nivel 110 a 179:2 544 537 XP.35 601 kamas.5 x Cupón avellana.',
  '2 544 537 XP.',
  '35 601 kamas.',
  '5 x Cupón avellana.',
  'Si eres nivel 180 a 200:2 750 000 XP.43 980 kamas.5 x Cupón praliné.',
  '2 750 000 XP.',
  '43 980 kamas.',
  '5 x Cupón praliné.',
].join('\n')

const tierCoupon = (id: number, name: string, quantity = 5) => ({
  item: { id, name },
  quantity,
})
const crisisQuest: LinkedQuest = {
  name: 'La crisis de fe',
  rewards: {
    byLevel: [
      {
        levelMin: 1,
        levelMax: 109,
        experience: 1,
        kamas: 1,
        items: [tierCoupon(1, 'Cupón chocolate')],
      },
      {
        levelMin: 110,
        levelMax: 179,
        experience: 1,
        kamas: 1,
        items: [tierCoupon(2, 'Cupón avellana')],
      },
      {
        levelMin: 180,
        levelMax: 200,
        experience: 1,
        kamas: 1,
        items: [tierCoupon(3, 'Cupón praliné')],
      },
    ],
  },
}

describe('torreLevelRewards', () => {
  it('lee cada tramo con su XP, sus kamas y sus objetos, casados con los de DofusDB', () => {
    expect(torreLevelRewards(CRISIS, crisisQuest)).toEqual({
      levels: [
        {
          levelMin: 1,
          levelMax: 109,
          experience: 1_329_586,
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
      unmatchedItems: [],
    })
  })

  it('el texto de antes del arreglo, con las cifras pegadas y repetidas, da los mismos tramos', () => {
    expect(torreLevelRewards(CRISIS_BEFORE, crisisQuest)).toEqual(
      torreLevelRewards(CRISIS, crisisQuest),
    )
  })

  it('un tramo con sus cifras en la misma línea también se lee', () => {
    const inline =
      'Si eres nivel 1 a 109: 1 329 586 XP.14 041 kamas.\nSi eres nivel 110 a 200: 9 XP.'
    expect(torreLevelRewards(inline, crisisQuest).levels?.[0]).toMatchObject({
      experience: 1_329_586,
      kamas: 14_041,
    })
  })

  it('su cantidad gana; lo que no escribe de un tramo lo pone DofusDB', () => {
    const text = 'Si eres nivel 1 a 109: 7 x Cupón chocolate.\nSi eres nivel 110 a 200: 9 XP.'
    const quest: LinkedQuest = {
      rewards: {
        byLevel: [
          {
            levelMin: 1,
            levelMax: 109,
            experience: 5,
            kamas: 6,
            items: [tierCoupon(1, 'Cupón chocolate')],
          },
          {
            levelMin: 110,
            levelMax: 200,
            experience: 8,
            kamas: 9,
            items: [tierCoupon(2, 'Cupón avellana')],
          },
        ],
      },
    }
    expect(torreLevelRewards(text, quest).levels).toEqual([
      { levelMin: 1, levelMax: 109, experience: 5, kamas: 6, items: [{ item: 1, quantity: 7 }] },
      { levelMin: 110, levelMax: 200, experience: 9, kamas: 9, items: [{ item: 2, quantity: 5 }] },
    ])
  })

  it('un objeto suyo que DofusDB no da en ese tramo no se inventa: se lista', () => {
    const text = CRISIS.replace('5 x Cupón chocolate.', '5 x Cupón de menta.')
    expect(torreLevelRewards(text, crisisQuest).unmatchedItems).toEqual(['5 x Cupón de menta.'])
  })

  it('sin dos tramos legibles no da tramos', () => {
    expect(torreLevelRewards('2 750 000 XP.', crisisQuest)).toEqual({ unmatchedItems: [] })
    expect(torreLevelRewards('Depende del nivel:\nAl 200: 1 375 000 XP.', crisisQuest)).toEqual({
      unmatchedItems: [],
    })
    // Dos XP distintas en el mismo tramo: no se adivina cuál vale.
    const twice = 'Si eres nivel 1 a 109: 1 XP.\n2 XP.\nSi eres nivel 110 a 200: 3 XP.'
    expect(torreLevelRewards(twice, crisisQuest)).toEqual({
      unreadable: '2 XP.',
      unmatchedItems: [],
    })
  })
})
