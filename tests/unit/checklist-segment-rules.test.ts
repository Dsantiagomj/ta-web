import type { ArrayField, Field } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { Checklists } from '@/collections/Checklists'
import {
  validateClosedSteps,
  validateSegmentQuest,
  validateStepRef,
  validateStopObjective,
} from '@/collections/checklist-rules'

// Las reglas de los tramos del texto de un paso: un «detente aquí» apunta a un objetivo que
// existe en su misión, y un «aquí se resuelve» a pasos de la misma checklist.

describe('reglas de los tramos', () => {
  it('un tramo «detente aquí» necesita su misión', () => {
    expect(validateSegmentQuest(null, { siblingData: { kind: 'stop' } })).not.toBe(true)
    expect(validateSegmentQuest(12, { siblingData: { kind: 'stop' } })).toBe(true)
    expect(validateSegmentQuest(null, { siblingData: { kind: 'plain' } })).toBe(true)
  })

  /** Una misión con dos etapas: tres objetivos en total, índices 0, 1 y 2. */
  function requestWith(quest: unknown) {
    const findByID = vi.fn(async () => quest)
    return { findByID, req: { payload: { findByID } } as never }
  }
  const stages = { stages: [{ objectives: [{}, {}] }, { objectives: [{}] }] }

  it('el objetivo es un índice dentro de los objetivos de esa misión', async () => {
    const { req, findByID } = requestWith(stages)
    const siblingData = { kind: 'stop', quest: { id: 7 } }
    expect(await validateStopObjective(0, { siblingData, req })).toBe(true)
    expect(await validateStopObjective(2, { siblingData, req })).toBe(true)
    expect(await validateStopObjective(3, { siblingData, req })).not.toBe(true)
    expect(await validateStopObjective(-1, { siblingData, req })).not.toBe(true)
    expect(await validateStopObjective(1.5, { siblingData, req })).not.toBe(true)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ collection: 'quests', id: 7 }))
  })

  it('un tramo «detente aquí» necesita su objetivo; los demás no', async () => {
    const { req } = requestWith(stages)
    expect(
      await validateStopObjective(null, { siblingData: { kind: 'stop', quest: 7 }, req }),
    ).not.toBe(true)
    expect(await validateStopObjective(null, { siblingData: { kind: 'plain' }, req })).toBe(true)
  })

  it('una misión sin objetivos guardados no admite ninguno', async () => {
    const { req } = requestWith({ stages: [] })
    const result = await validateStopObjective(0, { siblingData: { kind: 'stop', quest: 7 }, req })
    expect(result).not.toBe(true)
  })

  const data = { steps: [{ stepId: 'paso-a' }, { stepId: 'paso-b' }] }

  it('un tramo «aquí se resuelve» cierra pasos de la misma checklist', () => {
    const resolve = { siblingData: { kind: 'resolve' }, data }
    expect(validateClosedSteps(['paso-a'], resolve)).toBe(true)
    expect(validateClosedSteps([], resolve)).not.toBe(true)
    expect(validateClosedSteps(null, resolve)).not.toBe(true)
    expect(validateClosedSteps(['paso-de-otra'], resolve)).not.toBe(true)
    expect(validateClosedSteps(null, { siblingData: { kind: 'plain' }, data })).toBe(true)
  })

  it('el paso que termina una misión opcional también es de la misma checklist', () => {
    expect(validateStepRef('', { data })).toBe(true)
    expect(validateStepRef('paso-b', { data })).toBe(true)
    expect(validateStepRef('paso-de-otra', { data })).not.toBe(true)
  })
})

describe('la colección usa estas reglas', () => {
  const byName = (fields: Field[], name: string) =>
    fields.find((candidate) => 'name' in candidate && candidate.name === name) as Field & {
      validate?: unknown
    }
  const steps = byName(Checklists.fields, 'steps') as ArrayField
  const segments = byName(steps.fields, 'segments') as ArrayField
  const quests = byName(steps.fields, 'quests') as ArrayField

  it('en los tramos y en la misión opcional', () => {
    expect(byName(segments.fields, 'quest').validate).toBe(validateSegmentQuest)
    expect(byName(segments.fields, 'stopObjective').validate).toBe(validateStopObjective)
    expect(byName(segments.fields, 'closes').validate).toBe(validateClosedSteps)
    expect(byName(quests.fields, 'optionalDoneBy').validate).toBe(validateStepRef)
  })
})
