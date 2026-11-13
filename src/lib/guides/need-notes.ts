// Las notas de Necesitarás, línea a línea: código puro y sin dependencias, para que lo usen
// la página (src/lib/guides/page.ts, src/lib/achievements/page.ts) y el panel
// (src/collections/QuestGuides.ts).

/** Una línea del resumen como fila: sin el punto final. */
export function rowText(line: string): string {
  return line.replace(/\.$/, '')
}

// «1 x Combate (solo).»: la cantidad va aparte, en negrita, como en el juego.
const QUANTITY_NOTE = /^(\d+)\s*[x×]\s+(.+)$/u

/** Una nota de Necesitarás. combat: es un combate, y lleva el icono del juego. */
export interface NeedNote {
  quantity?: number
  label: string
  combat: boolean
}

export function needNote(line: string): NeedNote {
  const text = rowText(line)
  const match = QUANTITY_NOTE.exec(text)
  const label = match ? match[2]! : text
  const combat = /\bcombates?\b/iu.test(label)
  return match ? { quantity: Number(match[1]), label, combat } : { label, combat }
}

/** Para casar una nota con otra o con un objeto: sin mayúsculas, tildes ni espacios de más. */
export function needKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('es')
}

/** La clave de una nota escrita a mano, como la de su fila: sin cantidad ni punto final. */
export const noteKey = (line: string) => needKey(needNote(line.trim()).label)

// «Mazmorra Malefíscof»: va con los combates, con el jefe de esa mazmorra o el icono de
// mazmorra.
const DUNGEON = /\bmazmorras?\b/iu

/** Si una nota va como mazmorra en «Combates y mazmorras». */
export const isDungeonNote = (label: string) => DUNGEON.test(label)
