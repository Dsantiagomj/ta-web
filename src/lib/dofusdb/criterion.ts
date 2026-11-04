// Criterios de DofusDB, como Ps=1&Pa=1&PL>29&Qf=55: condiciones unidas con & (todas) y
// | (alguna), con paréntesis.

/** Las condiciones de un nivel, hasta su ')'. Si ese nivel tiene un |, son alternativas: ninguna. */
function levelTerms(tokens: string[], cursor: { index: number }): string[] {
  const terms: string[] = []
  let alternatives = false
  while (cursor.index < tokens.length) {
    const token = tokens[cursor.index++]
    if (token === ')') break
    if (token === '|') alternatives = true
    else if (token === '(') terms.push(...levelTerms(tokens, cursor))
    else terms.push(token)
  }
  return alternatives ? [] : terms
}

/**
 * Las condiciones que se exigen siempre: unidas con & hasta arriba, también dentro de
 * paréntesis que solo llevan &. Las que están entre alternativas con | no cuentan.
 */
export function requiredTerms(criterion: string | null | undefined): string[] {
  const tokens = (criterion ?? '')
    .split(/([()&|])/)
    .map((token) => token.trim())
    .filter((token) => token && token !== '&')
  return levelTerms(tokens, { index: 0 })
}
