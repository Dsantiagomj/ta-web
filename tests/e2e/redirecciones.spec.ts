import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { seedAchievement } from './seed/achievements'
import { draftGuide, seedGuide } from './seed/guides'

// Las URL antiguas de Squarespace (src/lib/redirects/legacy-urls.json) y lo que necesita
// Search Console el día del corte: /sitemap.xml, robots.txt que lo anuncia y la canónica.

const legacyUrls = JSON.parse(readFileSync('src/lib/redirects/legacy-urls.json', 'utf8')) as {
  stubs: { moved: Record<string, string> }
}

/** La ruta y el ancla del Location, sea relativo o absoluto. */
function location(headers: Record<string, string>) {
  const url = new URL(headers.location, 'http://localhost')
  return url.pathname + url.hash
}

test('un hub viejo da un 301 directo a la portada', async ({ request }) => {
  const response = await request.get('/home', { maxRedirects: 0 })

  expect(response.status()).toBe(301)
  expect(location(response.headers())).toBe('/')
})

test('un metalogro viejo lleva a su panel de /metalogros', async ({ page, request }) => {
  const response = await request.get(`/${seedAchievement.group.slug}`, { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(location(response.headers())).toBe('/metalogros#astrub')

  await page.goto(`/${seedAchievement.group.slug}`)
  await expect(page).toHaveURL(/\/metalogros#astrub$/)
  await expect(page.locator('#astrub')).toBeAttached()
})

test('un esbozo vacío con logro publicado redirige a su página con 307 hasta el corte', async ({
  request,
}) => {
  const [from, to] = Object.entries(legacyUrls.stubs.moved)[0]
  const response = await request.get(from, { maxRedirects: 0 })

  expect(response.status()).toBe(307)
  expect(location(response.headers())).toBe(to)
})

test('una URL retirada da 410 con una página corta en español', async ({ page }) => {
  const response = await page.goto('/cart')

  expect(response?.status()).toBe(410)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta página ya no existe' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Volver a la portada' })).toHaveAttribute('href', '/')
})

test('un esbozo sin página da 410; uno cuya página está En preparación, 404', async ({
  request,
}) => {
  expect((await request.get('/se-busca-boarus', { maxRedirects: 0 })).status()).toBe(410)
  expect((await request.get('/se-busca-darma', { maxRedirects: 0 })).status()).toBe(404)
})

test('/sitemap.xml lista lo publicado y nunca un borrador', async ({ request }) => {
  const response = await request.get('/sitemap.xml')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('xml')
  const xml = await response.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname)
  expect(locs).toEqual(expect.arrayContaining(['/', '/metalogros', '/guias-dofus', '/checklists']))
  expect(locs).toContain(`/${seedGuide.slug}`)
  expect(locs).toContain(`/${seedAchievement.slug}`)
  // La guía en borrador de la siembra y la página de logro En preparación no salen.
  expect(locs).not.toContain(`/${draftGuide.slug}`)
  expect(locs).not.toContain(`/${seedAchievement.next.slug}`)
  expect(locs.some((path) => /^\/(admin|api)(\/|$)/.test(path))).toBe(false)
  expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/)
})

test('robots.txt anuncia el sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()

  expect(body).toMatch(/^Sitemap: https?:\/\/[^\s]+\/sitemap\.xml$/m)
})

test('la portada lleva su URL canónica', async ({ page }) => {
  await page.goto('/')

  // Next escribe la raíz sin barra final («http://host»): es la misma URL.
  const href = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(new URL(href!).pathname).toBe('/')
})
