import { expect, test, type APIResponse } from '@playwright/test'

import { seedGuide } from '../e2e/seed/guides'

// El entorno dev (APP_ENV=dev) es público pero no se indexa: nada pide credenciales, cada
// respuesta lleva noindex y robots.txt prohíbe rastrear todo.

const NOINDEX = 'noindex, nofollow'

function expectPublicAndNoindex(response: APIResponse | null) {
  expect(response).not.toBeNull()
  expect(response!.status()).toBeLessThan(500)
  expect(response!.status()).not.toBe(401)
  expect(response!.headers()['www-authenticate']).toBeUndefined()
  expect(response!.headers()['x-robots-tag']).toBe(NOINDEX)
}

test('la portada se ve sin credenciales y lleva noindex', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  expect(response?.headers()['www-authenticate']).toBeUndefined()
  expect(response?.headers()['x-robots-tag']).toBe(NOINDEX)
  await expect(page.getByRole('heading', { level: 1, name: 'Torrente Arcano' })).toBeVisible()
})

test('una guía se ve sin credenciales y lleva noindex', async ({ page }) => {
  const response = await page.goto(`/${seedGuide.slug}`)

  expect(response?.status()).toBe(200)
  expect(response?.headers()['x-robots-tag']).toBe(NOINDEX)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('el panel carga sin credenciales de basic auth: pide su propio inicio de sesión', async ({
  page,
}) => {
  const response = await page.goto('/admin')

  expect(response?.status()).toBeLessThan(400)
  expect(response?.headers()['x-robots-tag']).toBe(NOINDEX)
  // La base de E2E ya tiene el usuario del panel sembrado: Payload pide iniciar sesión.
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
})

test('los estáticos de Next llevan noindex', async ({ page, request }) => {
  await page.goto('/')
  const scripts = await page
    .locator('script[src^="/_next/static/"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('src')!))
  expect(scripts.length).toBeGreaterThan(0)

  const response = await request.get(scripts[0])

  expect(response.status()).toBe(200)
  expectPublicAndNoindex(response)
})

test('las respuestas de la API llevan noindex', async ({ request }) => {
  const ready = await request.get('/api/ready')
  expect(ready.status()).toBe(200)
  expect(await ready.json()).toMatchObject({ status: 'ok', db: 'ok' })
  expectPublicAndNoindex(ready)

  // Un anónimo no lista los usuarios del panel, pero la respuesta también lleva noindex.
  expectPublicAndNoindex(await request.get('/api/users'))
})

test('robots.txt prohíbe rastrear todo', async ({ request }) => {
  const response = await request.get('/robots.txt')

  expect(response.status()).toBe(200)
  expectPublicAndNoindex(response)
  const body = await response.text()
  expect(body).toMatch(/^User-Agent: \*$/m)
  expect(body).toMatch(/^Disallow: \/$/m)
  expect(body).not.toMatch(/^Allow:/m)
})
