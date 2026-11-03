import { expect, test } from '@playwright/test'

// Dev sin DEV_BASIC_AUTH_USER ni DEV_BASIC_AUTH_PASSWORD: cierra en vez de servir el
// sitio sin protección.
test('sin credenciales configuradas responde 503 y no sirve la web', async ({ request }) => {
  for (const path of ['/', '/admin']) {
    const response = await request.get(path, { maxRedirects: 0 })

    expect(response.status()).toBe(503)
    expect(response.headers()['www-authenticate']).toBeUndefined()
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
    expect(await response.text()).toMatch(/no está disponible/)
  }
})
