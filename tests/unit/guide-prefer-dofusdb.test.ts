import { describe, expect, it } from 'vitest'

import {
  DOFUSDB_TOLERANCE,
  preferDofusDb,
  preferDofusDbReport,
  type GuidePreference,
} from '@/lib/guides/prefer-dofusdb'
import type { LinkedQuest } from '@/lib/guides/summary'

const item = (id: number, name: string) => ({ id, name })

// Combate de calle (DofusDB 1979): 242 160 XP, 4 760 kamas y 4 antenas.
const street: LinkedQuest = {
  name: 'Combate de calle',
  rewards: {
    experience: 242_160,
    experienceMin: 129_600,
    kamas: 4760,
    items: [
      { item: item(9, 'Antenas de vilinsekto'), quantity: 4 },
      { item: item(8, 'Perla'), quantity: 100 },
    ],
  },
}

describe('preferDofusDb', () => {
  it('el margen es del 10 %', () => {
    expect(DOFUSDB_TOLERANCE).toBe(0.1)
  })

  it('una cifra de Torre a un 10 % o menos de la de DofusDB pasa a la de DofusDB', () => {
    const result = preferDofusDb(
      { rewardExperience: 250_000, rewardKamas: 4760 * 0.9, rewardExperienceMin: 129_600 },
      street,
    )
    expect(result.update).toEqual({ rewardExperience: 242_160, rewardKamas: 4760 })
    expect(result.switched).toEqual([
      { field: 'XP', torre: 250_000, dofusDb: 242_160 },
      { field: 'kamas', torre: 4284, dofusDb: 4760 },
    ])
    expect(result.kept).toEqual([])
  })

  it('con más diferencia, la de Torre se queda y se lista', () => {
    const result = preferDofusDb({ rewardExperience: 300_000, rewardKamas: 1000 }, street)
    expect(result.update).toEqual({})
    expect(result.kept).toEqual([
      { field: 'XP', torre: 300_000, dofusDb: 242_160 },
      { field: 'kamas', torre: 1000, dofusDb: 4760 },
    ])
  })

  it('la XP que pasa a DofusDB lleva su mínima si la de Torre estaba vacía', () => {
    expect(preferDofusDb({ rewardExperience: 240_000 }, street).update).toEqual({
      rewardExperience: 242_160,
      rewardExperienceMin: 129_600,
    })
  })

  it('las cantidades de objetos, objeto a objeto, conservando sus filas y su orden', () => {
    const result = preferDofusDb(
      {
        rewardItems: [
          { id: 'a', item: 8, quantity: 95 },
          { id: 'b', item: { id: 9 }, quantity: 5 },
          { id: 'c', item: 7, quantity: 3 },
        ],
      },
      street,
    )
    expect(result.update).toEqual({
      rewardItems: [
        { id: 'a', item: 8, quantity: 100 },
        { id: 'b', item: 9, quantity: 5 },
        { id: 'c', item: 7, quantity: 3 },
      ],
    })
    expect(result.switched).toEqual([{ field: 'objeto', name: 'Perla', torre: 95, dofusDb: 100 }])
    expect(result.kept).toEqual([
      { field: 'objeto', name: 'Antenas de vilinsekto', torre: 5, dofusDb: 4 },
    ])
  })

  it('los tramos de «Por nivel», con el tramo igual de DofusDB', () => {
    const tiered: LinkedQuest = {
      rewards: {
        byLevel: [
          {
            levelMin: 1,
            levelMax: 109,
            experience: 1_329_586,
            kamas: 14_041,
            items: [{ item: item(1, 'Cupón chocolate'), quantity: 5 }],
          },
          { levelMin: 110, levelMax: 200, experience: 2_750_000, kamas: 43_980, items: [] },
        ],
      },
    }
    const result = preferDofusDb(
      {
        rewardLevels: [
          {
            id: 'x',
            levelMin: 1,
            levelMax: 109,
            experience: 1_300_000,
            kamas: 20_000,
            items: [{ id: 'y', item: 1, quantity: 5 }],
          },
          // Sin tramo igual en DofusDB: no se compara.
          { id: 'z', levelMin: 110, levelMax: 199, experience: 1, kamas: 1, items: [] },
        ],
      },
      tiered,
    )
    expect(result.update.rewardLevels).toEqual([
      {
        id: 'x',
        levelMin: 1,
        levelMax: 109,
        experience: 1_329_586,
        kamas: 20_000,
        items: [{ id: 'y', item: 1, quantity: 5 }],
      },
      { id: 'z', levelMin: 110, levelMax: 199, experience: 1, kamas: 1, items: [] },
    ])
    expect(result.switched).toEqual([
      { field: 'XP', level: 'Nivel 1 a 109', torre: 1_300_000, dofusDb: 1_329_586 },
    ])
    expect(result.kept).toEqual([
      { field: 'kamas', level: 'Nivel 1 a 109', torre: 20_000, dofusDb: 14_041 },
    ])
  })

  it('un 0 de Torre, una cifra vacía o una que DofusDB no da no se tocan', () => {
    const result = preferDofusDb({ rewardExperience: 0, rewardKamas: null }, street)
    expect(result).toEqual({ update: {}, switched: [], kept: [] })
    expect(preferDofusDb({ rewardKamas: 5 }, { rewards: { kamas: 0 } })).toEqual({
      update: {},
      switched: [],
      kept: [],
    })
    expect(preferDofusDb({ rewardKamas: 5 }, null)).toEqual({ update: {}, switched: [], kept: [] })
  })

  it('repetirla no cambia nada: ya son las de DofusDB', () => {
    const first = preferDofusDb({ rewardExperience: 250_000 }, street)
    const again = preferDofusDb({ ...first.update }, street)
    expect(again.update).toEqual({})
    expect(again.switched).toEqual([])
  })
})

