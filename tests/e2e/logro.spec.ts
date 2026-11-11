import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'

// La página pública de un logro (DESIGN.md, Achievement page), sobre el logro que siembra
// scripts/seed-e2e.ts con las misiones de las guías de prueba.

const url = `/${logro.slug}`

test.describe('página de logro', () => {
  test('pinta las migas, la cabecera y las columnas', async ({ page }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)

    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Metalogros' })).toHaveAttribute(
      'href',
      '/metalogros',
    )
    await expect(crumbs.getByRole('link', { name: logro.group.name })).toHaveAttribute(
      'href',
      '/metalogros#astrub',
    )
    // La página actual no está en las migas, sí en el JSON-LD.
    await expect(crumbs.getByText(logro.name)).toHaveCount(0)
    const jsonLd = JSON.parse((await crumbs.locator('script').textContent()) ?? '{}')
    expect(jsonLd.itemListElement.at(-1)).toMatchObject({ position: 3, name: logro.name })

    const header = page.locator('header.lhead')
    await expect(header.getByRole('heading', { level: 1, name: logro.name })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toHaveText(logro.meta)
    await expect(header.getByRole('heading', { name: 'Necesitarás en total' })).toBeVisible()
    await expect(header.getByText('Combate (solo)')).toBeVisible()
    await expect(header.getByRole('heading', { name: 'Recompensas del logro' })).toBeVisible()
    await expect(header.getByText(`${logro.reward.xp} XP`)).toBeVisible()
  })

  test('las misiones en orden: las de guía publicada abren la guía; la del borrador, no', async ({
    page,
  }) => {
    await page.goto(url)
    const cards = page.getByRole('region', { name: 'Las misiones, en orden' }).getByRole('listitem')
    await expect(cards).toHaveCount(3)
    for (const [index, quest] of logro.quests.entries()) {
      const card = cards.nth(index)
      await expect(card.getByText(quest.kicker)).toBeVisible()
      if (quest.href) {
        await expect(card.getByRole('link', { name: quest.title })).toHaveAttribute(
          'href',
          quest.href,
        )
      } else {
        await expect(card.getByText(quest.title)).toBeVisible()
        await expect(card.getByRole('link')).toHaveCount(0)
      }
    }
    // Toda la tarjeta abre la guía.
    await cards.nth(1).click({ position: { x: 12, y: 12 } })
    await expect(page).toHaveURL(/\/seis-pies-bajo-tierra$/)
  })

  test('una sola columna: sin la lista lateral del metalogro; Cuenta para y el anterior y el siguiente en ella', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(page.getByRole('complementary')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: `Metalogro ${logro.group.name}` })).toHaveCount(
      0,
    )

    const article = page.locator('#contenido article')
    await expect(article.getByRole('heading', { name: 'Cuenta para' })).toBeVisible()
    await expect(article.getByText(logro.countsFor.name)).toBeVisible()

    const nav = article.getByRole('navigation', { name: `Logros de ${logro.group.name}` })
    await expect(nav.getByRole('link', { name: new RegExp(logro.previous.name) })).toHaveAttribute(
      'href',
      `/${logro.previous.slug}`,
    )
    const off = nav.locator('[aria-disabled="true"]')
    await expect(off).toContainText(logro.next.name)
    await expect(off).toContainText('En preparación')

    // Centrada: el mismo margen a cada lado en el escritorio.
    await page.setViewportSize({ width: 1440, height: 900 })
    const box = (await article.boundingBox())!
    expect(Math.abs(box.x - (1440 - box.x - box.width))).toBeLessThan(24)
  })

  test('un logro En preparación no tiene página', async ({ page }) => {
    const response = await page.goto(`/${logro.next.slug}`)
    expect(response?.status()).toBe(404)
  })

  test('en el móvil, las migas son solo el padre directo como enlace de vuelta', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Metalogros' })).toBeHidden()
    const back = crumbs.getByRole('link', { name: logro.group.name })
    await expect(back).toBeVisible()
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
