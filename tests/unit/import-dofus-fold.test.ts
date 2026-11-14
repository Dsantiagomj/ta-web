import { describe, expect, it } from 'vitest'

import { fold } from '../../scripts/import/dofus-guides/fold'

// Los nombres de Torre frente a los del juego: sin mayúsculas, tildes ni signos.

describe('fold', () => {
  it('los puntos suspensivos cuentan igual escritos «...» o «…»', () => {
    expect(fold('¡No... puedes... bajar!')).toBe(fold('¡No… puedes… bajar!'))
    expect(fold('¡No… puedes… bajar!')).toBe('no puedes bajar')
  })

  it('sin mayúsculas ni tildes', () => {
    expect(fold('El Héroe de Sufokia')).toBe('el heroe de sufokia')
  })
})
