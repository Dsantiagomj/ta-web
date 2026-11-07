// Los pasos de la guía (DESIGN.md, Steps). Código puro: el ancla de cada paso y la
// chincheta de sus coordenadas cuando su texto no las nombra.

import { type Coordinates, splitCoordinates } from './coordinates'
import type { GuideStep } from './page'

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

/** Los nodos de texto de un bloque de prosa, en orden de lectura. */
function textNodes(root: LexicalNode): LexicalNode[] {
  if (root.type === 'text') return [root]
  return (root.children ?? []).flatMap(textNodes)
}

/** Los nodos de texto de la prosa de un paso (sin avisos ni capturas). */
function stepTextNodes(step: GuideStep): LexicalNode[] {
  return step.blocks.flatMap((block) =>
    block.kind === 'richText' ? textNodes(block.content.root as unknown as LexicalNode) : [],
  )
}

/** Las coordenadas escritas en la prosa de un paso, en orden. */
function textCoordinates(nodes: LexicalNode[]): Coordinates[] {
  return splitCoordinates(nodes.map((node) => node.text ?? '').join('')).filter(
    (part): part is Coordinates => typeof part !== 'string',
  )
}

/**
 * Las coordenadas del paso como chip al principio de su contenido, solo si su texto no
 * las nombra ya: así un paso con X e Y puestas en el panel no las pierde.
 */
export function stepPin(step: GuideStep): Coordinates | undefined {
  const own = step.coordinates
  if (!own) return undefined
  const named = textCoordinates(stepTextNodes(step)).some(
    (found) => found.x === own.x && found.y === own.y,
  )
  return named ? undefined : own
}

/** El ancla de un paso por su posición: el número que dice el lector de pantalla. */
export function stepAnchor(index: number): string {
  return `paso-${index + 1}`
}
