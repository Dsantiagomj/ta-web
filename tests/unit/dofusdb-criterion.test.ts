import { describe, expect, it } from 'vitest'

import { requiredTerms } from '@/lib/dofusdb/criterion'

// Un criterio de DofusDB une condiciones con & (todas) y | (alguna), con paréntesis.
// Solo es obligatoria una condición que se cumple siempre: unida con & hasta arriba.
describe('requiredTerms', () => {
  it('devuelve las condiciones unidas con &', () => {
    expect(requiredTerms('Ps=1&Pa=1&PL>29&Qf=55')).toEqual(['Ps=1', 'Pa=1', 'PL>29', 'Qf=55'])
  })

  it('un nivel con | son alternativas: ninguna es obligatoria', () => {
    expect(requiredTerms('PL>189|Qf=123')).toEqual([])
    expect(requiredTerms('(PL>50|PL>60)&Qf=1')).toEqual(['Qf=1'])
  })

  it('entra en los paréntesis que solo llevan &', () => {
    expect(
      requiredTerms('((Qf=934&Pm=76284416)|(Qf=935&Pm=76286989))&Qf=10&(Qf=11&Qf=12)'),
    ).toEqual(['Qf=10', 'Qf=11', 'Qf=12'])
  })

  it('sin criterio no hay condiciones', () => {
    expect(requiredTerms(null)).toEqual([])
    expect(requiredTerms('')).toEqual([])
  })
})
