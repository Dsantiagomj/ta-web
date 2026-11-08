// Lighthouse CI (pnpm test:lhci): los presupuestos de DESIGN.md (Performance budgets)
// sobre un conjunto fijo de páginas, contra `pnpm start` en local. scripts/lhci.ts
// compila, migra una base vacía y arranca la app en el puerto de estas URL.

const BASE_URL = 'http://localhost:3110'

// Una línea por página. Cada tipo de página entra cuando exista su ruta: falta una
// checklist. La guía y el logro los siembra scripts/seed-e2e.ts (tests/e2e/seed/).
const PAGES = [
  '/', // Portada
  '/seis-pies-bajo-tierra', // Guía de misión
  '/la-ocasion-hace-al-ladron', // Logro
  '/metalogros', // Índice de metalogros
]

// Mediana o mejor de las tres ejecuciones de cada página.
const median = (options) => ({ ...options, aggregationMethod: 'median' })
const best = (options) => ({ ...options, aggregationMethod: 'optimistic' })

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((page) => new URL(page, BASE_URL).href),
      numberOfRuns: 3,
      // Sin preset: móvil emulado (412 px, DPR 1,75) con 4G lento y la CPU 4 veces más
      // lenta, pero aplicados de verdad (DevTools) en vez de simulados (Lantern). La
      // simulación carga todo el JavaScript del hilo principal a la imagen LCP: con la
      // primera captura de una guía como LCP daba unos 3 s aunque se pinta a los 150 ms.
      // Con la red y la CPU frenadas de verdad se mide cuándo se pinta.
      settings: {
        throttlingMethod: 'devtools',
        // Los valores de móvil 4G lento de Lighthouse ajustados para DevTools
        // (throttling.mobileSlow4G): 150 ms de RTT y 1,6 Mbps, con la latencia y el
        // caudal que DevTools necesita para dar lo mismo.
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675,
          cpuSlowdownMultiplier: 4,
        },
        // El Chromium de Playwright en Linux (CI) no arranca con el sandbox de usuario.
        chromeFlags: process.env.CI ? '--no-sandbox' : '',
      },
    },
    assert: {
      // Una matriz para poder poner dos aserciones sobre el LCP; sin matchingUrlPattern,
      // cada entrada se aplica a todas las páginas.
      assertMatrix: [
        {
          assertions: {
            // LCP por debajo de 2,5 s en móvil con 4G, en la mejor de las tres ejecuciones,
            // que absorbe el ruido de medir en localhost. Una regresión que haga lentas
            // todas las ejecuciones sigue fallando.
            'largest-contentful-paint': ['error', best({ maxNumericValue: 2500 })],
            // CLS por debajo de 0,1.
            'cumulative-layout-shift': ['error', median({ maxNumericValue: 0.1 })],
            // JavaScript por debajo de 150 KB comprimido (bytes transferidos, KB de 1000 bytes).
            // DESIGN.md lo fija para las guías; las demás páginas cumplen el mismo límite.
            'resource-summary:script:size': ['error', median({ maxNumericValue: 150_000 })],
            // Cada imagen con width y height explícitos.
            'unsized-images': ['error', median({ minScore: 1 })],
            // Entrega de imágenes: solo avisa. Lighthouse 13 juntó aquí uses-responsive-images
            // y modern-image-formats. Emula un móvil de DPR 1,75, donde una captura de 380 px
            // pide el candidato de 800w y el aviso lo cuenta como sobrante; los móviles reales
            // (DPR 2 a 3) reciben el ancho justo de 480/800/1200/1600. El formato AVIF o WebP
            // lo garantizan Picture y las variantes de media, con sus pruebas.
            'image-delivery-insight': ['warn', median({ minScore: 1 })],
          },
        },
        {
          assertions: {
            // La mediana del LCP sobre 2,5 s solo avisa: deja verlo sin parar el PR.
            'largest-contentful-paint': ['warn', median({ maxNumericValue: 2500 })],
          },
        },
      ],
    },
    upload: {
      // Solo en disco; CI lo sube como artefacto. Nada va al almacenamiento público temporal.
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
}
