import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'

// El índice de metalogros (DESIGN.md, Metalogros index), sobre los metalogros que siembra
// scripts/seed-e2e.ts: Astrub, publicado, y Misiones de templo, sin nada publicado.

const url = '/metalogros'

test.describe('índice de metalogros', () => {
  test('una ficha abre los logros de su zona en un panel, y el ancla la sigue', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Todos los metalogros' }),
    ).toBeVisible()
    const tile = page.locator('button.vd-tile[data-zone="astrub"]')
    await expect(tile).toHaveAttribute('aria-expanded', 'false')
    await tile.click()
    await expect(tile).toHaveAttribute('aria-expanded', 'true')
    await expect(page).toHaveURL(/#astrub$/)
    const panel = page.getByRole('region', { name: logro.group.name })
    await expect(panel.getByRole('link', { name: new RegExp(logro.name) })).toHaveAttribute(
      'href',
      `/${logro.slug}`,
    )
    // En preparación: se lista sin enlace.
    await expect(panel.locator('[aria-disabled="true"]')).toContainText(logro.next.name)
    await expect(panel.getByRole('link', { name: new RegExp(logro.next.name) })).toHaveCount(0)
    // Esc lo cierra y devuelve el foco a la ficha.
    await panel.getByRole('link').first().focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(tile).toBeFocused()
  })

  test('un metalogro sin nada publicado se ve apagado, sin enlace ni panel', async ({ page }) => {
    await page.goto(url)
    const off = page.locator('.vd-tile[aria-disabled="true"]')
    await expect(off).toContainText(logro.emptyGroup.name)
    await expect(off).toContainText('En preparación')
    await expect(page.getByRole('button', { name: new RegExp(logro.emptyGroup.name) })).toHaveCount(
      0,
    )
  })

  test('el buscador encuentra logros y misiones; lo que está en preparación no se elige', async ({
    page,
  }) => {
    await page.goto(url)
    const input = page.getByRole('combobox', { name: 'Busca una zona, un logro o una misión' })
    await input.fill('biblioteca')
    await expect(page.getByRole('option', { name: new RegExp(logro.next.name) })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await input.fill('seis pies')
    const option = page.getByRole('option', { name: /Seis pies bajo tierra/ })
    await expect(option).toBeVisible()
    await input.press('ArrowDown')
    await input.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${logro.slug}$`))
  })

  test('el ancla abre su zona al llegar', async ({ page }) => {
    await page.goto(`${url}#astrub`)
    await expect(page.getByRole('region', { name: logro.group.name })).toBeVisible()
  })

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('las fichas enlazan a la lista de cada zona, debajo', async ({ page }) => {
      await page.goto(url)
      await expect(page.getByRole('link', { name: new RegExp(logro.group.name) })).toHaveAttribute(
        'href',
        '#astrub',
      )
      await expect(
        page.locator('#astrub').getByRole('link', { name: new RegExp(logro.name) }),
      ).toBeVisible()
      await expect(page.getByRole('combobox')).toBeHidden()
    })
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}, con un panel abierto`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(`${url}#astrub`)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.getByRole('region', { name: logro.group.name })).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
