import { describe, expect, it } from 'vitest'

import { validateSlug } from '@/collections/QuestGuides'
import {
  autofillFromQuest,
  availableSlug,
  linkedQuestId,
  seoFromQuest,
  slugFromName,
} from '@/lib/guides/autofill'

const hunter = {
  name: 'El cazador cazado',
  levelMin: 25,
  rewards: { experience: 24_316, kamas: 552, items: [] },
}

describe('slugFromName', () => {
  it('da los mismos slugs que las guías de Torre', () => {
    expect(slugFromName('El cazador cazado')).toBe('el-cazador-cazado')
    expect(slugFromName('Seis pies bajo tierra')).toBe('seis-pies-bajo-tierra')
    expect(slugFromName('Entretanto, un renacer')).toBe('entretanto-un-renacer')
    expect(slugFromName('Intoxicación profunda')).toBe('intoxicacion-profunda')
  })

  it('quita tildes, eñes y signos y pasa validateSlug', () => {
    for (const name of ['¡M.O. Pardy!', 'Mami, ¿qué será lo que quiere el tabi?', 'El dueño']) {
      expect(validateSlug(slugFromName(name))).toBe(true)
    }
    expect(slugFromName('¡M.O. Pardy!')).toBe('m-o-pardy')
    expect(slugFromName('El dueño')).toBe('el-dueno')
  })

  it('un nombre sin letras ni cifras da un slug válido igualmente', () => {
    expect(validateSlug(slugFromName('¿¡…!?'))).toBe(true)
  })
})

describe('availableSlug', () => {
  it('usa el slug tal cual si está libre', async () => {
    expect(await availableSlug('el-cazador-cazado', async () => false)).toBe('el-cazador-cazado')
  })

  it('si está ocupado, añade -2, -3… hasta dar con uno libre', async () => {
    const taken = new Set(['el-cazador-cazado', 'el-cazador-cazado-2'])
    const slug = await availableSlug('el-cazador-cazado', async (candidate) => taken.has(candidate))
    expect(slug).toBe('el-cazador-cazado-3')
    expect(validateSlug(slug)).toBe(true)
  })
})

describe('seoFromQuest', () => {
  it('arma el título y la descripción SEO con el nombre, el nivel y la experiencia', () => {
    expect(seoFromQuest(hunter)).toEqual({
      metaTitle: 'El cazador cazado: guía de la misión de Dofus',
      metaDescription:
        'Guía paso a paso de la misión El cazador cazado de Dofus, de nivel 25: ' +
        'requisitos, recompensas (24 316 XP) y cómo completarla.',
    })
  })

  it('sin nivel ni experiencia, la descripción se las salta', () => {
    expect(seoFromQuest({ name: 'Las estrellas de Nawidad' }).metaDescription).toBe(
      'Guía paso a paso de la misión Las estrellas de Nawidad de Dofus: ' +
        'requisitos, recompensas y cómo completarla.',
    )
  })

  it('la descripción nunca pasa de 160 caracteres', () => {
    const description = seoFromQuest({
      ...hunter,
      name: 'Una misión '.repeat(20).trim(),
    }).metaDescription
    expect(description.length).toBeLessThanOrEqual(160)
    expect(description.endsWith('…')).toBe(true)
  })
})

describe('autofillFromQuest', () => {
  it('rellena título, slug y SEO vacíos desde la misión', () => {
    expect(autofillFromQuest({}, hunter)).toEqual({
      title: 'El cazador cazado',
      slug: 'el-cazador-cazado',
      metaTitle: 'El cazador cazado: guía de la misión de Dofus',
      metaDescription: seoFromQuest(hunter).metaDescription,
    })
  })

  it('nunca toca lo que ya está escrito', () => {
    expect(
      autofillFromQuest(
        { title: 'Mi título', slug: 'mi-slug', metaTitle: 'Mío', metaDescription: '  ' },
        hunter,
      ),
    ).toEqual({ metaDescription: seoFromQuest(hunter).metaDescription })
  })

  it('sin nombre de misión no rellena nada', () => {
    expect(autofillFromQuest({}, { name: '' })).toEqual({})
  })
})

describe('linkedQuestId', () => {
  it('lee la misión como ID o como documento poblado', () => {
    expect(linkedQuestId(7)).toBe(7)
    expect(linkedQuestId({ id: 9 })).toBe(9)
  })

  it('sin misión, no hay ID', () => {
    expect(linkedQuestId(null)).toBeNull()
    expect(linkedQuestId(undefined)).toBeNull()
    expect(linkedQuestId('')).toBeNull()
  })
})
