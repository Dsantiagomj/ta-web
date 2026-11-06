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

const calls = vi.hoisted(() => [] as { family: string; options: FontOptions }[])

vi.mock('next/font/google', () => {
  const loader = (family: string) => (options: FontOptions) => {
    calls.push({ family, options })
    return { variable: `variable-${family}`, className: '', style: { fontFamily: family } }
  }
  return {
    Nunito: loader('Nunito'),
    Fredoka: loader('Fredoka'),
    Lilita_One: loader('Lilita One'),
  }
})

beforeAll(async () => {
  await import('@/styles/fonts')
})

const weights = (options: FontOptions) =>
  Array.isArray(options.weight) ? options.weight : [options.weight]

/** Los pesos de una familia, juntando todas sus instancias. */
const familyWeights = (family: string) =>
  calls
    .filter((call) => call.family === family)
    .flatMap((call) => weights(call.options))
    .sort()

describe('fuentes', () => {
  it('precarga solo dos archivos: Nunito 400 (texto) y Fredoka 600 (titulares)', () => {
    const preloaded = calls
      .filter(({ options }) => options.preload !== false)
      .map(({ family, options }) => `${family} ${weights(options).join(',')}`)

    expect(preloaded.sort()).toEqual(['Fredoka 600', 'Nunito 400'])
  })

  it('Nunito trae 400 a 800: texto, controles, chips, negritas y cantidades', () => {
    expect(familyWeights('Nunito')).toEqual(['400', '500', '600', '700', '800'])
  })

  it('Fredoka trae solo los pesos de la escala de DESIGN.md: 500 y 600', () => {
    expect(familyWeights('Fredoka')).toEqual(['500', '600'])
  })

  it('Lilita One trae solo el 400, sin precargar', () => {
    const lilita = calls.filter(({ family }) => family === 'Lilita One')
    expect(lilita.map(({ options }) => options.weight)).toEqual(['400'])
    expect(lilita[0].options.preload).toBe(false)
  })

  it('cada instancia: solo latin, display swap y respaldo con métricas ajustadas', () => {
    expect(calls.length).toBeGreaterThan(0)
    for (const { family, options } of calls) {
      expect(options.subsets, family).toEqual(['latin'])
      expect(options.display, family).toBe('swap')
      expect(options.adjustFontFallback, family).not.toBe(false)
    }
  })
})
