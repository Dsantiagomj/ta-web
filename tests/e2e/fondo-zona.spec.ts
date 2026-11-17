import { expect, test, type Page } from '@playwright/test'

import { seedAchievement } from './seed/achievements.ts'
import { seedGuide } from './seed/guides.ts'

// El fondo de zona (DESIGN.md, Zone background): una guía de misión o una página de logro
// con fondo lleva detrás de toda la página el paisaje de su zona, fijo al desplazarse, bajo
// un velo plano del fondo de la página (80 % en oscuro, 84 % en claro). Sin fondo, la página
// de siempre. Nunca es el LCP: la imagen va diferida y con prioridad baja.

const withBackground = [
  { name: 'una guía de misión', path: `/${seedGuide.slug}`, file: /fondo|astrub/ },
  // Su fondo propio gana al de la zona de su primera misión, que no tiene.
  { name: 'una página de logro', path: `/${seedAchievement.slug}`, file: /anutropia/ },
]

const withoutBackground = [
  { name: 'una guía sin zona', path: `/${seedGuide.prerequisite.slug}` },
  { name: 'un logro sin zona', path: `/${seedAchievement.previous.slug}` },
]

/** El elemento de la LCP de la carga, o null si el navegador no dio ninguno. */
async function lcpElement(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        let last: string | null = null
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            element?: Element | null
          })[]) {
            const element = entry.element
            last = element ? `${element.tagName.toLowerCase()}.${element.className}` : null
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => resolve(last), 500)
      }),
  )
}

for (const { name, path, file } of withBackground) {
  test(`${name} lleva el paisaje de su zona fijo detrás de toda la página`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(path)
    const layer = page.locator('.zone-bg')
    await expect(layer).toHaveCount(1)
    await expect(layer).toHaveAttribute('aria-hidden', 'true')

    const image = layer.locator('img')
    await expect(image).toHaveAttribute('alt', '')
    await expect(image).toHaveAttribute('loading', 'lazy')
    await expect(image).toHaveAttribute('fetchpriority', 'low')
    // Cargada, en AVIF o WebP, y cubriendo la ventana entera.
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete)).toBe(true)
    const shown = await image.evaluate((img: HTMLImageElement) => ({
      src: img.currentSrc,
      fit: getComputedStyle(img).objectFit,
      ...img.getBoundingClientRect().toJSON(),
    }))
    expect(shown.src).toMatch(/\.(avif|webp)$/)
    expect(shown.src).toMatch(file)
    expect(shown.fit).toBe('cover')
    expect(shown).toMatchObject({ x: 0, y: 0, width: 1440, height: 900 })

    // Fija: tras desplazarse sigue arriba del todo.
    await page.mouse.wheel(0, 1200)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    expect(await layer.evaluate((node) => node.getBoundingClientRect().top)).toBe(0)
    expect(await layer.evaluate((node) => getComputedStyle(node).position)).toBe('fixed')

    expect(await lcpElement(page)).not.toMatch(/zone-bg/)
  })
}

for (const mode of ['dark', 'light'] as const) {
  test(`el velo es el fondo de la página al ${mode === 'dark' ? '80' : '84'} % en modo ${mode}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
    await page.goto(`/${seedGuide.slug}`)
    const veil = await page
      .locator('.zone-bg')
      .evaluate((node) => getComputedStyle(node, '::after').backgroundColor)
    // color-mix con transparente: el color del fondo con su alfa, el último número.
    const alpha = Number(/([\d.]+)\)$/.exec(veil)?.[1])
    expect(alpha).toBeCloseTo(mode === 'dark' ? 0.8 : 0.84, 2)
  })
}

for (const { name, path } of withoutBackground) {
  test(`${name} no lleva fondo de zona`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('.zone-bg')).toHaveCount(0)
  })
}
