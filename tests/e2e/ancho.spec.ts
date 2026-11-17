import { expect, test, type Locator, type Page } from '@playwright/test'

import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'
import { seedPages } from './seed/pages.ts'

// Toda la página a lo ancho de la ventana, alineada a la izquierda (Torre, 2026-11-16;
// DESIGN.md, Layout): ni la cabecera, ni el pie, ni el contenido van en una columna
// centrada. Solo queda el margen lateral (3rem desde 64rem, con la raíz al 110 %: 52,8px).
// El logo de la cabecera empieza donde empieza el contenido.

const GUTTER = 3 * 17.6

// Cada página con la caja que lleva su contenido: su borde izquierdo y el derecho son los
// de la ventana menos el margen.
const pages: { name: string; path: string; box: string }[] = [
  { name: 'la portada', path: '/', box: '.home-wrap' },
  { name: 'una guía de misión', path: `/${seedGuide.slug}`, box: 'main.quest' },
  { name: 'una página del sitio', path: `/${seedPages.emote.slug}`, box: 'main.quest' },
  { name: 'un logro', path: `/${seedAchievement.slug}`, box: 'main.logro' },
  { name: 'una guía de Dofus', path: `/${seedDofus.ocre.slug}`, box: 'main.logro' },
  { name: 'los metalogros', path: '/metalogros', box: 'main.idx' },
  { name: 'las guías de Dofus', path: '/guias-dofus', box: 'main.dg-index' },
  { name: 'las checklists', path: '/checklists', box: 'main.ck-index' },
  { name: 'una checklist', path: `/${seedChecklists.nebuloso.slug}`, box: 'main.ck' },
  { name: 'la página 404', path: '/no-existe-esta-pagina', box: 'main' },
]

/** Los bordes de la caja de contenido: sin el relleno, que es el margen lateral. */
function contentEdges(locator: Locator) {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    return {
      left: rect.left + parseFloat(style.paddingLeft),
      right: rect.right - parseFloat(style.paddingRight),
    }
  })
}

async function expectFullWidth(page: Page, locator: Locator, label: string) {
  const width = page.viewportSize()!.width
  const { left, right } = await contentEdges(locator)
  expect(left, `${label}: borde izquierdo`).toBeCloseTo(GUTTER, 0)
  expect(right, `${label}: borde derecho`).toBeCloseTo(width - GUTTER, 0)
}

for (const width of [1440, 2560]) {
  test.describe(`a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    for (const { name, path, box } of pages) {
      test(`${name}: la cabecera, el contenido y el pie, de margen a margen`, async ({ page }) => {
        await page.goto(path)
        await expectFullWidth(page, page.locator('.site-hdr__in'), 'la cabecera')
        await expectFullWidth(page, page.locator(box).first(), 'el contenido')
        await expectFullWidth(page, page.locator('.site-ft__in'), 'el pie')
        await expectFullWidth(page, page.locator('.site-ft__legal'), 'la banda legal')

        // El logo, donde empieza el contenido.
        const logo = (await page.locator('.site-hdr__in > .lockup').boundingBox())!
        expect(logo.x).toBeCloseTo(GUTTER, 0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      })
    }
  })
}

// Las rejillas llenan la fila con más columnas, sin estirar las tarjetas.
test('las guías de Dofus: cinco por fila a 1440px y más en una pantalla ancha', async ({
  page,
}) => {
  const columns = () =>
    page
      .locator('.dg-grid')
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/guias-dofus')
  expect(await columns()).toBe(5)
  await page.setViewportSize({ width: 2560, height: 900 })
  expect(await columns()).toBeGreaterThanOrEqual(9)
})

test('los carteles de las checklists empiezan a la izquierda, no en el centro', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 900 })
  await page.goto('/checklists')
  const first = (await page.locator('[data-checklist-grid] > li').first().boundingBox())!
  expect(first.x).toBeCloseTo(GUTTER, 0)
})
