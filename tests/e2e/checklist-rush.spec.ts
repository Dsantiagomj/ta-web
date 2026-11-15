import { expect, test, type Page } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'

// El camino de Dofus del Rush de todos los Dofus (DESIGN.md, Dofus checklist: the rush's road),
// sobre el rush que siembra scripts/seed-e2e.ts: el paso 1 da el Dofawa y el 3, el Ocre y el
// Dofawa. La cabecera enseña el siguiente Dofus; la franja, todos con su paso; el cartel del
// índice, la corona de huevos.

const rush = seedChecklists.rush
const url = `/${rush.slug}`

const head = (page: Page) => page.locator('[data-road-hero]')
const line = (page: Page) => head(page).locator('.ck-head__road:visible')
const stop = (page: Page, i: number) => page.locator(`[data-road-stop="${i}"]`)

test.describe('el camino de Dofus del rush', () => {
  test('la cabecera enseña el siguiente Dofus y la franja todos, con su paso', async ({ page }) => {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(rush.title)
    await expect(head(page)).toHaveAttribute('data-road-ready', '')
    await expect(line(page)).toHaveText(`Siguiente Dofus: ${seedDofus.dofawa.name}, en el paso 1.`)
    const row = page.getByRole('list', { name: 'Dofus del camino' })
    await expect(row.getByRole('link')).toHaveText(['1', '3'])
    await expect(
      row.getByRole('link', { name: `${seedDofus.ocre.name} y ${seedDofus.dofawa.name}, paso 3` }),
    ).toBeVisible()
    await expect(stop(page, 0)).toHaveAttribute('data-next', '')
  })

  test('al completar el paso de su Dofus, se enciende y llega el siguiente', async ({ page }) => {
    await page.goto(url)
    await expect(head(page)).toHaveAttribute('data-road-ready', '')
    await page.getByRole('checkbox', { name: 'Paso 1 hecho' }).check()
    await expect(stop(page, 0)).toHaveAttribute('data-done', '')
    await expect(stop(page, 1)).toHaveAttribute('data-next', '')
    await expect(line(page)).toHaveText(
      `Siguiente Dofus: ${seedDofus.ocre.name} y ${seedDofus.dofawa.name}, en el paso 3.`,
    )
    // Lo mismo al volver: el progreso se guarda.
    await page.reload()
    await expect(line(page)).toContainText(seedDofus.ocre.name)
    await expect(stop(page, 0)).toHaveAttribute('data-done', '')
  })

  test('con movimiento reducido, el siguiente llega sin animar', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url)
    await expect(head(page)).toHaveAttribute('data-road-ready', '')
    await page.getByRole('checkbox', { name: 'Paso 1 hecho' }).check()
    await expect(line(page)).toContainText(seedDofus.ocre.name)
    await expect(page.locator('[data-flash], [data-enter]')).toHaveCount(0)
  })

  test('con todo hecho, el camino terminado', async ({ page }) => {
    await page.goto(url)
    await expect(head(page)).toHaveAttribute('data-road-ready', '')
    for (const n of [1, 2, 3]) await page.getByRole('checkbox', { name: `Paso ${n} hecho` }).check()
    await expect(line(page)).toHaveText(
      `Camino terminado: ${seedDofus.ocre.name} y ${seedDofus.dofawa.name} fueron los últimos.`,
    )
    await expect(page.locator('[data-road-stop][data-next]')).toHaveCount(0)
  })

  test('en el móvil, la fila de Dofus se desplaza dentro de su caja, sin mover la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const list = page.getByRole('list', { name: 'Dofus del camino' })
    await expect(list).toHaveCSS('overflow-x', 'auto')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test('el cartel del índice lleva la corona de huevos, sin PNJ', async ({ page }) => {
    await page.goto('/checklists')
    const poster = page.locator(`a.poster[href="${url}"]`)
    await expect(poster).toHaveClass(/poster--crown/)
    await expect(poster.locator('.poster__cegg')).toHaveCount(1)
    await expect(poster.locator('.poster__npc')).toHaveCount(0)
  })
})
