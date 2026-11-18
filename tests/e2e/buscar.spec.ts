import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'
import { seedPages } from './seed/pages.ts'

// /buscar: la búsqueda de la portada sin JavaScript (DESIGN.md, Layout: Search page). El
// formulario del hero manda aquí el texto y la página pinta, en el servidor, los mismos grupos
// que la isla. Las guías publicadas de la semilla son «Seis pies bajo tierra» y «Esto hace
// aguas»: «es» encuentra las dos, primero la que empieza así.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('/buscar', () => {
  test('sin JavaScript, la búsqueda de la portada lleva aquí con sus resultados', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('combobox', { name: '¿Qué misión estás haciendo?' }).fill('es')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page).toHaveURL(/\/buscar\?q=es$/)
    const results = page.locator('main')
    await expect(results.getByRole('heading', { level: 2, name: 'Misiones' })).toBeVisible()
    const quests = results.getByRole('link').filter({ hasText: /Esto hace aguas|Seis pies/ })
    await expect(quests).toHaveText([/^Esto hace aguas/, /^Seis pies bajo tierra/])
    await expect(page.getByRole('status')).toContainText('2 misiones')
    await context.close()
  })

  test('el campo trae lo buscado, lo que encaja va marcado y las páginas salen en su grupo', async ({
    page,
  }) => {
    await page.goto('/buscar?q=emote')
    const field = page.getByRole('searchbox', {
      name: 'Busca una misión, un logro, un Dofus, una checklist o una página',
    })
    await expect(field).toHaveValue('emote')
    // Su id no choca con el del campo del diálogo de la cabecera.
    expect(await page.locator(`[id="${await field.getAttribute('id')}"]`).count()).toBe(1)
    await expect(page.getByRole('heading', { level: 2, name: 'Páginas' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: seedPages.emotes.title, exact: true }),
    ).toHaveAttribute('href', `/${seedPages.emotes.slug}`)
    await expect(page.locator('main mark.hit').first()).toHaveText(/emote/i)
  })

  test('sin texto o con una letra: un aviso corto y el campo, sin lista', async ({ page }) => {
    await page.goto('/buscar')
    await expect(page.getByRole('heading', { level: 1, name: 'Buscar' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(
      'Escribe el nombre de lo que buscas y pulsa «Buscar».',
    )
    await expect(page.locator('main section')).toHaveCount(0)
    await page.goto('/buscar?q=e')
    await expect(page.getByRole('status')).toHaveText('Escribe al menos dos letras para buscar.')
    await expect(page.locator('main section')).toHaveCount(0)
  })

  test('no se indexa y no trae JavaScript propio', async ({ page, request }) => {
    const html = await (await request.get('/buscar?q=es')).text()
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"/)
    // Solo el JavaScript de la cabecera: nada que no cargue ya una guía, que tiene una isla más.
    const scripts = (body: string) =>
      [...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
    const guide = await (await request.get(`/${seedGuide.slug}`)).text()
    expect(scripts(html).filter((src) => !scripts(guide).includes(src))).toEqual([])
    await page.goto('/buscar?q=es')
    await expect(page).toHaveTitle('Buscar')
  })

  for (const mode of ['dark', 'light'] as const) {
    test(`pasa axe en Amakna ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto('/buscar?q=es')
      await expect(page.getByRole('heading', { level: 2, name: 'Misiones' })).toBeVisible()
      const results = await new AxeBuilder({ page }).include('main').withTags(WCAG).analyze()
      expect(results.violations.map(({ id, nodes }) => ({ id, n: nodes.length }))).toEqual([])
    })
  }
})
