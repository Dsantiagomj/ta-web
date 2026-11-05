import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { draftGuide, E2E_PANEL_USER, seedGuide } from './seed/guides.ts'

// La página pública de una guía de misión (DESIGN.md, Quest guide), sobre las guías que
// siembra scripts/seed-e2e.ts antes de arrancar la app.

const url = `/${seedGuide.slug}`

/** Espera a que acabe la entrada escalonada: el contraste se mide en reposo. */
async function settled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === 'finished'),
  )
}

test.describe('página de guía', () => {
  test('pinta la cabecera, el resumen, el cuerpo y el Botín', async ({ page }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1, name: seedGuide.title })).toBeVisible()
    await expect(page.getByText(`Nivel${seedGuide.level}`, { exact: true })).toBeVisible()

    const ribbon = page.getByRole('region', { name: 'Antes de empezar' })
    await expect(ribbon.getByText(seedGuide.start.npc)).toBeVisible()
    await expect(ribbon.getByRole('button', { name: /Copiar \/travel 7,-19/ })).toBeVisible()
    await expect(
      ribbon.getByRole('link', { name: `${seedGuide.prerequisite.title}.` }),
    ).toHaveAttribute('href', `/${seedGuide.prerequisite.slug}`)
    await expect(ribbon.getByText(seedGuide.needsNote)).toBeVisible()
    const reward = ribbon.getByRole('link', { name: /Recompensa/ })
    // El texto de recompensas de la guía, en una línea.
    await expect(reward).toHaveText(/16 380 XP · 390 kamas · 4 objetos del Botín/)

    // El cuerpo en orden: la entrada, los pasos y el cierre, con los [x,y] de la prosa como chips.
    await expect(page.getByText(seedGuide.intro)).toBeVisible()
    await expect(page.getByText(seedGuide.startLine)).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 3, name: /protege a las anutrof/ }),
    ).toBeVisible()
    await expect(page.getByRole('note')).toContainText(seedGuide.callout)
    await expect(
      page.getByRole('link', { name: `Ver el vídeo: ${seedGuide.video.title}` }),
    ).toBeVisible()
    await expect(page.getByText(seedGuide.outro)).toBeVisible()

    const botin = page.getByRole('region', { name: 'Botín' })
    await expect(botin.getByText(/^16\s380$/)).toBeVisible()
    for (const name of seedGuide.rewardItems) await expect(botin.getByText(name)).toBeVisible()

    await reward.click()
    await expect(page).toHaveURL(/#botin$/)
  })

  test('pinta los pasos numerados, con su título y sus coordenadas, y el Botín al final', async ({
    page,
  }) => {
    await page.goto(url)
    const steps = page.getByRole('region', { name: 'Pasos' })
    await expect(steps.getByRole('heading', { level: 2, name: 'Pasos' })).toBeVisible()
    const cards = steps.locator('ol > li')
    await expect(cards).toHaveCount(seedGuide.steps.length)

    for (const [index, step] of seedGuide.steps.entries()) {
      const card = cards.nth(index)
      await expect(card.locator('.stage__num')).toHaveText(String(index + 1))
      await expect(card.getByRole('heading', { level: 3 })).toHaveText(step.title)
      // Un título dentro del texto del paso queda por debajo de su h3.
      await expect(card.getByRole('heading', { level: 2 })).toHaveCount(0)
      const head = card.locator('.stage__head')
      if (step.coordinates) {
        await expect(
          head.getByRole('button', {
            name: `${step.coordinates}, copiar /travel ${step.coordinates.slice(1, -1)}`,
          }),
        ).toBeVisible()
      } else {
        await expect(head.locator('.coord')).toHaveCount(0)
      }
    }

    // La primera captura, dentro del primer paso, es la única con prioridad.
    await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1)
    await expect(cards.first().locator('img[fetchpriority="high"]')).toHaveCount(1)

    // El Botín es el último nodo de la línea de pasos; el cierre va después.
    await expect(steps.getByRole('region', { name: 'Botín' })).toBeVisible()
  })

  test('marcar un paso enciende su segmento de la píldora, sin JavaScript', async ({
    browser,
    baseURL,
  }) => {
    // Sin JavaScript: la casilla, el título apagado y la píldora son solo CSS.
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto(url)
    const checkbox = page.getByRole('checkbox', { name: 'Paso 2 hecho' })
    const segment = page.locator('.pill [data-seg="2"]')
    const lit = () => segment.evaluate((el) => getComputedStyle(el).transform === 'none')

    await expect(checkbox).not.toBeChecked()
    expect(await lit()).toBe(false)
    await expect(page.locator('.pill')).toContainText(`/${seedGuide.steps.length}`)

    await page.locator('label[for="pasos-e2"]').click()
    await expect(checkbox).toBeChecked()
    await expect.poll(lit).toBe(true)
    expect(
      await page.locator('.pill [data-seg="1"]').evaluate((el) => getComputedStyle(el).transform),
    ).not.toBe('none')

    await page.locator('label[for="pasos-e2"]').click()
    await expect(checkbox).not.toBeChecked()
    await expect.poll(lit).toBe(false)
    await context.close()
  })

  test('una guía sin bloques Paso se lee como prosa, sin línea de pasos', async ({ page }) => {
    await page.goto(`/${seedGuide.prerequisite.slug}`)
    await expect(page.getByText('Habla con Hupe Esse.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Pasos' })).toHaveCount(0)
    await expect(page.locator('.pill')).toHaveCount(0)
  })

  test('lleva el SEO de la guía, su URL canónica y Open Graph', async ({ page }) => {
    await page.goto(url)
    await expect(page).toHaveTitle(seedGuide.seo.metaTitle)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      seedGuide.seo.metaDescription,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${url}$`),
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  })

  test('un slug desconocido, sin publicar o mal escrito da 404 sin indexar', async ({ page }) => {
    for (const path of ['/no-existe', `/${draftGuide.slug}`, '/Seis-Pies']) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
      ).toBeVisible()
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    }
  })

  test('las rutas propias del sitio siguen ganando a /[slug]', async ({ request }) => {
    expect((await request.get('/api/health')).status()).toBe(200)
    expect((await request.get('/robots.txt')).status()).toBe(200)
  })

  test('una captura de la guía se abre a pantalla completa', async ({ page }) => {
    await page.goto(url)
    const link = page.getByRole('link', { name: /^Ver imagen a pantalla completa/ })
    await link.click()

    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByText(seedGuide.image.caption)).toBeVisible()
    await expect(viewer.locator('img')).toHaveAttribute('alt', seedGuide.image.alt)

    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    await expect(link).toBeFocused()
  })

  test('el vídeo sin portada no pisa el título con el botón a 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const frame = page.locator('.video__frame').first()
    const title = await frame.locator('.video__title').boundingBox()
    const badge = await frame.locator('.video__badge').boundingBox()
    const box = await frame.boundingBox()
    expect(title && badge && box).toBeTruthy()
    const [t, b, f] = [title!, badge!, box!]
    const overlap =
      t.x < b.x + b.width && b.x < t.x + t.width && t.y < b.y + b.height && b.y < t.y + t.height
    expect(overlap).toBe(false)
    // El título cabe entero en el marco.
    expect(t.y).toBeGreaterThanOrEqual(f.y)
    expect(t.y + t.height).toBeLessThanOrEqual(f.y + f.height)
  })

  test('un chip de coordenadas de la prosa copia su /travel', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(url)
    await page
      .locator('p', { hasText: seedGuide.startLine })
      .getByRole('button', { name: '[7,-19], copiar /travel 7,-19' })
      .click()
    await expect(page.getByRole('status')).toHaveText('Copiado: /travel 7,-19')
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await settled(page)

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})

test.describe('vista previa de borradores', () => {
  test('sin sesión del panel no se activa', async ({ page }) => {
    const response = await page.goto(`/vista-previa?slug=${draftGuide.slug}`)
    expect(response?.status()).toBe(401)
    expect((await page.goto(`/${draftGuide.slug}`))?.status()).toBe(404)
  })

  test('con sesión enseña el borrador sin indexar y se sale con un botón', async ({ page }) => {
    const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER })
    expect(login.ok()).toBe(true)

    await page.goto(`/vista-previa?slug=${draftGuide.slug}`)
    await expect(page).toHaveURL(new RegExp(`/${draftGuide.slug}$`))
    await expect(page.getByRole('heading', { level: 1, name: draftGuide.title })).toBeVisible()
    await expect(page.getByText(draftGuide.body)).toBeVisible()
    // La vista previa vuelve a pedir la página al montarse: puede haber dos metas, ambas noindex.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
    await expect(page.locator('meta[name="robots"]:not([content*="noindex"])')).toHaveCount(0)

    const bar = page.getByRole('complementary', { name: 'Vista previa' })
    await bar.getByRole('button', { name: 'Salir de la vista previa' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeVisible()
  })

  test('el JavaScript de la vista previa no llega a los visitantes', async ({ page }) => {
    await page.goto(url)
    expect(await page.content()).not.toContain('LivePreviewRefresh')
    await expect(page.getByRole('complementary', { name: 'Vista previa' })).toHaveCount(0)
  })
})
