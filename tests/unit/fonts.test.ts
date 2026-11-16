import { readFileSync } from 'node:fs'
import { calculateSizeAdjustValues } from 'next/dist/server/font-utils'
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
    Montserrat: loader('Montserrat'),
    Lilita_One: loader('Lilita One'),
    Rowdies: loader('Rowdies'),
    Lexend: loader('Lexend'),
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
  it('Montserrat es el texto: una sola instancia, precargada', () => {
    const montserrat = calls.filter(({ family }) => family === 'Montserrat')
    expect(montserrat).toHaveLength(1)
    expect(montserrat[0].options.preload).not.toBe(false)
    // Es una fuente variable: los cinco pesos salen del mismo archivo, que es lo único
    // que se precarga.
    expect(familyWeights('Montserrat')).toEqual(['400', '500', '600', '700', '800'])
  })

  it('se precargan Montserrat y Rowdies, la del h1; ni Nunito ni Fredoka se cargan ya', () => {
    const preloaded = calls
      .filter(({ options }) => options.preload !== false)
      .map(({ family }) => family)
      .sort()
    expect(preloaded).toEqual(['Montserrat', 'Rowdies'])
    expect(calls.map(({ family }) => family).sort()).toEqual([
      'Lexend',
      'Lilita One',
      'Montserrat',
      'Rowdies',
    ])
  })

  it('Rowdies, los títulos de página, trae solo el 700', () => {
    const rowdies = calls.filter(({ family }) => family === 'Rowdies')
    expect(rowdies).toHaveLength(1)
    expect(familyWeights('Rowdies')).toEqual(['700'])
    expect(rowdies[0].options.variable).toBe('--font-rowdies')
  })

  it('Lexend, la interfaz, es una instancia con 500, 600 y 700, sin precargar', () => {
    const lexend = calls.filter(({ family }) => family === 'Lexend')
    expect(lexend).toHaveLength(1)
    expect(familyWeights('Lexend')).toEqual(['500', '600', '700'])
    expect(lexend[0].options.variable).toBe('--font-lexend')
    expect(lexend[0].options.preload).toBe(false)
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

describe('respaldos y tokens de las fuentes', () => {
  const fallbacks = readFileSync('src/styles/fonts-fallback.css', 'utf8')
  const theme = readFileSync('src/styles/theme.css', 'utf8')

  /** Las propiedades de la @font-face «<familia> Fallback Linux». */
  const face = (family: string) => {
    const body =
      new RegExp(`font-family: '${family} Fallback Linux';([^}]*)\\}`).exec(fallbacks)?.[1] ?? ''
    // En porcentaje, como número: next/font escribe «0.00» y el CSS «0».
    return Object.fromEntries(
      [...body.matchAll(/([\w-]+):\s*([\d.]+)%;/g)].map(([, k, v]) => [k, Number(v)]),
    )
  }

  it('cada familia tiene su respaldo sin Arial con los valores que calcula next/font', () => {
    for (const family of new Set(calls.map((call) => call.family))) {
      const metrics = calculateSizeAdjustValues(family)
      expect(face(family), family).toMatchObject({
        'ascent-override': Number(metrics.ascent),
        'descent-override': Number(metrics.descent),
        'line-gap-override': Number(metrics.lineGap),
        'size-adjust': Number(metrics.sizeAdjust),
      })
    }
  })

  it('--font-title es Rowdies y --font-ui es Lexend, con sus respaldos', () => {
    const token = (name: string) =>
      new RegExp(`${name}:\\s*([^;]+);`).exec(theme)?.[1].replace(/\s+/g, ' ') ?? ''
    expect(token('--font-title')).toMatch(
      /^var\(--font-rowdies\), 'Rowdies Fallback Linux', 'Rowdies',/,
    )
    expect(token('--font-ui')).toMatch(/^var\(--font-lexend\), 'Lexend Fallback Linux', 'Lexend',/)
  })
})
