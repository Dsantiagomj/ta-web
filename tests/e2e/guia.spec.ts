import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { expectNeedsColumns } from './needs-layout.ts'
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
    // El logro va en las migas, no en el subtítulo.
    await expect(header.getByRole('link', { name: seedGuide.achievement.name })).toHaveCount(0)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link')).toHaveText([
      'Metalogros',
      'Astrub',
      seedGuide.achievement.name,
    ])
    await expect(crumbs.getByRole('link', { name: seedGuide.achievement.name })).toHaveAttribute(
      'href',
      `/${seedGuide.achievement.slug}`,
    )

    // El PNJ que da la misión: su render importado, solo, y «Empieza con» su nombre y su
    // chincheta en una línea bajo el subtítulo.
    const giver = header.locator('figure.giver')
    await expect(giver.locator('img')).toHaveAttribute('alt', '')
    expect(
      await giver.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0)
    await expect(giver).not.toContainText(seedGuide.start.npc)
    const start = header.locator('.qhead__start')
    await expect(start).toHaveText(`Empieza con ${seedGuide.start.npc} [7,-19]`)
    await expect(start.getByRole('button', { name: '[7,-19], copiar /travel 7,-19' })).toBeVisible()

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
    // Los objetos van en la bolsa: cerrada, la lista no se ve; abierta, sí.
    const bag = rewards.getByRole('button', { name: `${seedGuide.rewardItems.length} objetos` })
    await expect(bag).toHaveAttribute('aria-expanded', 'false')
    for (const name of seedGuide.rewardItems) await expect(rewards.getByText(name)).toBeHidden()
    await bag.click()
    await expect(bag).toHaveAttribute('aria-expanded', 'true')
    const list = rewards.getByRole('list', { name: 'Objetos de recompensa' })
    await expect(list).toHaveAttribute('id', (await bag.getAttribute('aria-controls'))!)
    for (const name of seedGuide.rewardItems) await expect(list.getByText(name)).toBeVisible()
    // Cada objeto con su icono importado, en su hueco.
    await expect(list.locator('.well img')).toHaveCount(seedGuide.rewardItems.length)
    // Diferidos: cargan al abrir la bolsa, que cerrada no se pinta.
    for (const img of await list.locator('.well img').all()) {
      await expect
        .poll(() => img.evaluate((node: HTMLImageElement) => node.naturalWidth))
        .toBeGreaterThan(0)
    }
    // Los iconos del juego, en sus huecos.
    for (const icon of ['mision', 'combate', 'xp', 'kamas', 'bolsa']) {
      await expect(header.locator(`img[src="/img/game/${icon}.webp"]`)).toHaveCount(1)
    }
  })

  test('Prerrequisitos y Necesitarás lado a lado, Recompensas debajo; en el móvil, apiladas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const header = page.locator('header.qhead')
    const region = (name: string) => header.getByRole('region', { name, exact: true })
    const boxes = async () =>
      Promise.all(
        ['Prerrequisitos', 'Necesitarás', 'Recompensas'].map(
          async (name) => (await region(name).boundingBox())!,
        ),
      )
    const [pre, nec, rec] = await boxes()
    // Desde que la banda tiene sitio: las dos primeras en la misma fila, con un filete entre
    // ellas, y Recompensas en una franja bajo las dos.
    expect(Math.abs(pre.y - nec.y)).toBeLessThan(1)
    expect(nec.x).toBeGreaterThan(pre.x + pre.width)
    expect(
      await region('Necesitarás').evaluate((node) => getComputedStyle(node).borderLeftWidth),
    ).toBe('1px')
    expect(rec.y).toBeGreaterThanOrEqual(Math.max(pre.y + pre.height, nec.y + nec.height))
    expect(rec.x).toBeCloseTo(pre.x, 0)
    // Los títulos se leen como títulos: Montserrat 700 en tinta, sin mayúsculas.
    const title = await region('Necesitarás')
      .getByRole('heading')
      .evaluate((node) => {
        const style = getComputedStyle(node)
        return [style.fontWeight, style.textTransform, style.fontSize]
      })
    expect(title).toEqual(['700', 'none', `${1.125 * 17.6}px`])

    await page.setViewportSize({ width: 390, height: 844 })
    const [preM, necM, recM] = await boxes()
    expect(necM.y).toBeGreaterThanOrEqual(preM.y + preM.height)
    expect(recM.y).toBeGreaterThanOrEqual(necM.y + necM.height)

    const needs = region('Necesitarás')
    for (const { name, quantity } of seedGuide.needsItems) {
      await expect(needs.getByRole('button', { name: `Copiar ${name}` })).toBeVisible()
      await expect(needs).toContainText(`${quantity} × ${name}`)
    }
    await expectNeedsColumns(page, needs, { desktopColumns: 1 })
  })

  test('en el móvil, el PNJ mira a la izquierda junto al título y «Empieza con» va debajo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!
    const render = page.locator('figure.giver img')
    const box = (await render.boundingBox())!
    expect(box.x).toBeGreaterThan(title.x + title.width - 1)
    expect(Math.round(box.width)).toBe(50)
    // El render que mira a la izquierda (dirección 3).
    expect(await render.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('left')
    // El paso 1, justo debajo, ya lleva la chincheta.
    const start = page.locator('.qhead__start')
    await expect(start).toHaveText(`Empieza con ${seedGuide.start.npc}`, { useInnerText: true })
    await expect(start.locator('.coord')).toBeHidden()
    expect((await start.boundingBox())!.y).toBeGreaterThan(title.y + title.height)
  })

  test('en el móvil, las migas son solo el logro, como enlace de vuelta', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Astrub' })).toBeHidden()
    const back = crumbs.getByRole('link', { name: seedGuide.achievement.name })
    await expect(back).toBeVisible()
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })

  test('pinta la entrada, los pasos sin números, títulos ni casillas y el cierre', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(page.getByText(seedGuide.intro)).toBeVisible()
    const steps = page.getByRole('region', { name: 'Pasos' })
    const items = steps.locator('ol > li')
    await expect(items).toHaveCount(seedGuide.steps.length)
    for (const index of seedGuide.steps.keys()) {
      await expect(items.nth(index)).toHaveAttribute('id', `paso-${index + 1}`)
    }
    await expect(items.locator('.qstep__n')).toHaveCount(0)
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

  test('el combate: una fila por monstruo, con su imagen y «1 × Nombre»', async ({ page }) => {
    await page.goto(url)
    const fight = page.locator('ul.mobs')
    await expect(fight.getByRole('listitem')).toHaveCount(seedGuide.fight.length)
    for (const { name } of seedGuide.fight) await expect(fight).toContainText(`1 × ${name}`)
    await expect(fight.locator('.well img')).toHaveCount(seedGuide.fight.length)
    // La frase que lo presenta se queda en el texto.
    await expect(page.getByText('Vas a empezar una lucha contra:')).toBeVisible()
  })

  test('la guía acaba con la tarjeta de la siguiente misión solo si su guía está publicada', async ({
    page,
  }) => {
    await page.goto(`/${seedGuide.prerequisite.slug}`)
    const card = page.locator('a.nextq')
    await expect(card).toHaveAttribute('href', url)
    await expect(card).toContainText('Siguiente misión')
    await expect(card).toContainText(seedGuide.title)
    await expect(card).toContainText(
      `Nivel ${seedGuide.level}. Te la da ${seedGuide.start.npc} [7,-19] al terminar esta.`,
    )
    expect(
      await card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0)

    // La siguiente de Seis pies bajo tierra solo tiene un borrador: no hay tarjeta.
    await page.goto(url)
    await expect(page.locator('a.nextq')).toHaveCount(0)
  })

  // Desde 64rem la raíz es el 110 %: la columna de 55rem mide 968px y todo crece igual.
  test('una sola columna de lectura de 55rem, con los pasos separados por una línea', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    // Sin la lista «Pasos» al lado.
    await expect(page.getByRole('navigation', { name: 'Pasos' })).toHaveCount(0)
    const article = (await page.locator('main.quest > article').boundingBox())!
    expect(Math.round(article.width)).toBe(968)
    expect(Math.round(article.x)).toBe((1440 - 968) / 2)

    const items = page.getByRole('region', { name: 'Pasos' }).locator('ol > li')
    const border = (index: number) =>
      items.nth(index).evaluate((step) => {
        const style = getComputedStyle(step)
        return [style.borderTopWidth, style.borderTopStyle, style.paddingBottom]
      })
    expect(await border(0)).toEqual(['0px', 'none', '35.2px'])
    expect(await border(1)).toEqual(['1px', 'solid', '35.2px'])
  })

  test('todo un 10 % más grande desde 1024px; los móviles y las tabletas, igual', async ({
    page,
  }) => {
    const root = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    expect(await root()).toBe('17.6px')
    await page.setViewportSize({ width: 1024, height: 768 })
    expect(await root()).toBe('17.6px')
    await page.setViewportSize({ width: 1023, height: 768 })
    expect(await root()).toBe('16px')
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await root()).toBe('16px')
  })

  test('las capturas de un paso, de dos en dos y del mismo tamaño; en el móvil, una por fila', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const shots = page.locator('#paso-1 .figs img')
    await expect(shots).toHaveCount(2)
    const [first, second] = [
      (await shots.nth(0).boundingBox())!,
      (await shots.nth(1).boundingBox())!,
    ]
    // Media columna menos medio hueco, a 16:10, recortadas y centradas: las dos iguales.
    expect(first.width).toBeCloseTo((968 - 17.6) / 2, 0)
    expect(first.height).toBeCloseTo((first.width * 10) / 16, 0)
    expect(Math.abs(first.y - second.y)).toBeLessThan(1)
    expect([second.width, second.height]).toEqual([first.width, first.height])
    expect(await shots.nth(1).evaluate((img) => getComputedStyle(img).objectFit)).toBe('cover')

    await page.setViewportSize({ width: 390, height: 844 })
    const [top, below] = [(await shots.nth(0).boundingBox())!, (await shots.nth(1).boundingBox())!]
    expect(Math.round(top.width)).toBe(390 - 32)
    expect(below.y).toBeGreaterThan(top.y + top.height)
  })

  // A 1024px, en ¿Dónde está mi samurái?, la lista cerrada de la bolsa (solo invisible) salía
  // de la ventana y daba scroll horizontal. La bolsa se lleva al borde derecho de la columna,
  // como en una guía con XP y kamas largos.
  for (const width of [320, 390, 640, 1024, 1280, 1440]) {
    test(`la bolsa no da scroll horizontal a ${width}px, ni cerrada ni abierta`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      const overflow = () =>
        page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      const bag = page.getByRole('button', { name: `${seedGuide.rewardItems.length} objetos` })
      await bag.evaluate((node) => {
        const row = node.closest('.qhead__rew') as HTMLElement
        row.style.justifyContent = 'flex-end'
      })
      expect(await overflow()).toBeLessThanOrEqual(0)
      await bag.click()
      const list = page.getByRole('list', { name: 'Objetos de recompensa' })
      await expect(list).toBeVisible()
      await settled(page)
      const box = (await list.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await overflow()).toBeLessThanOrEqual(0)
    })
  }

  test('la bolsa se maneja con el teclado: Enter abre, Esc cierra y Tab fuera cierra', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const bag = page.getByRole('button', { name: `${seedGuide.rewardItems.length} objetos` })
    const list = page.getByRole('list', { name: 'Objetos de recompensa' })
    // Hasta la bolsa con el tabulador, como un lector que no usa el ratón.
    for (
      let tab = 0;
      tab < 40 && !(await bag.evaluate((node) => node === document.activeElement));
      tab++
    ) {
      await page.keyboard.press('Tab')
    }
    await expect(bag).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(bag).toHaveAttribute('aria-expanded', 'true')
    await expect(list).toBeVisible()
    // Desde 576px, un desplegable bajo el botón que no empuja el contenido.
    await settled(page)
    const [button, popover] = [(await bag.boundingBox())!, (await list.boundingBox())!]
    expect(popover.y).toBeGreaterThan(button.y + button.height)
    expect(await list.evaluate((node) => getComputedStyle(node).position)).toBe('absolute')

    await page.keyboard.press('Escape')
    await expect(bag).toHaveAttribute('aria-expanded', 'false')
    await expect(list).toBeHidden()
    await expect(bag).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(list).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(bag).toHaveAttribute('aria-expanded', 'false')
    await expect(list).toBeHidden()

    // Un segundo clic la cierra, y también un clic fuera.
    await bag.click()
    await expect(list).toBeVisible()
    await bag.click()
    await expect(list).toBeHidden()
    await bag.click()
    await page.getByRole('heading', { level: 1 }).click()
    await expect(list).toBeHidden()
  })

  test('en el móvil, la lista de la bolsa se abre debajo, en la página', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const bag = page.getByRole('button', { name: `${seedGuide.rewardItems.length} objetos` })
    const list = page.getByRole('list', { name: 'Objetos de recompensa' })
    await expect(list).toBeHidden()
    await bag.click()
    await expect(list).toBeVisible()
    expect(await list.evaluate((node) => getComputedStyle(node).position)).toBe('static')
  })

  test('sin JavaScript, la lista de la bolsa se ve', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto(url)
    const list = page.getByRole('list', { name: 'Objetos de recompensa' })
    for (const name of seedGuide.rewardItems) await expect(list.getByText(name)).toBeVisible()
    await context.close()
  })

  test('una guía sin bloques Paso se lee como prosa, sin pasos', async ({ page }) => {
    await page.goto(`/${seedGuide.prerequisite.slug}`)
    await expect(page.getByText('Habla con Hupe Esse.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Pasos' })).toHaveCount(0)
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

  test('una captura de la guía se abre a pantalla completa: el original, ampliado sin recortar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const link = page.getByRole('link', { name: /^Ver imagen a pantalla completa/ }).first()
    await link.click()

    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByText(seedGuide.image.caption)).toBeVisible()
    const image = viewer.locator('img')
    await expect(image).toHaveAttribute('alt', seedGuide.image.alt)
    // El archivo subido, no una variante «-800x…»: el mismo nombre que el de la semilla.
    const file = seedGuide.image.file.split('/').at(-1)!
    await expect(image).toHaveAttribute('src', new RegExp(`/${file.replace('.', '\\.')}$`))
    await settled(page)
    const shown = await image.evaluate((img: HTMLImageElement) => {
      const box = img.getBoundingClientRect()
      return { w: box.width, h: box.height, nw: img.naturalWidth, nh: img.naturalHeight }
    })
    // Ampliado hasta llenar la pantalla, como mucho al doble, y sin recortar.
    expect(shown.w).toBeGreaterThan(shown.nw)
    expect(shown.w).toBeLessThanOrEqual(shown.nw * 2 + 0.5)
    expect(shown.h).toBeLessThanOrEqual(900)
    expect(shown.w / shown.h).toBeCloseTo(shown.nw / shown.nh, 1)

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
    for (const bag of ['cerrada', 'abierta'] as const) {
      test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}, con la bolsa ${bag}`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
        await page.goto(url)
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (bag === 'abierta') {
          await page.locator('.bag__btn').click()
          await expect(page.getByRole('list', { name: 'Objetos de recompensa' })).toBeVisible()
        }
        await settled(page)

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()

        expect(
          results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
        ).toEqual([])
      })
    }
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
