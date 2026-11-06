// El render de un PNJ (DESIGN.md, Quest header): DofusDB pinta su look en
// renderer.dofusdb.fr. Se importa una vez a Media al refrescar los datos del juego; la web
// nunca lo pide a DofusDB al servir una página.
import { createHash } from 'node:crypto'

/** Hacia dónde mira el PNJ: a la derecha junto al título (escritorio), a la izquierda en el móvil. */
export type RenderDirection = 'right' | 'left'

// Direcciones del renderizador: 1 mira a la derecha y 3 a la izquierda.
const DIRECTION: Record<RenderDirection, number> = { right: 1, left: 3 }

export const RENDER_DIRECTIONS = Object.keys(DIRECTION) as RenderDirection[]

const RENDERER = 'https://renderer.dofusdb.fr/look'

/** La URL del render de cuerpo entero (PNG transparente de 1000×1000), o null sin look. */
export function npcRenderUrl(
  look: string | null | undefined,
  direction: RenderDirection,
): string | null {
  const value = look?.trim()
  if (!value) return null
  const hex = Buffer.from(value, 'utf8').toString('hex')
  return `${RENDERER}/${hex}/full/${DIRECTION[direction]}/300_300.png`
}

/**
 * La clave del archivo en Media: PNJ, dirección y una huella del look. Con ella el
 * refresco encuentra lo que ya subió y no duplica nada; un look nuevo es otra clave.
 */
export function npcRenderKey(npcId: number, direction: RenderDirection, look: string): string {
  const hash = createHash('sha1').update(look.trim()).digest('hex').slice(0, 12)
  return `dofusdb-npc-render:${npcId}:${direction}:${hash}`
}
