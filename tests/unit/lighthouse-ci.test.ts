import { describe, expect, it } from 'vitest'

import lighthouserc from '../../lighthouserc.cjs'
import { lhciEnv } from '../../scripts/lhci-env.ts'
import { seedGuide } from '../e2e/seed/guides.ts'
import { seedAchievement } from '../e2e/seed/achievements.ts'
import { seedDofus } from '../e2e/seed/dofus-guides.ts'
import { seedChecklists } from '../e2e/seed/checklists.ts'

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
  it('mide en móvil con 4G lento y la CPU 4 veces más lenta aplicados de verdad, tres veces por página', () => {
    expect(collect.numberOfRuns).toBe(3)
    expect(collect.settings.preset).toBeUndefined()
    expect(collect.settings.formFactor ?? 'mobile').toBe('mobile')
    // DevTools frena la red y la CPU de verdad; la simulación (Lantern) carga todo el
    // JavaScript del hilo principal a la imagen LCP.
    expect(collect.settings.throttlingMethod).toBe('devtools')
    // Los valores de móvil 4G lento de Lighthouse, ajustados para DevTools.
    expect(collect.settings.throttling).toMatchObject({
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    })
  })

  it('prueba la portada del servidor local', () => {
    expect(collect.url[0]).toMatch(/^http:\/\/localhost:\d+\/$/)
    for (const url of collect.url) expect(new URL(url).origin).toBe(new URL(collect.url[0]).origin)
  })

  it('mide una guía de misión publicada, la que siembra scripts/seed-e2e.ts', () => {
    const paths = collect.url.map((url) => new URL(url).pathname)
    expect(paths).toContain(`/${seedGuide.slug}`)
  })

  it('mide la página del logro que siembra scripts/seed-e2e.ts', () => {
    const paths = collect.url.map((url) => new URL(url).pathname)
    expect(paths).toContain(`/${seedAchievement.slug}`)
  })

  it('mide el índice de las guías de Dofus y la guía de Dofus que siembra scripts/seed-e2e.ts', () => {
    const paths = collect.url.map((url) => new URL(url).pathname)
    expect(paths).toContain('/guias-dofus')
    expect(paths).toContain(`/${seedDofus.ocre.slug}`)
  })

  it('mide la checklist que siembra scripts/seed-e2e.ts', () => {
    const paths = collect.url.map((url) => new URL(url).pathname)
    expect(paths).toContain(`/${seedChecklists.nebuloso.slug}`)
  })

  it('aplica cada entrada de la matriz a todas las páginas, sin presets, salvo el JavaScript', () => {
    expect(assert.assertMatrix.length).toBeGreaterThan(0)
    expect(assert.assertions).toBeUndefined()
    expect(assert.preset).toBeUndefined()
    for (const entry of assert.assertMatrix) {
      expect(entry.preset).toBeUndefined()
      if (entry.matchingUrlPattern) {
        expect(Object.keys(entry.assertions)).toEqual(['resource-summary:script:size'])
      }
    }
  })

  it('falla si la mejor de las tres ejecuciones pasa de 2,5 s de LCP y avisa con la mediana', () => {
    expect(assertionsFor('largest-contentful-paint')).toEqual([
      ['error', { maxNumericValue: 2500, aggregationMethod: 'optimistic' }],
      ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }],
    ])
  })

  it('falla con la mediana de CLS sobre 0,1', () => {
    expect(assertionsFor('cumulative-layout-shift')).toEqual([
      ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
    ])
  })

  // El presupuesto de JavaScript de cada página: el de la entrada cuyo patrón casa con ella.
  const scriptBudget = (url: string) =>
    assert.assertMatrix
      .filter((entry) => entry.assertions['resource-summary:script:size'])
      .filter(
        (entry) => !entry.matchingUrlPattern || new RegExp(entry.matchingUrlPattern).test(url),
      )
      .map((entry) => entry.assertions['resource-summary:script:size'])

  it('falla con la mediana de JavaScript sobre 150 KB comprimido, y 180 KB en las checklists', () => {
    for (const url of collect.url) {
      const checklist = new URL(url).pathname === `/${seedChecklists.nebuloso.slug}`
      expect(scriptBudget(url)).toEqual([
        ['error', { maxNumericValue: checklist ? 180_000 : 150_000, aggregationMethod: 'median' }],
      ])
    }
  })

  it('falla con imágenes sin tamaño explícito', () => {
    expect(assertionsFor('unsized-images')).toEqual([
      ['error', { minScore: 1, aggregationMethod: 'median' }],
    ])
  })

  it('la entrega de imágenes (anchos responsive, formato) solo avisa', () => {
    expect(assertionsFor('image-delivery-insight')).toEqual([
      ['warn', { minScore: 1, aggregationMethod: 'median' }],
    ])
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
