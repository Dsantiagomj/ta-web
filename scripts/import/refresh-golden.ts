// Vuelve a bajar de la web de Torre las 30 páginas de oro de pnpm test:import
// (golden/catalog.ts), guarda su fuente recortada en tests/fixtures/import-golden/pages/ y
// enseña, página a página, en qué cambia lo que sale del conversor respecto a la salida
// revisada de tests/fixtures/import-golden/expected/. Va antes de la importación delta: una
// persona revisa el diff (lo que Torre cambió en Squarespace y cómo lo lee la importación) y,
// si está bien, lo acepta con pnpm test:import -u. No escribe en ninguna base ni sube nada.
// Uso: pnpm import:golden-refresh
// Baja las páginas de una en una, con una pausa entre ellas. Sale con 1 si alguna falla (no
// responde, redirige a otra o el recorte pierde algo); su fuente anterior se queda.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

import { GOLDEN_PAGES } from './golden/catalog'
import { goldenOutput } from './golden/convert'
import { refreshGoldenPages } from './golden/refresh'
import { releaseDom } from './squarespace/dom'

const FIXTURES = path.resolve(import.meta.dirname, '../../tests/fixtures/import-golden')

const readOrNull = (file: string) =>
  readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })

try {
  const report = await refreshGoldenPages({
    pages: GOLDEN_PAGES,
    fetchPage: async (slug) => {
      const response = await fetch(`${LEGACY_SITE_ORIGIN}/${slug}`, {
        headers: { 'User-Agent': 'ta-web/importacion' },
        signal: AbortSignal.timeout(30_000),
      })
      return { status: response.status, url: response.url, html: await response.text() }
    },
    readExpected: (slug) => readOrNull(path.join(FIXTURES, 'expected', `${slug}.json`)),
    writeSource: (slug, html) => writeFile(path.join(FIXTURES, 'pages', `${slug}.html`), html),
    convert: goldenOutput,
    sleep: async (ms) => {
      // Cada página parseada retiene su DOM: se suelta en la pausa.
      await releaseDom()
      await new Promise((resolve) => setTimeout(resolve, ms))
    },
    delayMs: 1000,
  })
  await releaseDom()

  for (const { slug, diff } of report.changed) {
    console.log(`\n=== ${slug}`)
    for (const line of diff) console.log(line)
  }
  console.log(
    `\n${GOLDEN_PAGES.length} páginas: ${report.changed.length} cambian, ` +
      `${report.unchanged.length} igual, ${report.failed.length} fallan.`,
  )
  for (const { slug, reason } of report.failed) console.log(`Falla ${slug}: ${reason}`)
  if (report.changed.length) {
    console.log(
      'Revisa cada diff contra la página de Squarespace. Si está bien, acéptalo con ' +
        'pnpm test:import -u y revisa el git diff de tests/fixtures/import-golden/.',
    )
  }
  if (report.failed.length) process.exit(1)
} catch (error) {
  console.error('El refresco de las páginas de oro falló:', error)
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
