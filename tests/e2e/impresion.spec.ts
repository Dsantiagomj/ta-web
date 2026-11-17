import { expect, test } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// Al imprimir (DESIGN.md, Print): la guía en claro sobre blanco aunque la pantalla esté en un
// tema oscuro, sin la cabecera, el pie, las partículas ni el fondo de zona.

test('una guía en un tema oscuro se imprime en claro, sin cabecera ni pie', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'ta-theme', value: 'brakmar', url: baseURL! },
    { name: 'ta-mode', value: 'dark', url: baseURL! },
  ])
  await page.goto(`/${seedGuide.slug}`)
  await page.emulateMedia({ media: 'print' })
  for (const selector of ['.site-hdr', '.site-ft', '.amb', '.zone-bg']) {
    await expect(page.locator(selector).first(), selector).toBeHidden()
  }
  const [background, ink] = await page.evaluate(() => [
    getComputedStyle(document.documentElement).backgroundColor,
    getComputedStyle(document.querySelector('h1')!).color,
  ])
  expect(background).toBe('rgb(255, 255, 255)')
  expect(ink).toBe('rgb(29, 24, 19)')
})
