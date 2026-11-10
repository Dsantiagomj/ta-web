import { describe, expect, it, vi } from 'vitest'

import { smoothUpdate } from '@/components/ui/view-transition'

// Las islas cambian la página dentro de una transición de vista cuando el navegador la
// tiene y el lector no pide movimiento reducido; si no, cambian sin más.

const env = ({ reduced = false, start }: { reduced?: boolean; start?: unknown } = {}) => ({
  document: { startViewTransition: start } as unknown as Document,
  matchMedia: ((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
  })) as unknown as typeof window.matchMedia,
})

describe('smoothUpdate', () => {
  it('pasa el cambio y su tipo a la transición de vista', () => {
    const start = vi.fn()
    const update = vi.fn()
    smoothUpdate(update, 'metalogros', env({ start }))
    expect(start).toHaveBeenCalledWith({ update, types: ['metalogros'] })
    expect(update).not.toHaveBeenCalled()
  })

  it('sin transiciones de vista, cambia en el acto', () => {
    const update = vi.fn()
    smoothUpdate(update, 'metalogros', env())
    expect(update).toHaveBeenCalledOnce()
  })

  it('con movimiento reducido, cambia en el acto sin transición', () => {
    const start = vi.fn()
    const update = vi.fn()
    smoothUpdate(update, 'metalogros', env({ reduced: true, start }))
    expect(start).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledOnce()
  })

  it('un navegador que solo acepta la función recibe la función', () => {
    const update = vi.fn()
    const start = vi.fn((arg: unknown) => {
      if (typeof arg !== 'function') throw new TypeError('not a function')
      arg()
    })
    smoothUpdate(update, 'metalogros', env({ start }))
    expect(start).toHaveBeenLastCalledWith(update)
    expect(update).toHaveBeenCalledOnce()
  })
})
