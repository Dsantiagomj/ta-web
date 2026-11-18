import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement } from './seed/achievements.ts'

// Un logro que DofusDB da sin misiones, como los de Alineamiento (backlog S-06): en lugar de
// «Las misiones, en orden», la página enseña lo que pide el juego, y nunca «0 misiones».

const { alignment } = seedAchievement
const url = `/${alignment.page.slug}`

test.describe('página de un logro sin misiones', () => {
  test('la cabecera cuenta los objetivos y la lista dice lo que pide el logro', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(alignment.page.name)
    await expect(page.locator('.qhead__meta')).toHaveText(alignment.page.meta)
    await expect(page.getByText(/0 misiones/)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Las misiones, en orden' })).toHaveCount(0)

    const objectives = page.getByRole('region', { name: 'Lo que pide el logro' })
    await expect(objectives).toBeVisible()
    await expect(objectives.getByText(alignment.page.description)).toBeVisible()
    await expect(objectives.getByRole('listitem')).toHaveText(alignment.page.objectives)
    await expect(objectives.getByRole('link')).toHaveCount(0)

    // La entrada de Torre va antes, y las recompensas siguen en la ficha.
    const intro = page.getByText(alignment.page.intro)
    const introBox = (await intro.boundingBox())!
    const listBox = (await objectives.boundingBox())!
    expect(introBox.y).toBeLessThan(listBox.y)
    await expect(page.getByRole('heading', { name: 'Recompensas del logro' })).toBeVisible()
  })

  test('el logro anterior del metalogro cuenta sus objetivos, no misiones', async ({ page }) => {
    await page.goto(url)
    const nav = page.getByRole('navigation', { name: `Logros de ${alignment.group.name}` })
    const previous = nav.getByRole('link', { name: new RegExp(alignment.previous.name) })
    await expect(previous).toHaveAttribute('href', `/${alignment.previous.slug}`)
    await expect(previous).toContainText('3 objetivos.')
    await expect(previous).not.toContainText('misiones')
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en modo ${mode}`, async ({ page, context, baseURL }) => {
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
