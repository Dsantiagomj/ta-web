import type { PayloadRequest } from 'payload'

import { checklistStrings } from '../lib/checklists/strings'
import { linkedQuestId } from '../lib/guides/autofill'

// Las reglas de los tramos del texto de un paso. Un «detente aquí» deja una misión a medias
// en un objetivo que esa misión tiene; un «aquí se resuelve» y una misión opcional apuntan a
// pasos de la misma checklist. Devuelven true o el mensaje para el panel.

const s = checklistStrings.admin

type Sibling = { kind?: unknown; quest?: unknown }
type StepsData = { steps?: unknown }

const isStop = (siblingData?: Sibling) => siblingData?.kind === 'stop'

/** Un «detente aquí» necesita la misión que deja a medias. */
export function validateSegmentQuest(
  value: unknown,
  { siblingData }: { siblingData?: Sibling },
): true | string {
  if (!isStop(siblingData)) return true
  return linkedQuestId(value) === null ? s.segmentQuestRequired : true
}

/** Cuántos objetivos tiene la misión, etapa tras etapa: los índices van de 0 a uno menos. */
function objectiveCount(quest: unknown): number {
  const stages = (quest as { stages?: { objectives?: unknown[] | null }[] | null } | null)?.stages
  return (stages ?? []).reduce((total, stage) => total + (stage.objectives?.length ?? 0), 0)
}

/**
 * El objetivo donde para un «detente aquí»: un índice sobre los objetivos aplanados de su
 * misión, en el orden de src/lib/dofusdb/quest-stages.ts, el mismo del checklist antiguo.
 */
export async function validateStopObjective(
  value: unknown,
  { siblingData, req }: { siblingData?: Sibling; req: PayloadRequest },
): Promise<true | string> {
  if (!isStop(siblingData)) return true
  if (value === null || value === undefined) return s.stopObjectiveRequired
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return s.stopObjectiveInvalid
  }
  const questId = linkedQuestId(siblingData?.quest)
  // Sin misión, el error sale en su campo (validateSegmentQuest).
  if (questId === null) return true
  const quest = await req.payload
    .findByID({
      collection: 'quests',
      id: questId,
      depth: 0,
      select: { stages: true },
      overrideAccess: true,
      req,
    })
    .catch(() => null)
  const count = objectiveCount(quest)
  if (count === 0) return s.questWithoutObjectives
  return value < count ? true : s.stopObjectiveOutOfRange(count - 1)
}

/** Los stepId de los pasos de la checklist que se guarda. */
function stepIds(data?: StepsData): Set<string> {
  const steps = Array.isArray(data?.steps) ? (data.steps as { stepId?: unknown }[]) : []
  return new Set(steps.map((step) => step.stepId).filter((id) => typeof id === 'string'))
}

/** El primero de los identificadores que no es de un paso de esta checklist. */
function unknownStep(ids: unknown[], data?: StepsData): string | null {
  const known = stepIds(data)
  const unknown = ids.find((id) => typeof id !== 'string' || !known.has(id))
  return unknown === undefined ? null : String(unknown)
}

/** Un «aquí se resuelve» termina al menos un paso, y solo pasos de esta checklist. */
export function validateClosedSteps(
  value: unknown,
  { siblingData, data }: { siblingData?: Sibling; data?: StepsData },
): true | string {
  if (siblingData?.kind !== 'resolve') return true
  if (!Array.isArray(value) || value.length === 0) return s.closesRequired
  const unknown = unknownStep(value, data)
  return unknown === null ? true : s.stepRefUnknown(unknown)
}

/** El paso que termina una misión opcional, si lo hay, es de esta checklist. */
export function validateStepRef(value: unknown, { data }: { data?: StepsData }): true | string {
  if (value === null || value === undefined || value === '') return true
  const unknown = unknownStep([value], data)
  return unknown === null ? true : s.stepRefUnknown(unknown)
}
