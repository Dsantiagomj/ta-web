import { beforeAll, describe, expect, it, vi } from 'vitest'

// Las opciones con las que src/styles/fonts.ts llama a next/font/google. next/font solo
// funciona dentro del compilador de Next, así que aquí se sustituye por un registro.
type FontOptions = {
  subsets: string[]
  weight: string | string[]
  variable: string
  display?: string
  preload?: boolean
  adjustFontFallback?: boolean
}

const calls = vi.hoisted(() => new Map<string, FontOptions>())

vi.mock('next/font/google', () => {
  const loader = (family: string) => (options: FontOptions) => {
    calls.set(family, options)
    return { variable: `variable-${family}`, className: '', style: { fontFamily: family } }
  }
  return {
    Barlow: loader('Barlow'),
    Barlow_Condensed: loader('Barlow Condensed'),
    Lilita_One: loader('Lilita One'),
  }
})

beforeAll(async () => {
  await import('@/styles/fonts')
})

const options = (family: string) => {
  const found = calls.get(family)
  if (!found) throw new Error(`fonts.ts no carga ${family}`)
  return found
}

describe('fuentes', () => {
  it('precarga solo las familias del primer pintado: Barlow y Barlow Condensed', () => {
    const preloaded = [...calls].filter(([, o]) => o.preload !== false).map(([family]) => family)

    expect(preloaded.sort()).toEqual(['Barlow', 'Barlow Condensed'])
  })

  it('Barlow Condensed trae solo los pesos de la escala de DESIGN.md: 700 y 800', () => {
    expect(options('Barlow Condensed').weight).toEqual(['700', '800'])
  })

  it('Barlow trae 400 a 700: texto, controles, chips y negritas del cuerpo', () => {
    expect(options('Barlow').weight).toEqual(['400', '500', '600', '700'])
  })

  it('Lilita One trae solo el 400', () => {
    expect(options('Lilita One').weight).toBe('400')
  })

  it.each(['Barlow', 'Barlow Condensed', 'Lilita One'])(
    '%s: solo latin, display swap y respaldo con métricas ajustadas',
    (family) => {
      const font = options(family)

      expect(font.subsets).toEqual(['latin'])
      expect(font.display).toBe('swap')
      expect(font.adjustFontFallback).not.toBe(false)
    },
  )
})
