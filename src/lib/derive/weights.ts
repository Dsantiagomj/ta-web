// Los pesos del porcentaje de una checklist, como los calculaba silvestre-checklist
// (.build/build_weights.py), pero con los datos guardados y nunca a mano:
//
// - cada misión vale su nivel por la raíz de su número de objetivos (el nivel dice lo difícil
//   que es; los objetivos, lo larga; la raíz evita que una muy larga se coma el porcentaje);
// - las opcionales y las de solo tomarla valen 0 en su paso: se pueden saltar;
// - una misión que llevan varios pasos reparte sus puntos a partes iguales entre ellos;
// - un paso pesa lo que suman sus misiones, y uno sin misiones, lo que una de nivel 1.
//
// El nivel es el «Nivel mínimo» de la guía de Torre si la da y, si no, el levelMin de DofusDB.
// Sin dependencias: lo usa la página en el servidor y lo prueba tests/unit.

export type WeightKind = 'mandatory' | 'optional' | 'take'

export interface WeightedStep {
  quests: readonly (readonly [number, WeightKind])[]
}

export interface StepWeight {
  /** Lo que pesa el paso marcado. */
  w: number
  /** Lo que vale cada misión del paso terminada antes de marcarlo, en su orden. */
  shares: number[]
}

const LEVEL_TEXT = /Nivel\s+(?:m[ií]nimo|recomendado)\s*:?\s*(\d+)/i
const MIN_WEIGHT = 1

const round3 = (value: number) => Math.round(value * 1000) / 1000

/** El nivel que da Torre en los prerrequisitos de su guía («Nivel mínimo 180»), o null. */
export function torreLevel(text: string | null | undefined): number | null {
  const match = LEVEL_TEXT.exec(text ?? '')
  return match ? Number(match[1]) : null
}

/** El nivel con el que pesa una misión: el de Torre, el de DofusDB o, sin ninguno, 1. */
export function questLevel(
  torreText: string | null | undefined,
  levelMin: number | null | undefined,
) {
  return torreLevel(torreText) || levelMin || 1
}

/** Lo que vale una misión entera: su nivel por la raíz de sus objetivos (al menos uno). */
export const questPoints = (level: number, objectives: number) =>
  level * Math.sqrt(Math.max(1, objectives))

/**
 * El peso de cada paso y lo que vale en él cada una de sus misiones. `points` da lo que vale
 * cada misión entera, por su ID de DofusDB.
 */
export function stepWeights(
  steps: readonly WeightedStep[],
  points: Readonly<Record<number, number>>,
): StepWeight[] {
  const firstOf = (step: WeightedStep, id: number, index: number) =>
    step.quests.findIndex(([other]) => other === id) === index
  const counted = (step: WeightedStep, index: number) => {
    const [id, kind] = step.quests[index]
    return kind === 'mandatory' && firstOf(step, id, index)
  }
  const sharedBy = new Map<number, number>()
  for (const step of steps) {
    step.quests.forEach(([id], index) => {
      if (counted(step, index)) sharedBy.set(id, (sharedBy.get(id) ?? 0) + 1)
    })
  }
  return steps.map((step) => {
    const shares = step.quests.map(([id], index) =>
      counted(step, index) ? (points[id] ?? questPoints(1, 1)) / (sharedBy.get(id) ?? 1) : 0,
    )
    const sum = shares.reduce((total, share) => total + share, 0)
    return { w: round3(Math.max(sum, MIN_WEIGHT)), shares: shares.map(round3) }
  })
}
