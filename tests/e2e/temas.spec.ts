import { expect, test, type Page } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// Los temas (DESIGN.md, Themes): Amakna por defecto; Amakna, Torrente Arcano, Bonta y Brâkmar
// gratis, elegidos en el selector de la cabecera y guardados como el modo (cookie y
// localStorage). El Ocre es premium y no sale en el selector.

const url = `/${seedGuide.slug}`
const NAMES = ['Amakna', 'Torrente Arcano', 'Bonta', 'Brâkmar']

async function open(page: Page) {
  await page.goto(url)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

const picker = (page: Page) => page.getByRole('button', { name: /^Tema: / })
const menu = (page: Page) => page.getByRole('menu', { name: 'Tema' })

test.describe('tema desde el servidor', () => {
  test.use({ javaScriptEnabled: false })

  test('sin cookie pinta Amakna', async ({ page }) => {
    await page.goto(url)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'amakna')
  })

  test('la cookie de un tema gratis pinta ese tema', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'ta-theme', value: 'bonta', url: baseURL! }])
    await page.goto(url)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'bonta')
  })

  test('una cookie con el Ocre, premium, pinta Amakna', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'ta-theme', value: 'ocre', url: baseURL! }])
    await page.goto(url)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'amakna')
  })
})

test.describe('tema antes del primer pintado', () => {
  test('sin cookie, el de localStorage, y reescribe la cookie', async ({ page, context }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ta-theme', 'brakmar')
      } catch (error) {
        throw new Error(`Sin localStorage en la prueba: ${String(error)}`)
      }
    })
    await page.goto(url)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'brakmar')
    // El servidor pintó Amakna en el botón; la isla de la cabecera lo pone al día.
    await expect(picker(page)).toHaveAccessibleName('Tema: Brâkmar')
    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === 'ta-theme')?.value).toBe('brakmar')
  })
})

test.describe('selector de tema', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('es un botón de menú con el tema actual y va antes del interruptor de modo', async ({
    page,
  }) => {
    await open(page)
    const button = picker(page)
    await expect(button).toHaveAccessibleName('Tema: Amakna')
    await expect(button).toHaveAttribute('aria-haspopup', 'menu')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    const controls = await button.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    await expect(page.locator(`[id="${controls}"]`)).toHaveRole('menu')

    const hat = (await button.boundingBox())!
    const mode = (await page.locator('.mode-switch').boundingBox())!
    expect(hat.x + hat.width).toBeLessThanOrEqual(mode.x)
    // El sombrero lleva el acento del tema.
    const fill = await button
      .locator('path')
      .first()
      .evaluate((el) => getComputedStyle(el).fill)
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--t-accent').trim(),
    )
    expect(fill).toBe(hexToRgb(accent))
  })

  test('el menú ofrece los cuatro temas gratis, sin el Ocre, con el actual marcado', async ({
    page,
  }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    await expect(picker(page)).toHaveAttribute('aria-expanded', 'true')
    const items = menu(page).getByRole('menuitemradio')
    await expect(items).toHaveText(NAMES)
    await expect(menu(page).getByRole('menuitemradio', { name: 'Amakna' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(menu(page).getByRole('menuitemradio', { name: 'Amakna' })).toBeFocused()
    await expect(menu(page).getByText('Ocre')).toHaveCount(0)
  })

  test('cada muestra pinta el sombrero en el acento de su tema, en el modo actual', async ({
    page,
  }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    const swatches = menu(page).locator('[data-theme]')
    await expect(swatches).toHaveCount(4)
    const seen = new Set<string>()
    for (const swatch of await swatches.all()) {
      await expect(swatch).toHaveAttribute('data-mode', 'dark')
      const { fill, accent } = await swatch.evaluate((el) => ({
        fill: getComputedStyle(el.querySelector('path')!).fill,
        accent: getComputedStyle(el).getPropertyValue('--t-accent').trim(),
      }))
      expect(fill).toBe(hexToRgb(accent))
      seen.add(fill)
    }
    expect(seen.size).toBe(4)
  })

  test('las flechas mueven el foco, Enter aplica el tema y se guarda', async ({
    page,
    context,
  }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    await expect(menu(page).getByRole('menuitemradio', { name: 'Amakna' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    const arcano = menu(page).getByRole('menuitemradio', { name: 'Torrente Arcano' })
    await expect(arcano).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(menu(page).getByRole('menuitemradio', { name: 'Brâkmar' })).toBeFocused()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'arcano')
    await expect(arcano).toHaveAttribute('aria-checked', 'true')
    await expect(picker(page)).toHaveAccessibleName('Tema: Torrente Arcano')
    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === 'ta-theme')?.value).toBe('arcano')
    expect(await page.evaluate(() => localStorage.getItem('ta-theme'))).toBe('arcano')

    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'arcano')
    await expect(picker(page)).toHaveAccessibleName('Tema: Torrente Arcano')
  })

  test('un clic aplica el tema y cambia los colores de la página', async ({ page }) => {
    await open(page)
    const background = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    const before = await background()
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    await menu(page).getByRole('menuitemradio', { name: 'Bonta' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'bonta')
    await expect.poll(background).not.toBe(before)
  })

  test('la flecha abajo en el botón abre el menú en el tema actual', async ({ page }) => {
    await open(page)
    await picker(page).focus()
    await page.keyboard.press('ArrowDown')
    await expect(menu(page)).toBeVisible()
    await expect(menu(page).getByRole('menuitemradio', { name: 'Amakna' })).toBeFocused()
  })

  test('Escape cierra y devuelve el foco al botón', async ({ page }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu(page)).toBeHidden()
    await expect(picker(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(picker(page)).toBeFocused()
  })

  test('un clic fuera cierra y devuelve el foco al botón', async ({ page }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    await page.mouse.click(700, 600)
    await expect(menu(page)).toBeHidden()
    await expect(picker(page)).toBeFocused()
  })

  test('las muestras siguen el modo', async ({ page }) => {
    await open(page)
    await page.getByRole('switch', { name: 'Modo claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    for (const swatch of await menu(page).locator('[data-theme]').all()) {
      await expect(swatch).toHaveAttribute('data-mode', 'light')
    }
  })
})

test.describe('selector de tema en un móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('el menú es un panel fijo bajo la cabecera, dentro de la pantalla', async ({ page }) => {
    await open(page)
    await picker(page).click()
    // La lógica del menú llega con import() al primer clic.
    await expect(menu(page)).toBeVisible()
    const header = (await page.locator('[data-site-header]').boundingBox())!
    const box = (await menu(page).boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(header.y + header.height)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
})

function hexToRgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}
