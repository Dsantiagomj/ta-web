import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'

// El emblema de Torrente Arcano (DESIGN.md, Brand): el favicon y la cabecera.

/** Un color del tema leído en la página, como rgb(). */
function token(page: Page, name: string) {
  return page.evaluate((value) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${value})`
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, name)
}

test.describe('marca', () => {
  test('la portada enlaza el favicon SVG, su respaldo PNG y el icono de iOS', async ({
    page,
    request,
  }) => {
    await page.goto('/')
    const icons = [
      { selector: 'link[rel="icon"][type="image/svg+xml"]', type: 'image/svg+xml' },
      { selector: 'link[rel="icon"][type="image/png"][sizes="32x32"]', type: 'image/png' },
      { selector: 'link[rel="apple-touch-icon"][sizes="180x180"]', type: 'image/png' },
    ]
    for (const { selector, type } of icons) {
      const link = page.locator(selector)
      await expect(link, selector).toHaveCount(1)
      const response = await request.get((await link.getAttribute('href'))!)
      expect(response.status(), selector).toBe(200)
      expect(response.headers()['content-type'], selector).toContain(type)
    }
    // Los navegadores con favicon SVG prefieren el último: el SVG va detrás del PNG.
    const order = await page
      .locator('link[rel="icon"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('type')))
    expect(order.indexOf('image/svg+xml')).toBeGreaterThan(order.indexOf('image/png'))
  })

  test('la cabecera lleva el emblema a la izquierda del nombre, con los colores del tema', async ({
    page,
  }) => {
    await page.goto('/')
    const brand = page
      .getByRole('banner')
      .getByRole('link', { name: 'Torrente Arcano', exact: true })
    const emblem = brand.locator('svg[aria-hidden="true"]')
    await expect(emblem).toBeVisible()
    expect(await brand.evaluate((node) => node.firstElementChild?.tagName)).toBe('svg')
    // 36px a la raíz de 16px; el viewport de escritorio (1280px) tiene la raíz al 110 %.
    const box = (await emblem.boundingBox())!
    expect(box.width).toBeCloseTo(36 * 1.1, 0)
    expect(box.height).toBeCloseTo(36 * 1.1, 0)

    const hat = emblem.locator('[data-part="hat"]')
    const fill = () => hat.evaluate((node) => getComputedStyle(node).fill)
    expect(await fill()).toBe(await token(page, '--color-accent'))

    await page.getByRole('switch', { name: 'Modo claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
    expect(await fill()).toBe(await token(page, '--color-accent'))
  })

  test('en un móvil el emblema mide 30px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const emblem = page.getByRole('banner').locator('svg[data-variant="full"]')
    expect(await emblem.boundingBox()).toMatchObject({ width: 30, height: 30 })
  })

  for (const mode of MODES) {
    test(`la cabecera con el emblema pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)

      const results = await new AxeBuilder({ page })
        .include('body > header')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
