// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'

import { paintProgressState } from '@/components/checklist/progress-shared'
import { progressState } from '@/lib/checklists/progress/state'

// El estado de una checklist según su porcentaje: el huevo de la cabecera sigue apagado hasta
// el 100 % y solo entonces se enciende (DESIGN.md, Checklists).
describe('progressState', () => {
  it('0 es sin empezar, de 0,1 a 99,9 en curso y 100 completa', () => {
    expect(progressState(0)).toBe('todo')
    expect(progressState(0.1)).toBe('doing')
    expect(progressState(1)).toBe('doing')
    expect(progressState(46)).toBe('doing')
    expect(progressState(99.9)).toBe('doing')
    expect(progressState(100)).toBe('done')
  })
})

describe('paintProgressState', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lo escribe en la raíz de la checklist, data-ck-state', () => {
    document.body.innerHTML = '<main class="ck"><header class="ck-head"></header></main>'
    const root = document.querySelector('main')!
    paintProgressState(0)
    expect(root.dataset.ckState).toBe('todo')
    paintProgressState(12.5)
    expect(root.dataset.ckState).toBe('doing')
    paintProgressState(100)
    expect(root.dataset.ckState).toBe('done')
  })

  it('sin la raíz no hace nada', () => {
    expect(() => paintProgressState(50)).not.toThrow()
  })
})
