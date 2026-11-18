import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { calculateSizeAdjustValues } from 'next/dist/server/font-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// Las opciones con las que src/styles/fonts.ts llama a next/font/local. next/font solo
// funciona dentro del compilador de Next, así que aquí se sustituye por un registro.
type FontSource = { path: string; weight?: string; style?: string }
type FontOptions = {
  src: string | FontSource[]
  weight?: string
  style?: string
  variable: string
  display?: string
  preload?: boolean
  adjustFontFallback?: string | false
  fallback?: string[]
  declarations?: { prop: string; value: string }[]
}

const calls = vi.hoisted(() => [] as FontOptions[])

vi.mock('next/font/local', () => ({
  default: (options: FontOptions) => {
    calls.push(options)
    return { variable: `variable-${calls.length}`, className: '', style: { fontFamily: '' } }
  },
}))

const FONTS_MODULE = 'src/styles/fonts.ts'

// Turbopack nombra la familia de next/font/local como la constante que recibe la llamada
// (una declaración font-family cambia la @font-face pero no la variable CSS). La constante
// es, por tanto, el nombre de la familia en el CSS, y las pruebas E2E lo leen así.
const families = [...readFileSync(FONTS_MODULE, 'utf8').matchAll(/const (\w+) = localFont\(/g)].map(
  ([, name]) => name,
)

// El nombre de cada familia en Google Fonts, del que next/font sacaba las métricas.
const GOOGLE_NAMES: Record<string, string> = {
  Montserrat: 'Montserrat',
  Rowdies: 'Rowdies',
  Lexend: 'Lexend',
  LilitaOne: 'Lilita One',
}

// El subconjunto latin de Google Fonts: el único que se sirve.
const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'

// Si el módulo no carga (por ejemplo, vuelve a usar next/font/google, que aquí no existe),
// no hay llamadas y fallan las pruebas que las cuentan, con el escaneo de arriba diciendo por qué.
let importError: unknown
beforeAll(async () => {
  await import('@/styles/fonts').catch((error: unknown) => {
    importError = error
  })
})

const sources = (options: FontOptions): FontSource[] =>
  typeof options.src === 'string'
    ? [{ path: options.src, weight: options.weight, style: options.style }]
    : options.src

const call = (family: string) => {
  const index = families.indexOf(family)
  expect(index, family).toBeGreaterThanOrEqual(0)
  return calls[index]
}

const weights = (family: string) =>
  sources(call(family))
    .map((source) => source.weight)
    .sort()

/** Los archivos de un directorio y sus subdirectorios. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile())
}

describe('fuentes', () => {
  it('nada carga fuentes de Google al compilar: ni src/ ni next.config.ts importan next/font/google', () => {
    // next/font/google descarga las fuentes en cada build; cuando Google falla, el build
    // entero cae («Can't resolve '@vercel/turbopack-next/internal/font/google/font'»).
    const offenders = [...filesUnder('src'), 'next.config.ts'].filter(
      (path) =>
        /\.(ts|tsx|js|jsx|mjs|cjs|css|scss)$/.test(path) && // El módulo entre comillas: un import, un require o un import() dinámico; no un comentario.
        /['"]next\/font\/google['"]/.test(readFileSync(path, 'utf8')),
    )
    expect(offenders).toEqual([])
  })

  it('una llamada a next/font/local por familia, cada una con su constante', () => {
    expect(importError).toBeUndefined()
    expect(families).toEqual(['Montserrat', 'Rowdies', 'Lexend', 'LilitaOne'])
    expect(calls).toHaveLength(families.length)
  })

  it('cada archivo de fuente está en el repositorio y es woff2', () => {
    for (const [index, options] of calls.entries()) {
      for (const { path } of sources(options)) {
        const file = resolve('src/styles', path)
        expect(path, families[index]).toMatch(/\.woff2$/)
        expect(existsSync(file), file).toBe(true)
        // Un archivo woff2 de verdad, no un puntero de Git LFS ni un HTML de error.
        expect(readFileSync(file).subarray(0, 4).toString('latin1'), file).toBe('wOF2')
      }
    }
  })

  it('Montserrat es el texto: un archivo variable para los cinco pesos, precargado', () => {
    const montserrat = call('Montserrat')
    expect(montserrat.preload).not.toBe(false)
    expect(weights('Montserrat')).toEqual(['400', '500', '600', '700', '800'])
    expect(new Set(sources(montserrat).map(({ path }) => path)).size).toBe(1)
    expect(montserrat.variable).toBe('--font-montserrat')
  })

  it('se precargan Montserrat y Rowdies, la del h1, y nada más', () => {
    const preloaded = families.filter((_, index) => calls[index].preload !== false)
    expect(preloaded.sort()).toEqual(['Montserrat', 'Rowdies'])
  })

  it('Rowdies, los títulos de página, trae solo el 700', () => {
    expect(weights('Rowdies')).toEqual(['700'])
    expect(call('Rowdies').variable).toBe('--font-rowdies')
  })

  it('Lexend, la interfaz, es un archivo con 500, 600 y 700, sin precargar', () => {
    const lexend = call('Lexend')
    expect(weights('Lexend')).toEqual(['500', '600', '700'])
    expect(new Set(sources(lexend).map(({ path }) => path)).size).toBe(1)
    expect(lexend.variable).toBe('--font-lexend')
    expect(lexend.preload).toBe(false)
  })

  it('Lilita One trae solo el 400, sin precargar', () => {
    const lilita = call('LilitaOne')
    expect(weights('LilitaOne')).toEqual(['400'])
    expect(lilita.variable).toBe('--font-lilita-one')
    expect(lilita.preload).toBe(false)
  })

  it('cada instancia: display swap, el rango latin y el respaldo de métricas de Google', () => {
    for (const [index, options] of calls.entries()) {
      const family = families[index]
      expect(options.display, family).toBe('swap')
      expect(options.declarations, family).toContainEqual({
        prop: 'unicode-range',
        value: LATIN_RANGE,
      })
      // next/font/local calcularía otras métricas desde el archivo (Montserrat: 110,19 % en
      // vez de 112,83 %). El respaldo es la cara «<Familia> Fallback» de fonts-fallback.css,
      // con los valores de Google de siempre.
      expect(options.adjustFontFallback, family).toBe(false)
      expect(options.fallback, family).toEqual([`${GOOGLE_NAMES[family]} Fallback`])
      for (const source of sources(options)) expect(source.style ?? 'normal', family).toBe('normal')
    }
  })
})

describe('respaldos y tokens de las fuentes', () => {
  const fallbacks = readFileSync('src/styles/fonts-fallback.css', 'utf8')
  const theme = readFileSync('src/styles/theme.css', 'utf8')

  /** Las propiedades de la primera @font-face de una familia, la de peso normal. */
  const face = (fontFamily: string) => {
    const body = new RegExp(`font-family: '${fontFamily}';([^}]*)\\}`).exec(fallbacks)?.[1] ?? ''
    // En porcentaje, como número: next/font escribe «0.00» y el CSS «0».
    return Object.fromEntries(
      [...body.matchAll(/([\w-]+):\s*([\d.]+)%;/g)].map(([, k, v]) => [k, Number(v)]),
    )
  }

  it('fonts-fallback.css solo tiene comentarios y reglas @font-face completas', () => {
    // Un comentario roto deja texto suelto que el compilador de CSS descarta junto con la
    // regla siguiente: esa cara de respaldo desaparecería sin que nada más fallara.
    const rules = fallbacks.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^{}]*\}/g, '')
    expect(rules.trim()).toBe('')
  })

  it('cada familia tiene sus respaldos, sobre Arial y sin Arial, con los valores que calcula next/font', () => {
    for (const family of families) {
      const name = GOOGLE_NAMES[family]
      const metrics = calculateSizeAdjustValues(name)
      const expected = {
        'ascent-override': Number(metrics.ascent),
        'descent-override': Number(metrics.descent),
        'line-gap-override': Number(metrics.lineGap),
        'size-adjust': Number(metrics.sizeAdjust),
      }
      expect(face(`${name} Fallback`), name).toMatchObject(expected)
      expect(face(`${name} Fallback Linux`), name).toMatchObject(expected)
    }
  })

  it('el respaldo «<Familia> Fallback» de peso normal es Arial, como el que generaba next/font', () => {
    for (const family of families) {
      const name = GOOGLE_NAMES[family]
      const body =
        new RegExp(`font-family: '${name} Fallback';([^}]*)\\}`).exec(fallbacks)?.[1] ?? ''
      expect(body, name).toContain("src: local('Arial');")
      expect(body, name).not.toContain('font-weight')
    }
  })

  it('Lexend tiene respaldos en negrita, con el ancho de Lexend 600 y 700', () => {
    // Sin ellos, los títulos de Lexend 700 se pintan con la cara normal de Arial (no se
    // sintetizan negritas), más estrecha: al llegar Lexend cambian de líneas y mueven la página
    // (CLS 0,12 en /metalogros en Lighthouse CI).
    const faces = [...fallbacks.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => body)
    const bold = (family: string, weight: string) =>
      faces.find(
        (body) =>
          body.includes(`font-family: '${family}';`) && body.includes(`font-weight: ${weight};`),
      ) ?? ''
    for (const family of ['Lexend Fallback', 'Lexend Fallback Linux']) {
      expect(bold(family, '600'), family).toMatch(/size-adjust: 104\.01%;/)
      expect(bold(family, '700 800'), family).toMatch(/size-adjust: 105\.85%;/)
    }
    expect(bold('Lexend Fallback', '700 800')).toContain("local('Arial Bold')")
    expect(bold('Lexend Fallback Linux', '700 800')).toContain("local('Liberation Sans Bold')")
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
