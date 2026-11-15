import { describe, expect, it } from 'vitest'

import {
  chainEnd,
  redirectProblem,
  redirectTarget,
  slugMove,
  SLUG_REDIRECT_COLLECTIONS,
} from '@/lib/redirects/slug-redirects'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'

// Las redirecciones de la colección redirects (AGENTS.md, Redirects): cuando Torre cambia la
// dirección de una página publicada, la vieja lleva a la nueva con un 308.

describe('redirectTarget', () => {
  it('lleva una dirección vieja a la nueva', () => {
    expect(redirectTarget(new Map([['vieja', 'nueva']]), 'vieja')).toBe('nueva')
  })

  it('sin fila, no redirige', () => {
    expect(redirectTarget(new Map([['vieja', 'nueva']]), 'otra')).toBeNull()
  })

  it('sigue una cadena hasta el final, A → B → C da A → C', () => {
    const rows = new Map([
      ['a', 'b'],
      ['b', 'c'],
    ])
    expect(redirectTarget(rows, 'a')).toBe('c')
  })

  it('un bucle no redirige: mejor un 404 que un bucle infinito', () => {
    const rows = new Map([
      ['a', 'b'],
      ['b', 'a'],
    ])
    expect(redirectTarget(rows, 'a')).toBeNull()
    expect(redirectTarget(new Map([['a', 'a']]), 'a')).toBeNull()
  })

  it('compara sin mayúsculas, como las rutas de la tabla antigua', () => {
    expect(redirectTarget(new Map([['vieja', 'nueva']]), 'Vieja')).toBe('nueva')
  })
})

describe('chainEnd', () => {
  it('sin cadena, el destino es el que se escribió', () => {
    expect(chainEnd(new Map(), 'a', 'b')).toEqual({ to: 'b' })
  })

  it('un destino que ya redirige se acorta hasta el final', () => {
    const rows = new Map([
      ['b', 'c'],
      ['c', 'd'],
    ])
    expect(chainEnd(rows, 'a', 'b')).toEqual({ to: 'd' })
  })

  it('un destino que acaba volviendo al origen es un bucle', () => {
    const rows = new Map([
      ['b', 'c'],
      ['c', 'a'],
    ])
    expect(chainEnd(rows, 'a', 'b')).toEqual({ loop: true })
    expect(chainEnd(new Map(), 'a', 'a')).toEqual({ loop: true })
  })

  it('no se sigue a sí misma: al editar A → B, la fila vieja de A no cuenta', () => {
    expect(chainEnd(new Map([['a', 'x']]), 'a', 'b')).toEqual({ to: 'b' })
  })
})

describe('redirectProblem', () => {
  it('acepta dos slugs planos distintos', () => {
    expect(redirectProblem('vieja', 'nueva')).toBeNull()
  })

  it('rechaza una ruta propia del sitio', () => {
    expect(redirectProblem('admin', 'nueva')).toEqual({
      path: 'from',
      message: expect.stringMatching(/\/admin/),
    })
    expect(redirectProblem('vieja', 'checklists')).toEqual({
      path: 'to',
      message: expect.stringMatching(/\/checklists/),
    })
  })

  it('rechaza lo que no es un slug plano', () => {
    expect(redirectProblem('Vieja Guía', 'nueva')).not.toBeNull()
    expect(redirectProblem('vieja', '//otro.com')).not.toBeNull()
  })

  it('rechaza un origen de la tabla de Squarespace: el proxy lo responde antes', () => {
    expect(redirectProblem('home', 'nueva')?.message).toMatch(/tabla de redirecciones/)
  })
})

describe('slugMove', () => {
  it('cambia la dirección solo al publicar con otro slug que el publicado', () => {
    expect(slugMove({ status: 'published', slug: 'vieja' }, 'nueva', 'published')).toEqual({
      from: 'vieja',
      to: 'nueva',
    })
  })

  it('un borrador no mueve nada: la dirección publicada sigue igual', () => {
    expect(slugMove({ status: 'published', slug: 'vieja' }, 'nueva', 'draft')).toBeNull()
  })

  it('lo que nunca se publicó no deja dirección vieja', () => {
    expect(slugMove({ status: 'draft', slug: 'vieja' }, 'nueva', 'published')).toBeNull()
    expect(slugMove(null, 'nueva', 'published')).toBeNull()
  })

  it('el mismo slug no mueve nada', () => {
    expect(slugMove({ status: 'published', slug: 'igual' }, 'igual', 'published')).toBeNull()
  })
})

describe('SLUG_REDIRECT_COLLECTIONS', () => {
  it('son las colecciones de la raíz con página propia: los metalogros abren su panel', () => {
    expect([...SLUG_REDIRECT_COLLECTIONS].sort()).toEqual(
      ROOT_SLUG_COLLECTIONS.filter((c) => c !== 'achievement-groups').sort(),
    )
  })
})
