import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { indexChecklists } from './seed/checklists-index.ts'
import { E2E_PANEL_USER_4 } from './seed/guides.ts'

// El Ocre, una checklist de almas, como queda en dev tras importarlo: la ficha publicada sigue
// En preparación (a Squarespace) y la vista previa del panel enseña el borrador de almas. Tres
// almas en dos etapas: Mob Lasponja (jefe, en el Castillo de Arena), Pikopi y Arakna Maja.

const ocre = indexChecklists.legacy
const souls = indexChecklists.souls

// Su propia cuenta: cada inicio de sesión reescribe las sesiones de la cuenta, y otra spec que
// entre a la vez con la misma puede borrar la suya (seed/guides.ts).
async function preview(page: Page) {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER_4 })
  expect(login.ok()).toBe(true)
  await page.goto(`/vista-previa?slug=${ocre.slug}`)
  await expect(page).toHaveURL(new RegExp(`/${ocre.slug}$`))
  // La isla está lista cuando suelta las casillas.
  await expect(page.locator('[data-sl-own]').first()).toBeEnabled()
}

const soul = (page: Page, name: string) => page.locator('.sl-soul', { hasText: name })
const visibleNames = (page: Page) =>
  page.locator('.sl-soul:not([hidden]) .sl-soul__n').allTextContents()
const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

test.describe('el Ocre en la vista previa', () => {
  test('sin sesión, la ficha En preparación sigue llevando a Squarespace', async ({ request }) => {
    const response = await request.get(`/${ocre.slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(ocre.legacyHref)
  })

  test('las almas por etapa, con su nivel y dónde se luchan, y el aviso de Torre', async ({
    page,
  }) => {
    await preview(page)
    await expect(page.getByRole('heading', { level: 1, name: ocre.name })).toBeVisible()
    await expect(page.getByText(souls.intro)).toBeVisible()
    const stage = page.locator('[data-sl-view="stage"] .sl-gh')
    await expect(stage).toHaveText(['Etapa 1 · Jefes 0/1', 'Etapa 2 · Archis 0/2'])
    // El jefe al nivel de su mazmorra (25), no al de su grado más alto.
    await expect(soul(page, 'Mob Lasponja')).toContainText('Nv. 20 · Castillo de Arena')
    await expect(soul(page, 'Pikopi')).toContainText('Nv. 55 · Bosque de Amakna')
  })

  test('marcar un alma cuenta en el porcentaje y en su grupo, y se guarda', async ({ page }) => {
    await preview(page)
    await soul(page, 'Pikopi').locator('label').click()
    await expect(page.locator('[data-sl-pct]')).toHaveText('33,3 %')
    await expect(page.locator('[data-sl-done]')).toHaveText('1')
    await expect(page.locator('[data-sl-view="stage"] .sl-gh').nth(1)).toHaveText(
      'Etapa 2 · Archis 1/2',
    )
    await page.reload()
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).toBeChecked()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(Object.keys(stored.souls)).toEqual(['991602'])
  })

  test('por región, el tipo, el buscador y ocultar las que se tienen', async ({ page }) => {
    await preview(page)
    await page.getByRole('button', { name: 'Por región' }).click()
    await expect(page.locator('[data-sl-view="region"] .sl-gh')).toHaveText([
      'Astrub 0/2',
      'Amakna 0/1',
    ])
    await expect(page.locator('[data-sl-view="stage"]')).toBeHidden()

    await page.getByRole('button', { name: /^Jefes/ }).click()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja'])
    await page.getByRole('button', { name: /^Todas/ }).click()

    await page.getByRole('searchbox').fill('arakna')
    expect(await visibleNames(page)).toEqual(['Arakna Maja'])
    await page.getByRole('searchbox').fill('')

    await soul(page, 'Arakna Maja').locator('label').click()
    await page.getByRole('checkbox', { name: 'Ocultar las que tengo' }).check()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja', 'Pikopi'])
  })

  test('las almas de la checklist antigua («cosecha:done») se traen una vez', async ({ page }) => {
    await preview(page)
    await page.evaluate(() => localStorage.setItem('cosecha:done', JSON.stringify([991603, 7])))
    await page.reload()
    await expect(soul(page, 'Arakna Maja').locator('[data-sl-own]')).toBeChecked()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(stored.souls).toHaveProperty('991603')
    expect(stored.souls).not.toHaveProperty('7')
    expect(stored.migrated).toHaveProperty('cosecha')
    // La clave antigua se queda donde estaba.
    expect(await page.evaluate(() => localStorage.getItem('cosecha:done'))).not.toBeNull()
  })

  test('reiniciar quita las almas de esta checklist', async ({ page }) => {
    await preview(page)
    await soul(page, 'Pikopi').locator('label').click()
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Reiniciar el progreso' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reiniciar el progreso' })
    await expect(dialog).toContainText('Las almas que tienes')
    await dialog.getByRole('button', { name: 'Reiniciar' }).click()
    await expect(page.locator('[data-sl-done]')).toHaveText('0')
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).not.toBeChecked()
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await preview(page)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await soul(page, 'Pikopi').locator('label').click()
      await settled(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
