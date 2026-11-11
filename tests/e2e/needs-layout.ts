import { expect, type Locator, type Page } from '@playwright/test'

// Necesitarás (DESIGN.md, Quest header y Dofus guides components): los objetos en columnas
// y las notas debajo. En el escritorio, los dos primeros objetos van en la misma fila; en el
// móvil, uno debajo de otro, sin barra de desplazamiento horizontal.

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  expect(found, 'la fila se ve').not.toBeNull()
  return found!
}

/** Comprueba Necesitarás a 1440px y a 390px; deja la página a 390px. */
export async function expectNeedsColumns(page: Page, needs: Locator) {
  const items = needs.locator('.needs__items > li')
  const notes = needs.locator('.needs__notes > li')

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(items.nth(1)).toBeVisible()
  const [first, second] = [await box(items.nth(0)), await box(items.nth(1))]
  expect(Math.abs(first.y - second.y)).toBeLessThan(1)
  expect(second.x).toBeGreaterThan(first.x + first.width)
  // Las notas, después de todos los objetos.
  const lastItem = await box(items.last())
  expect((await box(notes.first())).y).toBeGreaterThanOrEqual(lastItem.y + lastItem.height)

  await page.setViewportSize({ width: 390, height: 844 })
  const [top, below] = [await box(items.nth(0)), await box(items.nth(1))]
  expect(below.y).toBeGreaterThanOrEqual(top.y + top.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}
