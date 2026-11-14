import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { docId, logInPanel, releaseLocks, WCAG } from './panel-helpers.ts'
import { E2E_PANEL_USER_3, seedGuide } from './seed/guides.ts'

// A-21 (docs/research/backlog.md): axe WCAG 2.2 AA sobre cinco páginas del panel, en claro y
// en oscuro, sin excepciones. Payload pinta controles sin nombre que se arreglan en
// src/lib/admin/a11y-fixes.ts; si Payload cambia su HTML, esto falla.

async function setMode(page: Page, mode: 'light' | 'dark') {
  const { hostname } = new URL(page.url() === 'about:blank' ? 'http://localhost' : page.url())
  await page
    .context()
    .addCookies([{ name: 'payload-theme', value: mode, domain: hostname, path: '/' }])
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    results.violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`),
  ).toEqual([])
}

for (const mode of ['light', 'dark'] as const) {
  test(`el inicio de sesión pasa axe en ${mode}`, async ({ page }) => {
    await setMode(page, mode)
    await page.goto('/admin/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expectNoViolations(page)
  })
}

test.describe('el panel pasa axe sin excepciones', () => {
  test.describe.configure({ mode: 'serial' })
  let page: Page
  let userId: number

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage()
    // Su propia cuenta: panel-ola2.spec.ts puede iniciar sesión a la vez con la suya.
    userId = await logInPanel(page, E2E_PANEL_USER_3)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  // La guía de misión la abren también panel.spec.ts y panel-papeles.spec.ts.
  test.afterEach(async () => {
    await releaseLocks(page, userId)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  const pages: { name: string; path: (page: Page) => Promise<string>; ready: string }[] = [
    { name: 'Pendiente', path: async () => '/admin', ready: 'h1' },
    { name: 'una lista', path: async () => '/admin/collections/quest-guides', ready: 'table' },
    {
      name: 'una guía de misión',
      path: async (p) =>
        `/admin/collections/quest-guides/${await docId(p, 'quest-guides', seedGuide.slug)}`,
      ready: '#field-title',
    },
    { name: 'la guía del panel', path: async () => '/admin/guia', ready: 'h1' },
  ]

  for (const mode of ['light', 'dark'] as const) {
    for (const target of pages) {
      test(`${target.name} en ${mode}`, async () => {
        await setMode(page, mode)
        await page.goto(await target.path(page))
        await expect(page.locator(target.ready).first()).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', mode)
        // Los nombres se ponen tras pintar: se espera a que la página quede quieta.
        await page.waitForLoadState('networkidle')
        await expectNoViolations(page)
      })
    }
  }

  test('con el teclado, el foco se ve: 2px en tinta', async () => {
    await page.goto('/admin')
    await expect(page.locator('h1')).toBeVisible()
    await page.keyboard.press('Tab')
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element)
      return `${style.outlineStyle} ${style.outlineWidth}`
    })
    expect(outline).toBe('solid 2px')
  })

  test('una fila se mueve con el teclado desde su asa, que dice cómo', async () => {
    const id = await docId(page, 'quest-guides', seedGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${id}`)
    const handle = page.locator('#body-row-0 .collapsible__drag').first()
    await expect(handle).toHaveAttribute('aria-label', /pulsa Espacio y usa las flechas/)
    await expect(page.locator('#body-row-0 .collapsible__actions button').first()).toHaveAttribute(
      'aria-label',
      'Más acciones de la fila: mover, duplicar o quitar',
    )

    // Espacio la levanta, la flecha la baja una fila y Espacio la suelta. No se guarda.
    const firstLabel = page
      .locator('#body-row-0 > .collapsible > .collapsible__toggle-wrap')
      .first()
    const before = await firstLabel.innerText()
    await handle.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')
    await expect(firstLabel).not.toHaveText(before)
  })
})
