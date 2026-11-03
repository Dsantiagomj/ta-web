import { expect, test } from '@playwright/test'

// Fuera de dev: se indexa la web, salvo el panel, y no hay cabecera noindex.
test('robots.txt permite indexar la web y deja fuera el panel', async ({ request }) => {
  const response = await request.get('/robots.txt')

  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toMatch(/^User-Agent: \*$/m)
  expect(body).toMatch(/^Allow: \/$/m)
  expect(body).toMatch(/^Disallow: \/admin$/m)
  expect(body).not.toMatch(/^Disallow: \/$/m)
})

test('la portada no lleva X-Robots-Tag fuera de dev', async ({ request }) => {
  const response = await request.get('/')

  expect(response.status()).toBe(200)
  expect(response.headers()['x-robots-tag']).toBeUndefined()
})
