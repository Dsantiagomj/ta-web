import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedChecklists } from './seed/checklists.ts'
import { E2E_PANEL_USER } from './seed/guides.ts'

// La checklist del Silvestre como queda en dev tras importarla: la ficha publicada sigue En
// preparación (a Squarespace) y la vista previa del panel enseña su borrador, con lo que el
// Nebuloso no tenía: avisos de la guía, varias paradas en un rojo, alternativas, apartados, un
// logro «hasta la misión», un paso que avanza otro y los avisos y objetos de los prerrequisitos.

const silvestre = seedChecklists.silvestre
const d = silvestre.draft
const step = (page: Page, n: number) => page.locator(`#paso-${n}`)

async function preview(page: Page, open = 1) {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER })
  expect(login.ok()).toBe(true)
  await page.goto(`/vista-previa?slug=${silvestre.slug}`)
  await expect(page).toHaveURL(new RegExp(`/${silvestre.slug}$`))
  // La vista previa ya está en la página: el paso se abre desde la lista, como lo haría Torre.
  if (open > 1) await page.locator(`.ck-row__b[data-pick="${open}"]`).click()
  await expect(step(page, open)).toBeVisible()
}

const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

test.describe('el Silvestre en la vista previa', () => {
  test('sin sesión, la ficha En preparación sigue llevando a Squarespace', async ({ request }) => {
    const response = await request.get(`/${silvestre.slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(silvestre.legacyHref)
  })

  test('los avisos de la guía, resaltados en su tramo, y sin la sección de logros', async ({
    page,
  }) => {
    await preview(page)
    await expect(step(page, 1).locator('mark.hl--tip')).toHaveText(d.tip)
    // El logro «hasta la misión 2» no se enseña: Torre ya lo dice en su texto («misión 3»).
    await expect(step(page, 1).getByRole('region', { name: 'Logros' })).toHaveCount(0)
    await expect(step(page, 1).getByText('Hasta la misión 2')).toHaveCount(0)
    await page.locator('.ck-row__b[data-pick="2"]').click()
    await expect(step(page, 2).locator('mark.hl--must')).toHaveText(d.must)
    await expect(step(page, 2).getByRole('link', { name: 'avanza el 1' })).toBeVisible()
  })

  test('la parada del verde se retoma; la que termina un paso posterior sigue en rojo', async ({
    page,
  }) => {
    await preview(page, 2)
    const route = step(page, 2).locator('.ck-route')
    await expect(route.locator('.ck-line--resolve')).toHaveText(d.resumeLine)
    await expect(route.locator('.ck-line--stop')).toHaveText(d.laterLine)
    // Cada línea va delante de su objetivo: la verde antes del primero, la roja antes del último.
    const rows = await route
      .locator(':scope > li')
      .evaluateAll((items) =>
        items.map((item) => (item.classList.contains('ck-o') ? 'objetivo' : 'línea')),
      )
    expect(rows).toEqual(['línea', 'objetivo', 'objetivo', 'línea', 'objetivo'])
  })

  test('Necesitarás: las alternativas con su cantidad y el apartado aparte', async ({ page }) => {
    await preview(page)
    const needs = step(page, 1).locator('.ck-needs__g')
    await expect(needs.filter({ hasText: `Recursos · ${d.group}` })).toBeVisible()
    await expect(needs.filter({ hasText: 'Consumibles' })).toContainText(/1 ×.+ o 1 ×/)
  })

  test('Prerrequisitos: el aviso de Torre y los objetos que piden', async ({ page }) => {
    await preview(page)
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    const note = page.getByRole('note', { name: d.note.title })
    await expect(note).toContainText(d.note.text)
    await expect(
      page.getByRole('heading', { name: 'Objetos para los prerrequisitos' }),
    ).toBeVisible()
  })

  test('un objeto de los prerrequisitos se gasta al completar su prerrequisito', async ({
    page,
  }) => {
    await preview(page)
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    const own = page.locator('#ck-p-pre [data-own$="#pre"]')
    await expect(own).toBeEnabled()
    await expect(own).not.toBeChecked()
    await page.getByRole('checkbox', { name: d.prerequisite.text }).check()
    await expect(own).toBeChecked()
    await expect(own).toBeDisabled()
    // En Objetos, lo que solo piden los prerrequisitos queda en «Ya utilizados».
    await page.getByRole('tab', { name: /Objetos/ }).click()
    await page.getByRole('checkbox', { name: 'Solo pasos pendientes' }).uncheck()
    await expect(page.locator('[data-ck-group="used"] [data-steps="0"]')).toHaveCount(1)
  })

  test('las marcas de la checklist antigua: el paso y el objeto con alternativas', async ({
    page,
  }) => {
    await preview(page)
    const own = step(page, 1).locator('[data-own*="|"]')
    const key = (await own.getAttribute('data-own'))!.split('#')[0]
    await page.evaluate((key) => {
      localStorage.setItem('silvestre:done', JSON.stringify({ 1: true }))
      localStorage.setItem('silvestre:owned', JSON.stringify({ [`${key}#1`]: true }))
    }, key)
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Paso 1 hecho' })).toBeChecked()
    // El paso hecho gasta lo que pedía; lo conseguido se trajo a su stepId.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(Object.keys(stored.owned)).toHaveLength(1)
    expect(Object.keys(stored.owned)[0].startsWith(`${key}#`)).toBe(true)
    expect(stored.migrated).toHaveProperty('silvestre')
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await preview(page, 2)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await settled(page)
      const check = async () => {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        return results.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((n) => n.target),
        }))
      }
      expect(await check()).toEqual([])
      await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
      await settled(page)
      expect(await check()).toEqual([])
    })
  }
})
