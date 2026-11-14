import { describe, expect, it } from 'vitest'

import { genericAlternatives, genericSource } from '../../scripts/import/checklists/generic'
import type { RawAchievement } from '@/lib/dofusdb/types'

// Las filas genéricas de silvestre-checklist: cualquiera de varias misiones, según la persona.
// Sus misiones salen del objetivo de logro que las cuenta en DofusDB («Qf=556|Qf=566»).

describe('genericSource', () => {
  it('«alt:<logro>:<objetivo>» y la misión de clase (objetivo 5371 de «Un ciudadano modelo»)', () => {
    expect(genericSource('alt:607:1568')).toEqual({ achievement: 607, objective: 1568 })
    expect(genericSource('clase')).toEqual({ achievement: 1678, objective: 5371 })
    expect(genericSource('1234')).toBeNull()
  })
})

describe('genericAlternatives', () => {
  const achievements: RawAchievement[] = [
    {
      id: 607,
      objectives: [
        { id: 1568, criterion: 'Qf=556|Qf=566' },
        { id: 1569, criterion: '(Qf=557|Qf=567)' },
      ],
    },
    { id: 1678, objectives: [null, { id: 5371, criterion: 'Qf=1841|Qf=1677|Qf=1615' }] },
  ]
  const client = {
    fetchByIds: async <T>(collection: string, ids: number[]) => {
      expect(collection).toBe('achievements')
      return achievements.filter((row) => ids.includes(row.id)) as T[]
    },
  }

  it('las misiones de cada fila, en el orden del logro; la que no encuentra no sale', async () => {
    expect(
      await genericAlternatives(client, ['alt:607:1568', 'clase', 'alt:607:1569', 'alt:9:9']),
    ).toEqual({
      'alt:607:1568': [556, 566],
      clase: [1841, 1677, 1615],
      'alt:607:1569': [557, 567],
    })
  })

  it('sin filas genéricas no pregunta nada', async () => {
    const quiet = { fetchByIds: async () => expect.unreachable() as never }
    expect(await genericAlternatives(quiet, [])).toEqual({})
  })
})
