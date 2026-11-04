import { describe, expect, it } from 'vitest'

import lighthouserc from '../../lighthouserc.cjs'
import { lhciEnv } from '../../scripts/lhci-env.ts'

// Los presupuestos de DESIGN.md (Performance budgets) tal como los comprueba
// `pnpm test:lhci`. Si cambia un límite, cambia DESIGN.md en el mismo PR.
// Cada aserción es [nivel, opciones].
type Assertion = unknown[]
type MatrixEntry = {
  matchingUrlPattern?: string
  preset?: string
  assertions: Record<string, Assertion | undefined>
}
type LighthouseCiConfig = {
  collect: { url: string[]; numberOfRuns: number; settings: Record<string, unknown> }
  assert: { assertMatrix: MatrixEntry[]; assertions?: unknown; preset?: string }
  upload: Record<string, unknown>
}
const ci: LighthouseCiConfig = lighthouserc.ci
const { collect, assert } = ci

// Todas las aserciones de la matriz, de todas sus entradas: [auditoría, aserción].
const all = assert.assertMatrix.flatMap((entry) => Object.entries(entry.assertions))
const assertionsFor = (audit: string) =>
  all.filter(([id, assertion]) => id === audit && assertion).map(([, assertion]) => assertion)

describe('lighthouserc.cjs', () => {
  it('mide en móvil con 4G simulado, tres veces por página', () => {
    expect(collect.numberOfRuns).toBe(3)
    expect(collect.settings.preset).toBeUndefined()
    expect(collect.settings.formFactor ?? 'mobile').toBe('mobile')
    expect(collect.settings.throttlingMethod ?? 'simulate').toBe('simulate')
  })

  it('prueba la portada del servidor local', () => {
    expect(collect.url[0]).toMatch(/^http:\/\/localhost:\d+\/$/)
    for (const url of collect.url) expect(new URL(url).origin).toBe(new URL(collect.url[0]).origin)
  })

  it('aplica cada entrada de la matriz a todas las páginas, sin presets', () => {
    expect(assert.assertMatrix.length).toBeGreaterThan(0)
    expect(assert.assertions).toBeUndefined()
    expect(assert.preset).toBeUndefined()
    for (const entry of assert.assertMatrix) {
      expect(entry.matchingUrlPattern).toBeUndefined()
      expect(entry.preset).toBeUndefined()
    }
  })

  it('falla si la mejor de las tres ejecuciones pasa de 2,5 s de LCP y avisa con la mediana', () => {
    expect(assertionsFor('largest-contentful-paint')).toEqual([
      ['error', { maxNumericValue: 2500, aggregationMethod: 'optimistic' }],
      ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }],
    ])
  })

  it('falla con la mediana de CLS sobre 0,1 o de JavaScript sobre 150 KB comprimido', () => {
    expect(assertionsFor('cumulative-layout-shift')).toEqual([
      ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
    ])
    expect(assertionsFor('resource-summary:script:size')).toEqual([
      ['error', { maxNumericValue: 150_000, aggregationMethod: 'median' }],
    ])
  })

  it('falla con imágenes sin tamaño explícito o sin un formato moderno', () => {
    for (const audit of ['unsized-images', 'image-delivery-insight']) {
      expect(assertionsFor(audit)).toEqual([
        ['error', { minScore: 1, aggregationMethod: 'median' }],
      ])
    }
  })

  it('no exige la puntuación de rendimiento, que varía entre ejecuciones', () => {
    expect(assertionsFor('categories:performance')).toEqual([])
  })

  it('guarda los informes en disco y nunca en el almacenamiento público temporal', () => {
    expect(ci.upload).toEqual({
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    })
  })
})

describe('lhciEnv', () => {
  it('sin DATABASE_URL usa su propia base del Postgres embebido', () => {
    const env = lhciEnv({})

    expect(env.DATABASE_URL).toMatch(/127\.0\.0\.1:54329\/ta_web_lhci$/)
    expect(env.DATABASE_URL_DIRECT).toBe(env.DATABASE_URL)
  })

  it('apunta la URL directa a la misma base que DATABASE_URL, nunca a una real del shell', () => {
    const env = lhciEnv({
      DATABASE_URL: 'postgres://ci@localhost/pruebas',
      DATABASE_URL_DIRECT: 'postgres://real:clave@neon/prod',
    })

    expect(env.DATABASE_URL).toBe('postgres://ci@localhost/pruebas')
    expect(env.DATABASE_URL_DIRECT).toBe('postgres://ci@localhost/pruebas')
  })

  it('arranca sin el modo dev y sin R2', () => {
    const env = lhciEnv({ APP_ENV: 'dev', S3_BUCKET: 'real', MEDIA_BASE_URL: 'https://cdn' })

    expect(env.APP_ENV).toBe('')
    expect(env.S3_BUCKET).toBe('')
    expect(env.MEDIA_BASE_URL).toBe('')
    expect(env.PAYLOAD_SECRET).not.toBe('')
  })
})
