import type { ArrayField, Field } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { layoutFields } from './helpers/fields'

import { Checklists } from '@/collections/Checklists'
import {
  validateClosedSteps,
  validateNeedItem,
  validateNeedPrerequisite,
  validateSegmentQuest,
  validateStepRef,
  validateStepRefs,
  validateStopObjective,
} from '@/collections/checklist-rules'

// Las reglas de los tramos del texto de un paso: un «detente aquí» apunta a un objetivo que
// existe en su misión, y un «aquí se resuelve» a pasos de la misma checklist.

describe('reglas de los tramos', () => {
  it('una parada de «más paradas» necesita su misión; el tramo puede ir sin ella', () => {
    expect(validateSegmentQuest(null)).not.toBe(true)
    expect(validateSegmentQuest(12)).toBe(true)
  })

  it('sin misión, el tramo «detente aquí» solo avisa y no pide objetivo', async () => {
    const { req, findByID } = requestWith(stages)
    expect(await validateStopObjective(null, { siblingData: { kind: 'stop' }, req })).toBe(true)
    expect(findByID).not.toHaveBeenCalled()
  })

  it('en «más paradas» (sin tipo) el objetivo se pide como en el tramo', async () => {
    const { req } = requestWith(stages)
    expect(await validateStopObjective(null, { siblingData: { quest: 7 }, req })).not.toBe(true)
    expect(await validateStopObjective(3, { siblingData: { quest: 7 }, req })).not.toBe(true)
    expect(await validateStopObjective(1, { siblingData: { quest: 7 }, req })).toBe(true)
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
    // Sin pasos que cerrar, el paso se resuelve en sí mismo.
    expect(validateClosedSteps([], resolve)).toBe(true)
    expect(validateClosedSteps(null, resolve)).toBe(true)
    expect(validateClosedSteps(['paso-de-otra'], resolve)).not.toBe(true)
    expect(validateClosedSteps(null, { siblingData: { kind: 'plain' }, data })).toBe(true)
  })

  it('los pasos que cierra o avanza un paso sin verde son de la misma checklist', () => {
    expect(validateStepRefs(null, { data })).toBe(true)
    expect(validateStepRefs(['paso-a', 'paso-b'], { data })).toBe(true)
    expect(validateStepRefs(['paso-a', 'paso-de-otra'], { data })).not.toBe(true)
  })

  it('el paso que termina una misión opcional también es de la misma checklist', () => {
    expect(validateStepRef('', { data })).toBe(true)
    expect(validateStepRef('paso-b', { data })).toBe(true)
    expect(validateStepRef('paso-de-otra', { data })).not.toBe(true)
  })
})

describe('lo que necesita un paso', () => {
  it('cada fila lleva un objeto del juego o, si no lo es, su texto', () => {
    expect(validateNeedItem(12, { siblingData: {} })).toBe(true)
    expect(validateNeedItem(null, { siblingData: { label: 'Kama' } })).toBe(true)
    expect(validateNeedItem(null, { siblingData: { label: '  ' } })).not.toBe(true)
    expect(validateNeedItem(undefined, { siblingData: {} })).not.toBe(true)
  })

  it('el prerrequisito en el que se gasta un objeto es uno de la checklist', () => {
    const data = { prerequisites: { groups: [{ rows: [{ key: 'l1' }, { key: 'l11' }] }] } }
    expect(validateNeedPrerequisite(null, { data })).toBe(true)
    expect(validateNeedPrerequisite('l11', { data })).toBe(true)
    expect(validateNeedPrerequisite('l9', { data })).not.toBe(true)
  })
})

describe('la colección usa estas reglas', () => {
  const byName = (fields: Field[], name: string) =>
    layoutFields(fields).find(
      (candidate) => 'name' in candidate && candidate.name === name,
    ) as Field & {
      validate?: unknown
    }
  const steps = byName(Checklists.fields, 'steps') as ArrayField
  const segments = byName(steps.fields, 'segments') as ArrayField
  const quests = byName(steps.fields, 'quests') as ArrayField
  const needs = byName(steps.fields, 'needs') as ArrayField

  it('en los tramos y en la misión opcional', () => {
    expect(byName(segments.fields, 'quest').validate).toBeUndefined()
    const more = byName(segments.fields, 'more') as ArrayField
    expect(byName(more.fields, 'quest').validate).toBe(validateSegmentQuest)
    expect(byName(more.fields, 'stopObjective').validate).toBe(validateStopObjective)
    expect(byName(steps.fields, 'closes').validate).toBe(validateStepRefs)
    expect(byName(steps.fields, 'updates').validate).toBe(validateStepRefs)
    const prerequisites = byName(Checklists.fields, 'prerequisites') as Field & { fields: Field[] }
    const preNeeds = byName(prerequisites.fields, 'needs') as ArrayField
    expect(byName(preNeeds.fields, 'prerequisite').validate).toBe(validateNeedPrerequisite)
    expect(byName(preNeeds.fields, 'item').validate).toBe(validateNeedItem)
    expect(byName(segments.fields, 'stopObjective').validate).toBe(validateStopObjective)
    expect(byName(segments.fields, 'closes').validate).toBe(validateClosedSteps)
    expect(byName(quests.fields, 'optionalDoneBy').validate).toBe(validateStepRef)
    expect(byName(needs.fields, 'item').validate).toBe(validateNeedItem)
  })
})
