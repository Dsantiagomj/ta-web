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
  test('pinta la cabecera: PNJ, título, subtítulo y las tres columnas', async ({ page }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)

    const header = page.locator('header.qhead')
    await expect(header.getByRole('heading', { level: 1, name: seedGuide.title })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toHaveText(seedGuide.subtitle)
    await expect(header.getByRole('link', { name: seedGuide.achievement.name })).toHaveAttribute(
      'href',
      `https://www.torrentearcano.com/${seedGuide.achievement.slug}`,
    )

    // El PNJ que da la misión, con su render importado y su nombre como texto.
    const giver = header.locator('figure.giver')
    await expect(giver.getByText(seedGuide.start.npc, { exact: true })).toBeVisible()
    await expect(giver.locator('img')).toHaveAttribute('alt', '')
    expect(
      await giver.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0)
    await expect(giver.getByRole('button', { name: '[7,-19], copiar /travel 7,-19' })).toBeVisible()

    const prerequisites = header.getByRole('region', { name: 'Prerrequisitos' })
    await expect(
      prerequisites.getByRole('link', { name: seedGuide.prerequisite.title }),
    ).toHaveAttribute('href', `/${seedGuide.prerequisite.slug}`)
    await expect(header.getByRole('region', { name: 'Necesitarás' })).toContainText(
      '1 × Combate (solo)',
    )
    const rewards = header.getByRole('region', { name: 'Recompensas' })
    await expect(rewards).toContainText(/9\s800 a 16\s380 XP/)
    await expect(rewards).toContainText(/390 kamas/)
    for (const name of seedGuide.rewardItems) await expect(rewards.getByText(name)).toBeVisible()
    // Los iconos del juego, en sus huecos.
    for (const icon of ['mision', 'combate', 'xp', 'kamas']) {
      await expect(header.locator(`img[src="/img/game/${icon}.webp"]`)).toHaveCount(1)
    }
  })

  test('en el móvil, el PNJ mira a la izquierda junto al título, solo con su nombre', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!
    const render = page.locator('figure.giver img')
    const box = (await render.boundingBox())!
    expect(box.x).toBeGreaterThan(title.x + title.width - 1)
    expect(Math.round(box.width)).toBe(64)
    // El render que mira a la izquierda (dirección 3).
    expect(await render.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('left')
    await expect(page.locator('figure.giver .coord')).toBeHidden()
  })

  test('pinta la entrada, los pasos numerados sin títulos ni casillas y el cierre', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(page.getByText(seedGuide.intro)).toBeVisible()
    const steps = page.getByRole('region', { name: 'Pasos' })
    const items = steps.locator('ol > li')
    await expect(items).toHaveCount(seedGuide.steps.length)
    for (const index of seedGuide.steps.keys()) {
      await expect(items.nth(index)).toHaveAttribute('id', `paso-${index + 1}`)
      await expect(items.nth(index).locator('.qstep__n')).toHaveText(String(index + 1))
    }
    await expect(steps.getByRole('checkbox')).toHaveCount(0)
    await expect(
      steps.getByRole('heading', { level: 3, name: /protege a las anutrof/ }),
    ).toHaveCount(0)

    await expect(page.getByRole('note')).toContainText(seedGuide.callout)
    await expect(
      page.getByRole('note').getByRole('heading', { name: '¡Importante!' }),
    ).toBeVisible()
    const tips = page.getByRole('complementary', { name: 'Recomendaciones de Torre' })
    await expect(tips).toContainText(seedGuide.tips)
    await expect(tips.locator('img')).toHaveAttribute('src', '/img/torre/avatar.webp')

    await expect(
      page.getByRole('link', { name: `Ver el vídeo: ${seedGuide.video.title}` }),
    ).toBeVisible()
    await expect(page.getByText(seedGuide.outro)).toBeVisible()

    // La primera captura, dentro del primer paso, es la única con prioridad.
    await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1)
    await expect(items.first().locator('img[fetchpriority="high"]')).toHaveCount(1)
  })

  test('desde 1152px, la lista «Pasos» enlaza cada paso con su etiqueta y sus coordenadas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const tracker = page.getByRole('navigation', { name: 'Pasos' })
    await expect(tracker).toBeVisible()
    const links = tracker.getByRole('link')
    await expect(links).toHaveCount(seedGuide.steps.length)
    for (const [index, step] of seedGuide.steps.entries()) {
      const link = links.nth(index)
      await expect(link).toHaveAttribute('href', `#paso-${index + 1}`)
      await expect(link).toContainText(step.label)
      if (step.coordinates) await expect(link).toContainText(step.coordinates)
    }
    // La isla marca el paso que se está leyendo, también al bajar a los siguientes.
    await expect(links.first()).toHaveAttribute('aria-current', 'step')
    // Deja el borde superior del paso 2 al 32 % de la altura, dentro de la franja.
    await page.evaluate(() => {
      const top = document.getElementById('paso-2')!.getBoundingClientRect().top
      window.scrollBy(0, top - window.innerHeight * 0.32)
    })
    await expect(links.nth(1)).toHaveAttribute('aria-current', 'step')
    await expect(links.first()).not.toHaveAttribute('aria-current', 'step')

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(tracker).toBeHidden()
  })

  test('una guía sin bloques Paso se lee como prosa, sin pasos ni lista', async ({ page }) => {
    await page.goto(`/${seedGuide.prerequisite.slug}`)
    await expect(page.getByText('Habla con Hupe Esse.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Pasos' })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Pasos' })).toHaveCount(0)
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
