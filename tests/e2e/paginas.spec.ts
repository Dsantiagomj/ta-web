import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { seedPages } from './seed/pages.ts'

// Las páginas sueltas (backlog B-09, DESIGN.md, Site page), sobre las que siembra
// scripts/seed-e2e.ts: «Emotes» y un emote suyo publicados, el aviso legal En preparación y
// la política de cookies publicada.

const { emotes, emote, notice, cookies } = seedPages

test.describe('página suelta', () => {
  test('pinta las migas, el título y el cuerpo con los bloques de las guías', async ({ page }) => {
    const response = await page.goto(`/${emote.slug}`)
    expect(response?.status()).toBe(200)

    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: emotes.title })).toHaveAttribute(
      'href',
      `/${emotes.slug}`,
    )
    await expect(page.getByRole('heading', { level: 1, name: emote.title })).toBeVisible()
    await expect(page.getByText(emote.intro)).toBeVisible()
    await expect(page.getByRole('img', { name: emote.image.alt })).toBeVisible()
    // El paso con sus coordenadas, que se copian, y el aviso.
    await expect(page.getByText(emote.step)).toBeVisible()
    await expect(page.getByRole('button', { name: '[-5,10], copiar /travel -5,10' })).toBeVisible()
    await expect(page.getByRole('note').getByText(emote.warning)).toBeVisible()
  })

  test('los enlaces de Torre a su web: aquí si el sitio sirve la página, si no a Squarespace', async ({
    page,
  }) => {
    await page.goto(`/${emote.slug}`)
    const body = page.locator('main')
    const { served, missing, gone } = emote.links
    // La página existe aquí: el enlace pasa a relativo y se abre en la misma pestaña.
    const here = body.getByRole('link', { name: served.name, exact: true })
    await expect(here).toHaveAttribute('href', `/${emotes.slug}`)
    await expect(here).not.toHaveAttribute('target', '_blank')
    // Sin página aquí: a la de Squarespace, también si Torre lo escribió relativo.
    await expect(body.getByRole('link', { name: missing.name, exact: true })).toHaveAttribute(
      'href',
      `https://www.torrentearcano.com${missing.url}`,
    )
    // Lo que aquí responde 410 sigue en Squarespace hasta el cambio de dominio.
    await expect(body.getByRole('link', { name: gone.name, exact: true })).toHaveAttribute(
      'href',
      gone.url,
    )
  })

  test('lleva el SEO de Torre, su URL canónica y Open Graph', async ({ page }) => {
    await page.goto(`/${emote.slug}`)
    await expect(page).toHaveTitle(emote.metaTitle)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      emote.metaDescription,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/${emote.slug}$`),
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })

  test('sin SEO propio, el título de la página y el principio de su texto', async ({ page }) => {
    await page.goto(`/${emotes.slug}`)
    await expect(page).toHaveTitle(emotes.title)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', emotes.intro)
    // Sin página superior, las migas llevan a la portada.
    await expect(
      page
        .getByRole('navigation', { name: 'Ruta de navegación' })
        .getByRole('link', { name: 'Inicio' }),
    ).toHaveAttribute('href', '/')
  })

  test('En preparación lleva a su página de Squarespace', async ({ request }) => {
    const response = await request.get(`/${notice.slug}`, { maxRedirects: 0 })
    expect([307, 308]).toContain(response.status())
    expect(response.headers().location).toBe(notice.legacyHref)
  })

  test('el pie enlaza la página publicada y, si no, la de Squarespace', async ({ page }) => {
    await page.goto(`/${emotes.slug}`)
    const legal = page.getByRole('navigation', { name: 'Legal' })
    await expect(legal.getByRole('link', { name: 'Aviso legal' })).toHaveAttribute(
      'href',
      notice.legacyHref,
    )
    await expect(legal.getByRole('link', { name: 'Política de cookies' })).toHaveAttribute(
      'href',
      `/${cookies.slug}`,
    )
    await expect(legal.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      'https://www.torrentearcano.com/politica-de-privacidad',
    )
  })

  test('la búsqueda de la cabecera encuentra las páginas publicadas', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await dialog.getByRole('searchbox').fill('señalar')
    await expect(
      dialog.getByRole('region', { name: 'Páginas' }).getByRole('link', { name: emote.title }),
    ).toHaveAttribute('href', `/${emote.slug}`)
    // Lo que está En preparación no se busca.
    await dialog.getByRole('searchbox').fill('aviso legal')
    await expect(dialog.getByRole('region', { name: 'Páginas' })).toHaveCount(0)
  })

  test('el sitemap lista la página publicada y no la En preparación', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()
    expect(body).toContain(`/${emote.slug}</loc>`)
    expect(body).not.toContain(`/${notice.slug}</loc>`)
  })

  test('pasa axe WCAG 2.2 AA', async ({ page }) => {
    await page.goto(`/${emote.slug}`)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations.map(({ id }) => id)).toEqual([])
  })
})
