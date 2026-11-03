import { expect, test } from '@playwright/test'

test.describe('portada', () => {
  test('pinta el título en Arcano oscuro por defecto', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Torrente Arcano' })).toBeVisible()
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'es')
    await expect(html).toHaveAttribute('data-theme', 'arcano')
    await expect(html).toHaveAttribute('data-mode', 'dark')
  })

  test('el interruptor cambia a modo claro y el modo sobrevive a la recarga', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const toggle = page.getByRole('switch', { name: 'Modo claro' })
    const background = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)

    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    const darkBackground = await background()

    await toggle.click()

    await expect(html).toHaveAttribute('data-mode', 'light')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(await background()).not.toBe(darkBackground)

    await page.reload()

    await expect(html).toHaveAttribute('data-mode', 'light')
    await expect(page.getByRole('switch', { name: 'Modo claro' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('el script del head recupera el modo de localStorage si falta la cookie', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('ta-mode', 'light'))
    await context.clearCookies()

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
  })
})

test('el panel de Payload responde en /admin', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.status()).toBeLessThan(400)
  // Con la base vacía, Payload pide crear el primer usuario del panel.
  await expect(page).toHaveURL(/\/admin(\/create-first-user|\/login)?/)
})
