// Lighthouse CI (pnpm test:lhci): los presupuestos de DESIGN.md (Performance budgets)
// sobre un conjunto fijo de páginas, contra `pnpm start` en local. scripts/lhci.ts
// compila, migra una base vacía y arranca la app en el puerto de estas URL.

const BASE_URL = 'http://localhost:3110'

// Una línea por página. Cada tipo de página entra cuando exista su ruta: una guía de
// misión, un logro y una checklist.
const PAGES = [
  '/', // Portada
]

// Mediana de las tres ejecuciones de cada página.
const median = (options) => ({ ...options, aggregationMethod: 'median' })

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((page) => new URL(page, BASE_URL).href),
      numberOfRuns: 3,
      // Sin preset: móvil emulado con 4G lento simulado, lo que Lighthouse hace por defecto.
      settings: {
        // El Chromium de Playwright en Linux (CI) no arranca con el sandbox de usuario.
        chromeFlags: process.env.CI ? '--no-sandbox' : '',
      },
    },
    assert: {
      assertions: {
        // LCP por debajo de 2,5 s en móvil con 4G.
        'largest-contentful-paint': ['error', median({ maxNumericValue: 2500 })],
        // CLS por debajo de 0,1.
        'cumulative-layout-shift': ['error', median({ maxNumericValue: 0.1 })],
        // JavaScript por debajo de 150 KB comprimido (bytes transferidos, KB de 1000 bytes).
        // DESIGN.md lo fija para las guías; las demás páginas cumplen el mismo límite.
        'resource-summary:script:size': ['error', median({ maxNumericValue: 150_000 })],
        // Cada imagen con width y height explícitos.
        'unsized-images': ['error', median({ minScore: 1 })],
        // Cada imagen en AVIF o WebP (Lighthouse 13 juntó modern-image-formats aquí).
        'image-delivery-insight': ['error', median({ minScore: 1 })],
      },
    },
    upload: {
      // Solo en disco; CI lo sube como artefacto. Nada va al almacenamiento público temporal.
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
}
