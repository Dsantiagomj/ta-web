// El mensaje del panel al negarse a borrar algo que sale en otras guías (docs/research/
// backlog.md, A-17): cuántas son y cuáles, para que Torre sepa dónde quitarlo.

import { panelStrings } from './strings'

/** Lo que el panel no deja borrar mientras una guía lo use. */
export type ReferencedCollection = keyof typeof panelStrings.references

/** Las guías que se nombran; del resto solo se dice cuántas son. */
export const MAX_NAMED_REFERENCES = 10

/** «a», «a y b», «a, b y c». */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}

/**
 * «Esta imagen sale en 4 guías: «A», «B», «C» y «D». Quítala de ellas antes de borrarla.»
 * `total` cuenta todas las guías cuando solo llegan los nombres de algunas.
 */
export function referencedMessage(
  collection: ReferencedCollection,
  names: string[],
  total = names.length,
): string {
  const { subject, feminine } = panelStrings.references[collection]
  const count = Math.max(total, names.length)
  const quoted = names.slice(0, MAX_NAMED_REFERENCES).map((name) => `«${name}»`)
  const rest = count - quoted.length
  const list = rest > 0 ? `${quoted.join(', ')} y ${rest} más` : joinNames(quoted)
  const pronoun = feminine ? 'la' : 'lo'
  const guides = count === 1 ? 'guía' : 'guías'
  const them = count === 1 ? 'ella' : 'ellas'
  return `${subject} sale en ${count} ${guides}: ${list}. Quíta${pronoun} de ${them} antes de borrar${pronoun}.`
}
