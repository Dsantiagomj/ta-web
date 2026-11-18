import { describe, expect, it } from 'vitest'

import { lineDiff } from '../../scripts/import/golden/line-diff'

// El diff que enseña pnpm import:golden-refresh entre la salida guardada y la de la página de
// hoy: líneas con «-» (se va), «+» (llega) y « » (contexto), en trozos que empiezan por «@@»
// con la línea de cada lado, como git diff.

const lines = (...values: string[]) => values.join('\n') + '\n'

describe('lineDiff', () => {
  it('no da nada cuando los dos textos son iguales', () => {
    expect(lineDiff(lines('a', 'b'), lines('a', 'b'))).toEqual([])
  })

  it('marca la línea cambiada con su contexto', () => {
    expect(lineDiff(lines('a', 'b', 'c', 'd', 'e'), lines('a', 'b', 'X', 'd', 'e'), 1)).toEqual([
      '@@ -2,3 +2,3 @@',
      ' b',
      '-c',
      '+X',
      ' d',
    ])
  })

  it('marca lo añadido y lo quitado, y separa los trozos lejanos', () => {
    const before = lines('1', '2', '3', '4', '5', '6', '7', '8', '9')
    const after = lines('0', '1', '2', '3', '4', '5', '6', '7', '9')
    expect(lineDiff(before, after, 1)).toEqual([
      '@@ -1,1 +1,2 @@',
      '+0',
      ' 1',
      '@@ -7,3 +8,2 @@',
      ' 7',
      '-8',
      ' 9',
    ])
  })

  it('junta en un trozo los cambios cuyo contexto se toca', () => {
    expect(lineDiff(lines('a', 'b', 'c', 'd'), lines('A', 'b', 'C', 'd'), 1)).toEqual([
      '@@ -1,4 +1,4 @@',
      '-a',
      '+A',
      ' b',
      '-c',
      '+C',
      ' d',
    ])
  })

  it('compara contra un texto vacío (una página nueva)', () => {
    expect(lineDiff('', lines('a', 'b'))).toEqual(['@@ -0,0 +1,2 @@', '+a', '+b'])
  })
})
