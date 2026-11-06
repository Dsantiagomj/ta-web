// La lista «Pasos» que acompaña a la guía desde 1152px (DESIGN.md, Steps side list).
// Código puro: cada paso con una etiqueta sacada de su propio texto y sus coordenadas.

import { type Coordinates, splitCoordinates } from './coordinates'
import type { GuideStep } from './page'
import { guideStrings } from './strings'

export interface StepNavEntry {
  /** El ancla del paso en la página. */
  id: string
  label: string
  coordinates?: Coordinates
}

// format es un número en los textos y una alineación en los bloques: solo se lee en los textos.
type LexicalNode = { type?: string; text?: string; format?: unknown; children?: LexicalNode[] }

// Lexical guarda el formato como máscara de bits; el 1 es la negrita.
const BOLD = 1

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

/** El ancla de un paso por su posición: el mismo número que ve el lector. */
export function stepAnchor(index: number): string {
  return `paso-${index + 1}`
}

// Lo que rodea a unas coordenadas en una negrita: espacios, signos y paréntesis. Solo se
// quita del lado que toca las coordenadas; «Pandora (la buena)» conserva su paréntesis.
const BEFORE_COORDINATES = /(?:\s+(?:en|a)(?!\p{L})|[\s.,:;(\-–—])*$/u
const AFTER_COORDINATES = /^[\s.,:;)\-–—]*/u
// Un trozo de etiqueta dice algo si tiene una palabra: «y» o «1 x» no cuentan.
const MEANINGFUL = /\p{L}{2,}/u

/**
 * Una negrita como etiqueta: sin sus coordenadas, que ya van en el chip, ni lo que las
 * rodea («en [x,y]», «( [x,y] ).»). Los trozos con alguna palabra se unen con un
 * espacio; si no queda ninguno, null.
 */
function labelText(text: string): string | null {
  const parts = splitCoordinates(text)
  const label = parts
    .flatMap((part, index) => {
      if (typeof part !== 'string') return []
      let kept = part
      // «Dina Tapia en [-46,44]»: el «en» de delante de las coordenadas se va con ellas.
      if (typeof parts[index + 1] === 'object') kept = kept.replace(BEFORE_COORDINATES, '')
      if (typeof parts[index - 1] === 'object') kept = kept.replace(AFTER_COORDINATES, '')
      // Un trozo sin una palabra («y» entre dos coordenadas) no aporta nada.
      return MEANINGFUL.test(kept) ? [kept.trim()] : []
    })
    .join(' ')
    .replace(/[\s.,:;]+$/u, '')
  return label || null
}

/**
 * Una entrada por paso. La etiqueta es el primer término en negrita de su prosa (sin los
 * avisos): un PNJ o un lugar, como Torre los marca, sin sus coordenadas. Sin negrita, o
 * si a ninguna le queda una palabra, «Paso N»; nunca se inventa. Las coordenadas son las
 * del paso o, sin ellas, las primeras de su texto.
 */
export function stepNav(steps: GuideStep[]): StepNavEntry[] {
  return steps.map((step, index) => {
    const nodes = stepTextNodes(step)
    const label = nodes
      .filter((node) => typeof node.format === 'number' && (node.format & BOLD) !== 0)
      .map((node) => labelText(node.text ?? ''))
      .find(Boolean)
    const coordinates = step.coordinates ?? textCoordinates(nodes)[0]
    return {
      id: stepAnchor(index),
      label: label || guideStrings.page.untitledStep(index + 1),
      ...(coordinates && { coordinates }),
    }
  })
}
