import { describe, expect, it } from 'vitest'

import { validateSlug } from '@/collections/QuestGuides'
import { availableSlug } from '@/lib/guides/autofill'
import { isGuideSlug, RESERVED_SLUGS } from '@/lib/guides/slug'
import { guideStrings } from '@/lib/guides/strings'

describe('isGuideSlug', () => {
  it('acepta un slug plano que puede ser la URL de una guía', () => {
    expect(isGuideSlug('seis-pies-bajo-tierra')).toBe(true)
    expect(isGuideSlug('dofus-ocre-2')).toBe(true)
  })

  it('rechaza lo que no es un slug antes de consultar la base', () => {
    for (const value of ['favicon.ico', 'Seis-Pies', 'la-misión', '', 'a--b', '-a', '%2e%2e']) {
      expect(isGuideSlug(value), value).toBe(false)
    }
  })

  it('rechaza las rutas propias del sitio: siempre ganan a una guía', () => {
    for (const slug of [
      'admin',
      'api',
      'sistema',
      'vista-previa',
      'metalogros',
      'guias-dofus',
      'checklists',
    ]) {
      expect(RESERVED_SLUGS).toContain(slug)
      expect(isGuideSlug(slug), slug).toBe(false)
    }
  })
})

describe('validateSlug con las rutas del sitio', () => {
  it('rechaza un slug reservado con un mensaje propio', () => {
    expect(validateSlug('sistema')).toBe(guideStrings.admin.slugReserved('sistema'))
  })
})

describe('availableSlug con las rutas del sitio', () => {
  it('un slug reservado cuenta como ocupado', async () => {
    expect(await availableSlug('sistema', async () => false)).toBe('sistema-2')
  })
})
