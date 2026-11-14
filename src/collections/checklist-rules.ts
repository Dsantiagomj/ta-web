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

/**
 * Una parada de «más paradas» necesita la misión que deja a medias. El tramo «detente aquí» puede
 * ir sin ella: entonces solo avisa (un paso de solo tomar una misión).
 */
export function validateSegmentQuest(value: unknown): true | string {
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
  // En el tramo, solo si es un «detente aquí»; en «más paradas» no hay tipo.
  if (siblingData && 'kind' in siblingData && !isStop(siblingData)) return true
  const questId = linkedQuestId(siblingData?.quest)
  // Sin misión no hay objetivo que pedir (un tramo que solo avisa, o el error de su misión).
  if (questId === null) return true
  if (value === null || value === undefined) return s.stopObjectiveRequired
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return s.stopObjectiveInvalid
  }
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

/**
 * Un «aquí se resuelve» termina solo pasos de esta checklist. Sin ninguno, el paso se resuelve
 * en sí mismo: termina lo que su rojo dejaba a medias.
 */
export function validateClosedSteps(
  value: unknown,
  { siblingData, data }: { siblingData?: Sibling; data?: StepsData },
): true | string {
  if (siblingData?.kind !== 'resolve') return true
  return validateStepRefs(value, { data })
}

/** Una lista de pasos (los que cierra o avanza un paso) solo lleva pasos de esta checklist. */
export function validateStepRefs(value: unknown, { data }: { data?: StepsData }): true | string {
  if (value === null || value === undefined) return true
  if (!Array.isArray(value)) return s.stepRefUnknown(String(value))
  const unknown = unknownStep(value, data)
  return unknown === null ? true : s.stepRefUnknown(unknown)
}

/** El paso que termina una misión opcional, si lo hay, es de esta checklist. */
export function validateStepRef(value: unknown, { data }: { data?: StepsData }): true | string {
  if (value === null || value === undefined || value === '') return true
  const unknown = unknownStep([value], data)
  return unknown === null ? true : s.stepRefUnknown(unknown)
}

/** El prerrequisito en el que se gasta un objeto, si lo hay, es uno de esta checklist. */
export function validateNeedPrerequisite(
  value: unknown,
  {
    data,
  }: {
    data?: { prerequisites?: { groups?: { rows?: { key?: unknown }[] | null }[] | null } | null }
  },
): true | string {
  if (value === null || value === undefined || value === '') return true
  const keys = new Set(
    (data?.prerequisites?.groups ?? []).flatMap((group) =>
      (group.rows ?? []).map((row) => row.key),
    ),
  )
  return keys.has(value) ? true : s.needPrerequisiteUnknown(String(value))
}

/** Una fila de lo que necesita el paso lleva un objeto del juego o, si no lo es, su texto. */
export function validateNeedItem(
  value: unknown,
  { siblingData }: { siblingData?: { label?: unknown } },
): true | string {
  if (value !== null && value !== undefined && value !== '') return true
  const label = siblingData?.label
  return typeof label === 'string' && label.trim() !== '' ? true : s.needItemOrLabel
}
