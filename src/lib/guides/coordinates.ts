// Coordenadas de mapa en las guías (DESIGN.md, Coordinates chip). Se ven como el juego
// las escribe, [7,-19], y se copian como el comando /travel 7,-19, que en el chat del
// juego activa el autopilotaje.

export interface Coordinates {
  x: number
  y: number
}

// Dos enteros con signo opcional entre corchetes, con espacios opcionales. Hasta tres
// cifras: el mapa del juego no pasa de ahí, y así un número largo entre corchetes no cuela.
const COORDINATES = String.raw`\[\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})\s*\]`

export function travelCommand({ x, y }: Coordinates): string {
  return `/travel ${x},${y}`
}

export function formatCoordinates({ x, y }: Coordinates): string {
  return `[${x},${y}]`
}

/** Las coordenadas de un texto que no tiene nada más, o null. */
export function parseCoordinates(text: string): Coordinates | null {
  const match = new RegExp(`^${COORDINATES}$`).exec(text.trim())
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null
}

/**
 * Parte un texto de la prosa en trozos de texto y coordenadas, en orden, para pintar
 * cada [x,y] como un chip. Lo que no encaja en el patrón se queda como texto.
 */
export function splitCoordinates(text: string): (string | Coordinates)[] {
  const parts: (string | Coordinates)[] = []
  let last = 0
  for (const match of text.matchAll(new RegExp(COORDINATES, 'g'))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ x: Number(match[1]), y: Number(match[2]) })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
