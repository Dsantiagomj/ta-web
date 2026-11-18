import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { seedPages } from './seed/pages.ts'

// El bloque Tabla (backlog D-02, DESIGN.md, Table block) en el tutorial sembrado por
// scripts/seed-e2e.ts: una tabla de verdad, con nombre, encabezados y cifras a la derecha,
// que en un móvil se desplaza de lado dentro de su caja y nunca la página.

const { tutorial } = seedPages
const { table } = tutorial

const tableOf = (page: Page) => page.getByRole('table', { name: table.title })
const regionOf = (page: Page) => page.getByRole('region', { name: table.title })

test.describe('la tabla de una página', () => {
  test('lleva su título, sus encabezados de columna y de fila, y todas sus filas', async ({
    page,
  }) => {
    const response = await page.goto(`/${tutorial.slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByText(tutorial.intro)).toBeVisible()

    const grid = tableOf(page)
    await expect(grid).toBeVisible()
    // El título se ve una sola vez, encima de la tabla.
    await expect(page.getByText(table.title, { exact: true })).toHaveCount(1)
    await expect(page.getByText(table.title, { exact: true })).toBeVisible()
    await expect(grid.getByRole('columnheader')).toHaveText(
      table.columns.map(({ header }) => new RegExp(`^${header}$`, 'i')),
    )
    await expect(grid.getByRole('rowheader')).toHaveText(table.rows.map(([name]) => name))
    // Una fila de encabezados y una por cada fila de Torre.
    await expect(grid.getByRole('row')).toHaveCount(table.rows.length + 1)
    const jalatin = grid.getByRole('row', { name: /Jalatín/ })
    await expect(jalatin.getByRole('cell')).toHaveText(table.rows[4].slice(1))
  })

  test('las cifras van a la derecha y en cifras tabulares', async ({ page }) => {
    await page.goto(`/${tutorial.slug}`)
    const level = tableOf(page).getByRole('cell', { name: '1 200', exact: true }).first()
    const style = await level.evaluate((cell) => {
      const computed = getComputedStyle(cell)
      return { align: computed.textAlign, numeric: computed.fontVariantNumeric }
    })
    expect(['end', 'right']).toContain(style.align)
    expect(style.numeric).toContain('tabular-nums')
    const name = tableOf(page).getByRole('rowheader', { name: 'Tofu' })
    expect(await name.evaluate((cell) => getComputedStyle(cell).textAlign)).toMatch(/start|left/)
  })

  test('a 390px no desborda la página: la tabla se desplaza en su región, con el teclado', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${tutorial.slug}`)
    const region = regionOf(page)
    await expect(region).toBeVisible()

    const page390 = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(page390.scroll).toBeLessThanOrEqual(page390.client)

    const sizes = await region.evaluate((node) => ({
      scroll: node.scrollWidth,
      client: node.clientWidth,
      right: node.getBoundingClientRect().right,
    }))
    expect(sizes.scroll).toBeGreaterThan(sizes.client)
    expect(sizes.right).toBeLessThanOrEqual(390)

    // La región se enfoca con el tabulador y las flechas la desplazan; el nombre de la fila
    // se queda a la vista.
    const name = tableOf(page).getByRole('rowheader', { name: 'Tofu' })
    const before = (await name.boundingBox())!.x
    await region.focus()
    await expect(region).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)
    // Hasta el final: la última columna se ve y la primera sigue en su sitio.
    await region.evaluate((node) => node.scrollTo({ left: node.scrollWidth, behavior: 'instant' }))
    await expect(
      tableOf(page).getByRole('cell', { name: table.rows[7][5], exact: true }),
    ).toBeInViewport()
    expect(Math.abs((await name.boundingBox())!.x - before)).toBeLessThan(1)
  })

  test('a 390px el título se queda en su sitio mientras la tabla se desplaza', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${tutorial.slug}`)
    const region = regionOf(page)
    const title = page.getByText(table.title, { exact: true })
    await title.scrollIntoViewIfNeeded()
    const before = (await title.boundingBox())!
    await region.evaluate((node) => node.scrollTo({ left: node.scrollWidth, behavior: 'instant' }))
    await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)
    await expect(title).toBeVisible()
    await expect(title).toBeInViewport({ ratio: 1 })
    const after = (await title.boundingBox())!
    expect(Math.abs(after.x - before.x)).toBeLessThan(1)
    // El título queda encima de la región, no dentro de lo que se desplaza.
    expect(after.y + after.height).toBeLessThanOrEqual((await region.boundingBox())!.y + 1)
  })

  test('en el escritorio la caja abraza la tabla, sin desplazarse', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/${tutorial.slug}`)
    const sizes = await regionOf(page).evaluate((node) => ({
      scroll: node.scrollWidth,
      client: node.clientWidth,
    }))
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client)
  })

  test('al imprimir sale entera, sin región que recorte', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${tutorial.slug}`)
    await page.emulateMedia({ media: 'print' })
    const region = regionOf(page)
    expect(await region.evaluate((node) => getComputedStyle(node).overflowX)).toBe('visible')
    expect(
      await tableOf(page)
        .getByRole('rowheader', { name: 'Tofu' })
        .evaluate((cell) => getComputedStyle(cell).position),
    ).toBe('static')
  })

  for (const mode of ['dark', 'light'] as const) {
    test(`pasa axe WCAG 2.2 AA en modo ${mode === 'dark' ? 'oscuro' : 'claro'}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(`/${tutorial.slug}`)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(tableOf(page)).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
    })
  }
})
