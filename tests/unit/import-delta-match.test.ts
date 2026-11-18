import { describe, expect, it } from 'vitest'

import {
  looksLikeQuestGuide,
  neverQuestGuide,
  questMatcher,
  slugVariants,
} from '../../scripts/import/delta/match'

describe('questMatcher', () => {
  const match = questMatcher([
    { dofusId: 1607, name: 'Se busca: Agrisombra' },
    { dofusId: 2001, name: 'Corazón de piedra' },
    { dofusId: 2002, name: 'Formación de primer año' },
    { dofusId: 3001, name: 'Doble' },
    { dofusId: 3002, name: 'Doble' },
  ])

  it('casa por el slug de Squarespace, sin acentos y con o sin la ñ', () => {
    expect(match('se-busca-agrisombra', [])).toEqual({ questIds: [1607], ambiguous: false })
    expect(match('corazon-de-piedra', [])).toEqual({ questIds: [2001], ambiguous: false })
    expect(match('formacion-de-primer-ao', [])).toEqual({ questIds: [2002], ambiguous: false })
  })

  it('casa por el título, también sin el prefijo de tipo, y por el slug sin su número final', () => {
    expect(match('otra-cosa', ['Se busca: Agrisombra'])).toEqual({
      questIds: [1607],
      ambiguous: false,
    })
    expect(match('otra-cosa', ['Misión: Corazón de piedra'])).toEqual({
      questIds: [2001],
      ambiguous: false,
    })
    expect(match('corazon-de-piedra-1', [])).toEqual({ questIds: [2001], ambiguous: false })
  })

  it('varias misiones son un cruce ambiguo, y ninguna es ninguno', () => {
    expect(match('doble', [])).toEqual({ questIds: [3001, 3002], ambiguous: true })
    expect(match('hablar-con-volkaragnar', ['HABLAR CON VOLKARAGNAR'])).toEqual({
      questIds: [],
      ambiguous: false,
    })
  })
})

describe('slugVariants', () => {
  it('da el slug con la ñ quitada, como Squarespace, y con n', () => {
    expect(slugVariants('Formación de primer año')).toEqual([
      'formacion-de-primer-ao',
      'formacion-de-primer-ano',
    ])
  })
})

describe('looksLikeQuestGuide', () => {
  it('dos etiquetas del resumen, o Prerrequisitos con coordenadas', () => {
    expect(looksLikeQuestGuide('Prerrequisitos: nada. Recompensas: 10 XP')).toBe(true)
    expect(looksLikeQuestGuide('PRERREQUISITOS: La larga marcha. Ve a [-29,25]')).toBe(true)
    expect(looksLikeQuestGuide('Necesitarás: una pala')).toBe(false)
    expect(looksLikeQuestGuide('Una página con [1,2] y nada más')).toBe(false)
  })

  it('las checklists, sus datos, los metalogros y los logros no son guías de misión', () => {
    expect(neverQuestGuide('checklist-todos-dofus')).toBe(true)
    expect(neverQuestGuide('checklist-nebuloso-datos')).toBe(true)
    expect(neverQuestGuide('metalogro-incarnam')).toBe(true)
    expect(neverQuestGuide('se-busca-atcham')).toBe(false)
  })
})
