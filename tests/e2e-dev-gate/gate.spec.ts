import { expect, test } from '@playwright/test'

import { DEV_GATE_TEST_CREDENTIALS } from './credentials'

const realm = /^Basic realm="Torrente Arcano: entorno de desarrollo"/

test.describe('sin credenciales', () => {
  for (const path of ['/', '/admin', '/api/users', '/robots.txt']) {
    test(`${path} pide basic auth`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })

      expect(response.status()).toBe(401)
      expect(response.headers()['www-authenticate']).toMatch(realm)
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
      expect(await response.text()).toMatch(/usuario y la contraseña/)
    })
  }

  test('/api/health responde sin credenciales, con noindex', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok', db: 'ok' })
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
  })
})

test('con credenciales incorrectas sigue en 401', async ({ playwright, baseURL }) => {
  // Un contexto propio no hereda el baseURL del proyecto: se pasa explícito.
  const request = await playwright.request.newContext({
    baseURL,
    httpCredentials: { username: DEV_GATE_TEST_CREDENTIALS.username, password: 'otra' },
  })
  const response = await request.get('/')

  expect(response.status()).toBe(401)
  await request.dispose()
})

test.describe('con credenciales', () => {
  test.use({ httpCredentials: DEV_GATE_TEST_CREDENTIALS })

  test('la portada se ve y lleva noindex', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')
    await expect(page.getByRole('heading', { level: 1, name: 'Torrente Arcano' })).toBeVisible()
  })

  test('el panel responde', async ({ page }) => {
    const response = await page.goto('/admin')

    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/admin(\/create-first-user|\/login)?/)
  })

  test('robots.txt prohíbe rastrear todo', async ({ request }) => {
    const response = await request.get('/robots.txt')

    expect(response.status()).toBe(200)
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
    const body = await response.text()
    expect(body).toMatch(/^User-Agent: \*$/m)
    expect(body).toMatch(/^Disallow: \/$/m)
    expect(body).not.toMatch(/^Allow:/m)
  })
})
