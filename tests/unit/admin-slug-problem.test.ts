import { describe, expect, it } from 'vitest'

import { validateSlug } from '@/collections/QuestGuides'
import { slugProblem } from '@/lib/admin/slug'
import { panelStrings } from '@/lib/admin/strings'
import { guideStrings } from '@/lib/guides/strings'
import { legacySlugStrings } from '@/lib/redirects/strings'
import { isLegacySource } from '@/lib/redirects/table'

// Lo que la vista previa de «Dirección en la web» dice en vez de la dirección cuando la
// dirección no se va a poder guardar: el mismo mensaje que daría al guardar.

describe('slugProblem', () => {
  it('una dirección buena no tiene problema', () => {
    expect(slugProblem('aprendizaje-escudero')).toBeNull()
  })

  it('vacía, no hay nada que decir todavía: la vista previa pide escribirla', () => {
    expect(slugProblem('')).toBeNull()
    expect(slugProblem(null)).toBeNull()
  })

  it('mal escrita, el mismo mensaje del validador', () => {
    expect(slugProblem('La-Misión')).toBe(panelStrings.slug.format)
    expect(slugProblem('La-Misión')).toBe(validateSlug('La-Misión'))
  })

  it('una ruta del sitio, el mismo mensaje del validador', () => {
    expect(slugProblem('sistema')).toBe(guideStrings.admin.slugReserved('sistema'))
    expect(slugProblem('sistema')).toBe(validateSlug('sistema'))
  })

  it('una dirección de la tabla de redirecciones, el mensaje que daría al guardar', () => {
    expect(isLegacySource('home')).toBe(true)
    expect(slugProblem('home')).toBe(legacySlugStrings.taken('home'))
  })

  it('un metalogro no tiene página propia: la tabla no le tapa nada', () => {
    expect(slugProblem('home', 'metalogro')).toBeNull()
  })
})

describe('validateSlug, junto a la tabla de redirecciones del PR #110', () => {
  it('vacía, su propio mensaje; la tabla la rechaza al guardar, en el hook (tests/integration)', () => {
    expect(validateSlug('')).toBe(panelStrings.slug.required)
    // El validador del campo no mira la tabla: ese mensaje es de rejectSharedSlug.
    expect(validateSlug('home')).toBe(true)
  })
})
