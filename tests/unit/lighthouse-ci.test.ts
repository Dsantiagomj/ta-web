import { describe, expect, it } from 'vitest'

import lighthouserc from '../../lighthouserc.cjs'
import { lhciEnv } from '../../scripts/lhci-env.ts'

// Los presupuestos de DESIGN.md (Performance budgets) tal como los comprueba
// `pnpm test:lhci`. Si cambia un límite, cambia DESIGN.md en el mismo PR.
// Cada aserción es [nivel, opciones].
type Assertion = unknown[]
type LighthouseCiConfig = {
  collect: { url: string[]; numberOfRuns: number; settings: Record<string, unknown> }
  assert: {
    preset?: string
    assertMatrix?: unknown[]
    assertions: Record<string, Assertion | undefined>
  }
  upload: Record<string, unknown>
}
const ci: LighthouseCiConfig = lighthouserc.ci
const { collect, assert } = ci

const options = (assertion: Assertion | undefined) =>
  assertion?.[1] as Record<string, unknown> | undefined

describe('lighthouserc.cjs', () => {
  it('mide en móvil con 4G simulado, tres veces por página, y se queda con la mediana', () => {
    expect(collect.numberOfRuns).toBe(3)
    expect(collect.settings.preset).toBeUndefined()
    expect(collect.settings.formFactor ?? 'mobile').toBe('mobile')
    expect(collect.settings.throttlingMethod ?? 'simulate').toBe('simulate')
    expect(assert.assertMatrix ?? []).toEqual([])
    for (const assertion of Object.values(assert.assertions)) {
      expect(options(assertion)?.aggregationMethod).toBe('median')
    }
  })

  it('prueba la portada del servidor local', () => {
    expect(collect.url[0]).toMatch(/^http:\/\/localhost:\d+\/$/)
    for (const url of collect.url) expect(new URL(url).origin).toBe(new URL(collect.url[0]).origin)
  })

  it('falla con LCP de 2,5 s, CLS de 0,1 o 150 KB de JavaScript comprimido', () => {
    expect(assert.assertions['largest-contentful-paint']).toEqual([
      'error',
      { maxNumericValue: 2500, aggregationMethod: 'median' },
    ])
    expect(assert.assertions['cumulative-layout-shift']).toEqual([
      'error',
      { maxNumericValue: 0.1, aggregationMethod: 'median' },
    ])
    expect(assert.assertions['resource-summary:script:size']).toEqual([
      'error',
      { maxNumericValue: 150_000, aggregationMethod: 'median' },
    ])
  })

  it('falla con imágenes sin tamaño explícito o sin un formato moderno', () => {
    expect(assert.assertions['unsized-images']?.[0]).toBe('error')
    expect(assert.assertions['image-delivery-insight']?.[0]).toBe('error')
  })

  it('no exige la puntuación de rendimiento, que varía entre ejecuciones', () => {
    expect(assert.preset).toBeUndefined()
    expect(assert.assertions['categories:performance']).toBeUndefined()
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
