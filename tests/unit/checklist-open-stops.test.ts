import { describe, expect, it } from 'vitest'

import { openStops } from '@/lib/checklists/open-stops'

// Lo que un paso deja a medias (openOf de silvestre-checklist), por misión: el objetivo donde
// se queda y si la termina un paso posterior en vez del que cierra este.

const stop = (quest: number, stopObjective: number, extra: Record<string, unknown> = {}) => ({
  kind: 'stop',
  text: 'Para.',
  quest,
  stopObjective,
  ...extra,
})
const resolve = { kind: 'resolve', text: 'Se resuelve.' }
const open = (segments: unknown[], closed = false) =>
  Object.fromEntries(openStops(segments as never, closed))

describe('openStops', () => {
  it('sin verde, cada parada se queda abierta, también las de «más paradas»', () => {
    expect(open([stop(5, 1, { more: [{ quest: 6, stopObjective: 2 }] })])).toEqual({
      5: { at: 1, later: false },
      6: { at: 2, later: false },
    })
  })

  it('con verde, el paso se resuelve en sí mismo: no deja nada', () => {
    expect(open([stop(5, 1), resolve])).toEqual({})
  })

  it('con verde pero cerrado por otro paso, sus paradas se quedan abiertas', () => {
    expect(open([stop(5, 1), resolve], true)).toEqual({ 5: { at: 1, later: false } })
  })

  it('el verde que deja una parada: queda abierta esa, no la de antes', () => {
    expect(open([stop(5, 0), resolve, stop(6, 2)], true)).toEqual({ 6: { at: 2, later: false } })
  })

  it('la que termina un paso posterior se queda aunque el paso se resuelva, en su objetivo', () => {
    const segments = [stop(5, 0, { more: [{ quest: 5, stopObjective: 3, later: true }] }), resolve]
    expect(open(segments)).toEqual({ 5: { at: 3, later: true } })
    expect(open(segments, true)).toEqual({ 5: { at: 3, later: true } })
  })

  it('varias paradas en una misión: la primera; un tramo sin misión no deja nada', () => {
    expect(
      open([
        stop(5, 2, { more: [{ quest: 5, stopObjective: 1 }] }),
        { kind: 'stop', text: 'Solo avisa.', quest: null },
      ]),
    ).toEqual({ 5: { at: 1, later: false } })
  })

  it('lee la misión poblada o por su ID', () => {
    expect(open([stop({ id: 9 } as never, 0)])).toEqual({ 9: { at: 0, later: false } })
  })
})
