// Dónde para cada «detente aquí»: la misma cuenta que hace el checklist antiguo
// (silvestre-checklist, src/tools/checklist/lib/stops.js y ownStops en lib/journal.js), para
// que el objetivo guardado sea el mismo índice que guardaba su progreso. Primero las paradas
// escritas a mano en su config.js (journal.stopAt); si no, la que se deduce del texto («hasta
// tener que pasar X»: antes del primer objetivo que nombra a X).
import type { LegacyQuest, LegacyStep, LegacyStopAt } from './legacy'

/** Una misión del paso, con su tipo en el paso (las de solo tomarla no paran). */
export interface StepQuest extends LegacyQuest {
  id: number
  kind: string
}

export interface StopPoint {
  quest: number
  /** El índice sobre los objetivos aplanados de la misión, etapa tras etapa. */
  index: number
  text: string
}

const norm = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const flat = (quest: LegacyQuest) => quest.s.flatMap((stage) => stage.o)

/** La parada que se deduce del texto de un rojo, o null (stopPoint de stops.js). */
export function stopFromText(text: string, quests: StepQuest[]): StopPoint | null {
  const boss = text.match(/pasar (?:la mazmorra (?:del? )?)?(?:a )?(.+?)(?:\s+con\b|[.,;)]|$)/i)
  const dungeon = !boss && text.match(/entrar a la mazmorra (?:de )?(.+?)(?:[.,;)]|$)/i)
  const named = boss || dungeon
  if (!named) return null
  const word = new RegExp(`(?<![a-z0-9])${escapeRe(norm(named[1]))}(?![a-z0-9])`)
  const byText = (objective: { t: string }) => word.test(norm(objective.t))
  const byArea = (objective: { a?: string }) => word.test(norm(objective.a ?? ''))
  const tries = dungeon ? [byArea] : /pasar la mazmorra/i.test(text) ? [byText, byArea] : [byText]
  for (const match of tries) {
    for (const quest of quests.filter((candidate) => candidate.kind !== 'take')) {
      const index = flat(quest).findIndex(match)
      if (index >= 0) return { quest: quest.id, index, text }
    }
  }
  return null
}

/**
 * La parada de cada rojo del paso, en su orden: null donde no se pudo situar. Las de
 * journal.stopAt se reparten entre los rojos como en ownStops (la i-ésima va al i-ésimo rojo,
 * o al último si hay menos rojos) y, sin ellas, cada rojo se sitúa por su texto.
 */
export function stepStops(
  step: LegacyStep,
  quests: StepQuest[],
  stopAt: LegacyStopAt,
): (StopPoint | null)[] {
  const reds = (step.marks ?? []).filter(([kind]) => kind === 'stop').map(([, text]) => text)
  const written = (stopAt[step.n] ?? []).flatMap(([name, start, options], i) => {
    const quest = quests.find((candidate) => candidate.n === name)
    const index = quest ? flat(quest).findIndex((objective) => objective.t.startsWith(start)) : -1
    if (!quest || index < 0) return []
    return [{ quest: quest.id, index, text: options?.text ?? reds[Math.min(i, reds.length - 1)] }]
  })
  const used = new Set<StopPoint>()
  return reds.map((text) => {
    const point = written.find((candidate) => candidate.text === text && !used.has(candidate))
    if (point) {
      used.add(point)
      return point
    }
    return written.length > 0 ? null : stopFromText(text, quests)
  })
}
