import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// El Dofus de los Hielos que siembra scripts/seed-e2e.ts: su paso 2 lleva una fila genérica
// (vale con cualquiera de dos misiones) y «Sangre fría», que el juego termina sola al terminar
// la misión del paso 1, como «Bienvenido a Frigost» con las del 2 y el 4 del Hielos de verdad.

const hielos = seedChecklists.hielos
const url = `/${hielos.slug}`
const step = (page: Page, n: number) => page.locator(`#paso-${n}`)
const quest = (page: Page, n: number, name: string) =>
  step(page, n)
    .locator('.ck-q')
    .filter({ has: page.getByText(name, { exact: true }) })
const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

test.describe('el Hielos', () => {
  test('la fila genérica dice con cuántas misiones vale y no enlaza ninguna guía', async ({
    page,
  }) => {
    await page.goto(url)
    await page.locator('.ck-row__b[data-pick="2"]').click()
    const generic = quest(page, 2, hielos.generic)
    await expect(generic).toContainText('Vale con cualquiera de sus 2 misiones')
    await expect(generic.getByRole('link')).toHaveCount(0)
  })

  test('al terminar la del paso 1, la genérica sale hecha y «Sangre fría» se termina sola', async ({
    page,
  }) => {
    await page.goto(url)
    await step(page, 1).locator('.ck-q [data-q-hit]').click()
    await page.locator('.ck-row__b[data-pick="2"]').click()
    const generic = quest(page, 2, hielos.generic)
    await expect(generic).toHaveAttribute('data-state', 'done')
    await expect(generic.locator('[data-ck-lock]')).toHaveText('Hecha con una de sus misiones')
    const alone = quest(page, 2, seedChecklists.nebuloso.stopQuest.name)
    await expect(alone).toHaveAttribute('data-state', 'done')
    await expect(alone.locator('[data-ck-lock]')).toHaveText(
      `Se terminó sola con “${seedGuide.title}”`,
    )
    await expect(alone.locator('[data-q-hit]')).toBeDisabled()
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await page.locator('.ck-row__b[data-pick="2"]').click()
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
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
