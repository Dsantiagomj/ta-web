import { describe, expect, it } from 'vitest'

import { readRewardsText, torreRewards } from '@/lib/guides/reward-text'
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
