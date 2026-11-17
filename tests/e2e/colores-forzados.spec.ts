import { expect, test, type Locator } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'

// Colores forzados (Windows en contraste alto, `forced-colors: active`): el navegador cambia
// los fondos y las sombras de la paleta por los del sistema. Lo que marca un estado (el filtro
// elegido, la casilla marcada, el relleno de las barras, el paso abierto) tiene que seguir
// viéndose, con los colores del sistema.

test.use({ viewport: { width: 1440, height: 900 } })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
})

/** El color del sistema Highlight, resuelto en la página. */
const highlight = (locator: Locator) =>
  locator.evaluate((node) => {
    const probe = document.createElement('i')
    probe.style.color = 'Highlight'
    node.ownerDocument.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })

test('el filtro elegido de /guias-dofus conserva su indicador', async ({ page }) => {
  await page.goto('/guias-dofus')
  const indicator = page.locator('.dg-seg__ind')
  await expect(indicator).toBeVisible()
  expect(await indicator.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
    await highlight(indicator),
  )
})

test('en una checklist, la casilla marcada, la barra y el paso abierto se siguen viendo', async ({
  page,
}) => {
  await page.goto(`/${seedChecklists.nebuloso.slug}#paso-2`)
  const box = page.getByRole('checkbox', { name: 'Paso 2 hecho' })
  await box.check()
  const color = await highlight(box)
  // La casilla cambia de fondo con una transición corta: se espera a que acabe.
  await expect
    .poll(() => box.evaluate((node) => getComputedStyle(node).backgroundColor))
    .toBe(color)
  const fill = page.locator('.ck-bar .progress__fill').first()
  expect(await fill.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(color)
  const open = page.locator('.ck-row[aria-current="true"]')
  await expect(open).toHaveCount(1)
  expect(await open.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('solid')
})
