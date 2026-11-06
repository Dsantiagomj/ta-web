import { describe, expect, it } from 'vitest'

import { questRewards } from '@/lib/dofusdb/quest-rewards'
import type { RawQuest } from '@/lib/dofusdb/types'

import quests from '../fixtures/dofusdb/quests-steps.json'

function quest(id: number): RawQuest {
  const found = (quests as RawQuest[]).find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
  return structuredClone(found)
}

// Las cifras de Torre y de dofusdb.fr: un personaje de nivel 200.
describe('questRewards', () => {
  it('calcula experiencia, kamas y objetos de El cazador cazado (1977)', () => {
    expect(questRewards(quest(1977))).toEqual({
      experience: 24_316,
      experienceMin: 14_062,
      kamas: 552,
      items: [
        { dofusId: 2322, quantity: 2 },
        { dofusId: 304, quantity: 2 },
      ],
      emoteIds: [],
      spellIds: [],
      titleIds: [],
      jobIds: [],
    })
  })

  it('topa el nivel de recompensa en 1,5 veces el óptimo: El rey Estitch (332)', () => {
    // Nivel óptimo 180, duración 2, ratio 1,2 y sin kamas
    expect(questRewards(quest(332))).toMatchObject({ experience: 5_571_168, kamas: 0 })
  })

  it('usa la experiencia del nivel 200 cuando ese es el óptimo: Intoxicación profunda (1433)', () => {
    expect(questRewards(quest(1433))).toMatchObject({ experience: 1_000_000, kamas: 21_990 })
  })

  it('cuadra con las cifras de Torre en Seis pies bajo tierra (1976)', () => {
    expect(questRewards(quest(1976))).toMatchObject({
      experience: 16_380,
      kamas: 390,
      items: [
        { dofusId: 2491, quantity: 1 },
        { dofusId: 388, quantity: 1 },
        { dofusId: 373, quantity: 1 },
        { dofusId: 366, quantity: 1 },
      ],
    })
  })

  it('da el rango de XP de Seis pies bajo tierra (1976): 9 800 a 16 380', () => {
    // Óptimo 20: al nivel 20 da 9 800; a partir de 30 (1,5 veces el óptimo) ya no sube.
    expect(questRewards(quest(1976))).toMatchObject({ experienceMin: 9_800, experience: 16_380 })
  })

  it('la XP mínima es la del nivel óptimo de cada etapa, sumadas', () => {
    // Cinco etapas con óptimos distintos; cada una se redondea hacia abajo.
    const rewards = questRewards(quest(241))
    expect(rewards.experienceMin).toBeGreaterThan(0)
    expect(rewards.experienceMin).toBeLessThan(rewards.experience)
  })

  it('sin margen sobre el óptimo, la XP mínima y la máxima coinciden: Intoxicación profunda (1433)', () => {
    expect(questRewards(quest(1433))).toMatchObject({
      experienceMin: 1_000_000,
      experience: 1_000_000,
    })
  })

  it('redondea hacia abajo cada etapa antes de sumar', () => {
    // De Safari con Cocodrail Dandi (241), cinco etapas. Redondear el total daría 5 679 337.
    const rewards = questRewards(quest(241))
    expect(rewards.experience).toBe(5_679_336)
    expect(rewards.kamas).toBe(68_625)
  })

  it('suma los objetos de todas las etapas', () => {
    const raw = quest(241)
    const items = raw.steps!.flatMap((step) => step.rewards!.at(-1)!.itemsReward ?? [])
    expect(items.length).toBeGreaterThan(1)
    // La misma recompensa en dos etapas se junta en una línea
    raw.steps![1].rewards!.at(-1)!.itemsReward = [[8730, 2]]
    const merged = questRewards(raw).items
    expect(merged.filter((item) => item.dofusId === 8730)).toEqual([{ dofusId: 8730, quantity: 3 }])
  })

  it('toma la última entrada de recompensas de cada etapa, la del nivel más alto', () => {
    // ¡M.O. Pardy! (880) tiene una entrada por tramo de nivel; la primera es la del 20.
    const raw = quest(880)
    expect(raw.steps![0].rewards!.length).toBeGreaterThan(1)
    expect(questRewards(raw)).toMatchObject({ experience: 3_250_000, kamas: 43_980 })
  })

  it('guarda los IDs de emotes y títulos', () => {
    expect(questRewards(quest(880)).emoteIds).toEqual([36])
    expect(questRewards(quest(1665)).titleIds).toEqual([200])
  })

  it('una etapa sin recompensas no suma nada', () => {
    const raw = quest(1977)
    raw.steps!.push({ id: 1, optimalLevel: 200, duration: 1, rewards: [] })
    expect(questRewards(raw)).toMatchObject({ experience: 24_316, kamas: 552 })
  })

  it('una misión sin etapas no da nada', () => {
    const raw = quest(1977)
    delete raw.steps
    expect(questRewards(raw)).toEqual({
      experience: 0,
      experienceMin: 0,
      kamas: 0,
      items: [],
      emoteIds: [],
      spellIds: [],
      titleIds: [],
      jobIds: [],
    })
  })
})
