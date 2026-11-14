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
  /** La termina un paso posterior que lleva la misión, no el que cierra este (`later`). */
  later?: true
  /** La línea de la parada en su misión, si no es el texto del rojo (`text`). */
  line?: string
  /** La línea cuando el paso se resuelve en sí mismo, si no es la del verde (`done`). */
  resumeLine?: string
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
      if (index >= 0) return { quest: quest.id, index }
    }
  }
  return null
}

/**
 * La coletilla del verde que deja una parada nueva: «…y se actualiza la misión 1 del inciso 43
 * hasta tener que pasar Kodámade.» (Silvestre) o «…hasta que te pida pasar la mazmorra del
 * Morsagüino Real.» (Hielos). FOLLOW_UP de lib/stops.js.
 */
export const FOLLOW_UP = /\s+hasta (tener que|que te pida) pasar (.+?)\.?$/i

/** La parada que deja un verde («hasta tener que pasar X»), o null (followUpStop de stops.js). */
export function followUpStop(green: string, quests: StepQuest[]): StopPoint | null {
  const match = green.match(FOLLOW_UP)
  return match ? stopFromText(`Hasta ${match[1]} pasar ${match[2]}`, quests) : null
}

/**
 * Las paradas de cada rojo del paso, en su orden. Las de journal.stopAt se reparten como en
 * ownStops: la i-ésima va al i-ésimo rojo, o al último si hay menos rojos, con sus opciones
 * (`later`, su línea, su parte del verde). Sin ellas, el primer rojo que se sitúa por su texto
 * lleva la única parada (stopPoint). Un rojo puede quedarse sin ninguna.
 */
export function stepStops(
  step: LegacyStep,
  quests: StepQuest[],
  stopAt: LegacyStopAt,
): StopPoint[][] {
  const reds = (step.marks ?? []).filter(([kind]) => kind === 'stop').map(([, text]) => text)
  const out: StopPoint[][] = reds.map(() => [])
  if (reds.length === 0) return out
  const written = (stopAt[step.n] ?? []).flatMap(([name, start, options], i) => {
    const quest = quests.find((candidate) => candidate.n === name)
    const index = quest ? flat(quest).findIndex((objective) => objective.t.startsWith(start)) : -1
    if (!quest || index < 0) return []
    const point: StopPoint = {
      quest: quest.id,
      index,
      ...(options?.later && { later: true as const }),
      ...(options?.text && { line: options.text }),
      ...(options?.done && { resumeLine: options.done }),
    }
    return [{ red: Math.min(i, reds.length - 1), point }]
  })
  if (written.length > 0) {
    for (const { red, point } of written) out[red].push(point)
    return out
  }
  for (const [red, text] of reds.entries()) {
    const point = stopFromText(text, quests)
    if (point) {
      out[red].push(point)
      break
    }
  }
  return out
}