describe('preferDofusDbReport', () => {
  const guide = (slug: string, preference: Partial<GuidePreference>): GuidePreference => ({
    slug,
    status: 'published',
    update: {},
    switched: [],
    kept: [],
    ...preference,
  })

  it('cuenta las guías que pasan a DofusDB por campo y lista las diferencias grandes', () => {
    const lines = preferDofusDbReport(
      {
        guides: 3,
        preferences: [
          guide('combate-de-calle', {
            update: { rewardExperience: 1 },
            switched: [
              { field: 'XP', torre: 250_000, dofusDb: 242_160 },
              { field: 'objeto', name: 'Perla', torre: 95, dofusDb: 100 },
            ],
            kept: [{ field: 'kamas', torre: 1000, dofusDb: 4760 }],
          }),
          guide('la-crisis-de-fe', {
            status: 'draft',
            update: { rewardLevels: [] },
            switched: [
              { field: 'XP', level: 'Nivel 1 a 109', torre: 1_300_000, dofusDb: 1_329_586 },
            ],
            kept: [
              {
                field: 'objeto',
                level: 'Nivel 1 a 109',
                name: 'Cupón chocolate',
                torre: 8,
                dofusDb: 5,
              },
            ],
          }),
        ],
        published: 0,
        drafts: 0,
      },
      false,
    )
    expect(lines).toEqual([
      'Pasan a DofusDB:',
      'combate-de-calle: XP, Torre 250 000, DofusDB 242 160, ratio 1,032',
      'combate-de-calle: objeto Perla, Torre 95, DofusDB 100, ratio 0,95',
      'la-crisis-de-fe (borrador): Nivel 1 a 109, XP, Torre 1 300 000, DofusDB 1 329 586, ratio 0,978',
      'Diferencias grandes (se queda la cifra de Torre):',
      'combate-de-calle: kamas, Torre 1 000, DofusDB 4 760, ratio 0,21',
      'la-crisis-de-fe (borrador): Nivel 1 a 109, objeto Cupón chocolate, Torre 8, DofusDB 5, ratio 1,6',
      'Guías leídas: 3. Con cambios: 2 (publicadas: 1, borradores: 1).',
      'Pasan a DofusDB: XP en 1, kamas en 0, objetos en 1; por nivel, XP en 1, kamas en 0, objetos en 0.',
      'Diferencias grandes: 2, en 2 guías.',
      'En seco: sin --apply no se escribe nada.',
    ])
  })
})
