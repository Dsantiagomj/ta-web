import { describe, expect, it } from 'vitest'

import { roadState } from '@/lib/checklists/road'

// El huevo de la cabecera del rush: el primer Dofus del camino cuyo paso no está hecho, en gris;
// con todos hechos, el último, encendido.
describe('roadState', () => {
  it('sin progreso, el primero', () => {
    expect(roadState([false, false, false])).toEqual({ current: 0, finished: false })
  })

  it('el primero cuyo paso falta, aunque haya otros hechos más adelante', () => {
    expect(roadState([true, false, true])).toEqual({ current: 1, finished: false })
  })

  it('con todos hechos, el último y el camino terminado', () => {
    expect(roadState([true, true, true])).toEqual({ current: 2, finished: true })
  })

  it('sin camino, nada que enseñar', () => {
    expect(roadState([])).toBeNull()
  })
})
