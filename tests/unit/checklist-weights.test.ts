import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  questLevel,
  questPoints,
  stepWeights,
  torreLevel,
  type WeightedStep,
} from '@/lib/derive/weights'

// Los pesos del porcentaje, como los calculaba silvestre-checklist (.build/build_weights.py):
// cada misión vale su nivel por la raíz de sus objetivos, las opcionales y las de solo tomarla
// valen 0, una misión de varios pasos reparte sus puntos y un paso sin misiones pesa como una
// misión de nivel 1. Se comparan con el weights.json del Nebuloso antiguo.

interface Fixture {
  stepQuests: Record<string, number[]>
  kinds: Record<string, Record<string, 'optional' | 'take'>>
  quests: Record<string, { levelMin: number; level: number; objectives: number }>
  weights: Record<string, { w: number; q: number[]; ids: string[]; os: number[] }>
}

const fixture = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      '../fixtures/silvestre-checklist/src/dofus/nebuloso/weights-fixture.json',
    ),
    'utf8',
  ),
) as Fixture

const nebulosoSteps = (): WeightedStep[] =>
  Object.keys(fixture.stepQuests)
    .sort((a, b) => Number(a) - Number(b))
    .map((n) => ({
      quests: fixture.stepQuests[n].map(
        (id) => [id, fixture.kinds[n]?.[String(id)] ?? 'mandatory'] as const,
      ),
    }))

const nebulosoPoints = () =>
  Object.fromEntries(
    Object.entries(fixture.quests).map(([id, quest]) => [
      id,
      questPoints(quest.level, quest.objectives),
    ]),
  )

describe('torreLevel: el «Nivel mínimo» de la guía de Torre', () => {
  it('lee el nivel de los prerrequisitos de su guía', () => {
    expect(torreLevel('Nivel mínimo 180.')).toBe(180)
    expect(torreLevel('Prerrequisitos: El tesoro en curso. Nivel minimo: 60')).toBe(60)
    expect(torreLevel('Nivel recomendado 120')).toBe(120)
  })

  it('sin nivel en el texto, ninguno', () => {
    expect(torreLevel('El tesoro de Totankama en curso.')).toBeNull()
    expect(torreLevel(null)).toBeNull()
    expect(torreLevel(undefined)).toBeNull()
  })
})

describe('questLevel', () => {
  it('el de Torre cuando su guía lo da; si no, el levelMin de DofusDB; sin ninguno, 1', () => {
    expect(questLevel(torreLevel('Nivel mínimo 80.'), 100)).toBe(80)
    expect(questLevel(torreLevel('Sin nivel.'), 100)).toBe(100)
    expect(questLevel(undefined, 100)).toBe(100)
    expect(questLevel(null, null)).toBe(1)
    expect(questLevel(null, 0)).toBe(1)
  })
})

describe('questPoints', () => {
  it('nivel por la raíz de sus objetivos, con al menos un objetivo', () => {
    expect(questPoints(80, 7)).toBeCloseTo(211.66, 2)
    expect(questPoints(50, 0)).toBe(50)
  })
})

describe('stepWeights', () => {
  it('reparte una misión de varios pasos y da 0 a las opcionales y a las de solo tomarla', () => {
    const steps: WeightedStep[] = [
      {
        quests: [
          [1, 'mandatory'],
          [2, 'optional'],
        ],
      },
      {
        quests: [
          [1, 'mandatory'],
          [3, 'take'],
        ],
      },
      { quests: [] },
    ]
    expect(stepWeights(steps, { 1: 100, 2: 40, 3: 60 })).toEqual([
      { w: 50, shares: [50, 0] },
      { w: 50, shares: [50, 0] },
      // Sin misiones: lo que vale una misión de nivel 1
      { w: 1, shares: [] },
    ])
  })

  it('una misión repetida en el mismo paso cuenta una vez', () => {
    expect(
      stepWeights(
        [
          {
            quests: [
              [1, 'mandatory'],
              [1, 'mandatory'],
            ],
          },
        ],
        { 1: 30 },
      ),
    ).toEqual([{ w: 30, shares: [30, 0] }])
  })

  it('da los mismos pesos que el weights.json del Nebuloso de silvestre-checklist', () => {
    const weights = stepWeights(nebulosoSteps(), nebulosoPoints())
    const numbers = Object.keys(fixture.stepQuests).sort((a, b) => Number(a) - Number(b))
    expect(weights).toHaveLength(numbers.length)
    numbers.forEach((n, index) => {
      expect(weights[index].w, `paso ${n}`).toBeCloseTo(fixture.weights[n].w, 3)
      weights[index].shares.forEach((share, at) => {
        expect(share, `paso ${n}, misión ${at + 1}`).toBeCloseTo(fixture.weights[n].q[at], 3)
      })
    })
  })
})
