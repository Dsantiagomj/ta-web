import { expect, test } from '@playwright/test'

import lighthouserc from '../../lighthouserc.cjs'

// Las hojas de estilo bloquean el primer pintado y, en las páginas cuyo LCP es texto (guía,
// logro, guía de Dofus), deciden el LCP. Por HTTP/1.1 Chrome abre 6 conexiones por
// origen; la fuente precargada (cabecera Link) y la primera imagen del contenido ocupan
// dos. Con una quinta hoja, esa espera a que se libere una conexión, unos 450 ms con el 4G
// lento de pnpm test:lhci, y el LCP pasaba de los 2,5 s del presupuesto (DESIGN.md,
// Performance budgets). Se comprueban las páginas de lighthouserc.cjs: la que se añada
// allí entra sola.
const MAX_STYLESHEETS = 4

const pages: string[] = lighthouserc.ci.collect.url.map((url: string) => new URL(url).pathname)

for (const path of pages) {
  test(`${path} pide como mucho ${MAX_STYLESHEETS} hojas de estilo`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const html = await response.text()
    const sheets = html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? []
    expect(sheets.length, sheets.join('\n')).toBeLessThanOrEqual(MAX_STYLESHEETS)
  })
}
