import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { draftGuide, seedGuide } from './seed/guides.ts'

// La cabecera y el pie de todo el sitio (DESIGN.md, Layout: Header y Footer).

const url = `/${seedGuide.slug}`
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Espera a la isla de la cabecera: sin ella, los atajos de teclado no hacen nada. */
async function open(page: Page) {
  await page.goto(url)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

const INDEX = '/api/search/guides'

/** Las guías que encuentra la búsqueda, por slug. */
type IndexRow = [string, string, string | null, number | null]

async function axe(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).withTags(WCAG).analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('cabecera', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('tiene un desplegable por sección y Dofus trae también los checklists', async ({ page }) => {
    await open(page)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    for (const name of ['Misiones', 'Dofus']) {
      await expect(nav.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(nav.getByRole('button', { name: 'Checklists' })).toHaveCount(0)
    // Clases y Mazmorras aún no tienen páginas: se ven, con «Próximamente», sin botón ni enlace.
    for (const name of ['Clases', 'Mazmorras']) {
      await expect(nav.getByRole('button', { name: new RegExp(name) })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: new RegExp(name) })).toHaveCount(0)
      const soon = nav.locator('.np--soon', { hasText: name })
      await expect(soon).toBeVisible()
      await expect(soon).toHaveAttribute('aria-disabled', 'true')
      await expect(soon).toContainText('Próximamente')
      // Un clic no abre nada ni lo marca como desplegado.
      await soon.click()
      await expect(soon).not.toHaveAttribute('aria-expanded')
      await expect(page.locator('.panel:not([hidden])')).toHaveCount(0)
    }

    const dofus = nav.getByRole('button', { name: 'Dofus', exact: true })
    await dofus.click()
    await expect(dofus).toHaveAttribute('aria-expanded', 'true')
    const panel = page.locator('#menu-dofus')
    await expect(panel.getByRole('link', { name: /Dofus Silvestre/ })).toBeVisible()
    // Los Dofus salen de la colección de guías de Dofus: los tres sembrados, en su orden.
    await expect(panel.getByRole('listitem')).toHaveCount(3 + 3)
    // El que aún no tiene guía publicada no es un enlace.
    await expect(panel.locator('.egg-soon')).toHaveCount(1)
    await expect(panel.getByRole('link', { name: 'Jyfus' })).toHaveCount(0)
    await expect(panel.getByRole('link', { name: 'Dofus Ocre' })).toHaveAttribute(
      'href',
      '/dofus-ocre',
    )
    await expect(panel.getByRole('link', { name: 'Ver todas las guías de Dofus' })).toHaveAttribute(
      'href',
      '/guias-dofus',
    )
    // Las imágenes del juego cargan.
    for (const img of await panel.locator('img').all()) {
      await expect
        .poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth))
        .toBeGreaterThan(0)
    }

    // Esc lo cierra y el foco vuelve a su botón.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(dofus).toBeFocused()

    // Abrir otro cierra el anterior; un clic fuera los cierra todos.
    await dofus.click()
    await nav.getByRole('button', { name: 'Misiones' }).click()
    await expect(panel).toBeHidden()
    await expect(page.locator('#menu-misiones')).toBeVisible()
    await page.mouse.click(1300, 700)
    await expect(page.locator('#menu-misiones')).toBeHidden()
  })

  test('con el teclado: Tab entra al panel y salir con Tab lo cierra', async ({ page }) => {
    await open(page)
    const button = page.getByRole('button', { name: 'Misiones' })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#menu-misiones')).toBeVisible()
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    await expect(page.locator('#menu-misiones')).toBeHidden()
  })

  test('las flechas recorren los enlaces del panel abierto', async ({ page }) => {
    await open(page)
    const button = page.getByRole('button', { name: 'Dofus', exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    const links = page.locator('#menu-dofus a')
    await page.keyboard.press('ArrowDown')
    await expect(links.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(links.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(links.nth(0)).toBeFocused()
    await page.keyboard.press('End')
    await expect(links.last()).toBeFocused()
    await page.keyboard.press('Home')
    await expect(links.nth(0)).toBeFocused()
  })

  test('Ctrl K abre la búsqueda, encuentra sin tildes y Esc la cierra', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('searchbox')).toBeFocused()
    // Con una letra pide otra; desde dos, busca.
    await page.keyboard.type('d')
    await expect(dialog.getByRole('status')).toHaveText('Escribe una letra más para buscar.')
    await page.keyboard.type('ofawa')
    await expect(dialog.getByRole('status')).toHaveText('Ninguna misión; 1 resultado del menú.')
    await expect(dialog.getByRole('link', { name: 'Dofawa' })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(dialog.getByRole('link', { name: 'Dofawa' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('la búsqueda encuentra las guías publicadas y pide el índice al abrirse', async ({
    page,
  }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes(INDEX)) requests.push(request.url())
    })
    await page.goto('/')
    await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
    // Nada se pide al cargar la página: el índice llega al abrir la búsqueda.
    expect(requests).toHaveLength(0)

    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    const box = dialog.getByRole('searchbox')
    await page.keyboard.type('SEIS pies')
    const quests = dialog.getByRole('region', { name: 'Misiones' })
    const link = quests.getByRole('link', { name: new RegExp(seedGuide.title) })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', `/${seedGuide.slug}`)
    await expect(link).toContainText(`Nivel ${seedGuide.level} · ${seedGuide.achievement.name}`)
    await expect(dialog.getByRole('status')).toHaveText('1 misión')
    // Lo que encaja va resaltado, sin tildes ni mayúsculas.
    await expect(link.locator('mark')).toHaveText(['Seis', 'pies'])

    // Un borrador no sale nunca.
    await box.fill(draftGuide.title)
    await expect(dialog.getByRole('status')).toHaveText(/^Ninguna misión se llama «/)
    await expect(dialog.getByRole('region', { name: 'Misiones' })).toHaveCount(0)

    // Cerrar y abrir no lo pide otra vez.
    await dialog.getByRole('button', { name: 'Esc' }).click()
    await expect(dialog).toBeHidden()
    await page.keyboard.press('Control+k')
    await box.fill('seis pies')
    await expect(link).toBeVisible()
    expect(requests).toHaveLength(1)

    // Las flechas llegan a la misión y Enter la abre.
    await page.keyboard.press('ArrowDown')
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${seedGuide.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(seedGuide.title)
  })

  test('la búsqueda encuentra los logros publicados y los metalogros que se abren', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    const box = dialog.getByRole('searchbox')
    await box.fill('ocasion')
    const logro = dialog
      .getByRole('region', { name: 'Logros' })
      .getByRole('link', { name: /La ocasión hace al ladrón/ })
    await expect(logro).toHaveAttribute('href', '/la-ocasion-hace-al-ladron')
    await expect(logro).toContainText('Astrub · 3 misiones')
    await expect(dialog.getByRole('status')).toHaveText('1 logro')

    // Un metalogro lleva a su panel del índice.
    await box.fill('astrub')
    const metalogro = dialog
      .getByRole('region', { name: 'Metalogros' })
      .getByRole('link', { name: /^Astrub/ })
    await expect(metalogro).toHaveAttribute('href', '/metalogros#astrub')

    // Lo que está En preparación no sale: ni un logro ni un metalogro sin nada publicado.
    await box.fill('biblioteca')
    await expect(dialog.getByRole('region', { name: 'Logros' })).toHaveCount(0)
    await box.fill('templo')
    await expect(dialog.getByRole('region', { name: 'Metalogros' })).toHaveCount(0)

    await box.fill('ocasion')
    await page.keyboard.press('ArrowDown')
    await expect(logro).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/la-ocasion-hace-al-ladron$/)
  })

  test('al abrirse, antes de escribir, dice que las misiones están cargando', async ({ page }) => {
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${INDEX}`, async (route) => {
      await held
      await route.continue()
    })
    await open(page)
    await page.keyboard.press('Control+k')
    const status = page.getByRole('dialog', { name: 'Buscar en el sitio' }).getByRole('status')
    await expect(status).toHaveText('Cargando las misiones…')
    release()
    // Vacía, la línea de estado se oculta (.sdlg__st:empty) y deja de tener rol.
    await expect(page.locator('#buscar-st')).toBeEmpty()
  })

  test('si el índice no carga, lo dice y lo reintenta al abrir otra vez', async ({ page }) => {
    await page.route(`**${INDEX}`, (route) => route.abort())
    await open(page)
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await page.keyboard.type('seis pies')
    await expect(dialog.getByRole('status')).toContainText('No se pudieron cargar las misiones')

    await page.unroute(`**${INDEX}`)
    await dialog.getByRole('button', { name: 'Esc' }).click()
    await expect(dialog).toBeHidden()
    await page.keyboard.press('Control+k')
    await expect(
      dialog.getByRole('region', { name: 'Misiones' }).getByRole('link', { name: /Seis pies/ }),
    ).toBeVisible()
    await expect(dialog.getByRole('status')).toHaveText('1 misión')
  })

  test('el índice es público, cacheable y solo lleva lo publicado', async ({ request }) => {
    const response = await request.get(INDEX, { headers: { 'Accept-Encoding': 'gzip' } })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-encoding']).toBe('gzip')
    expect(response.headers()['cache-control']).toMatch(/^public, max-age=\d+/)
    const { guides } = (await response.json()) as { guides: IndexRow[] }
    const slugs = guides.map((row) => row[1])
    expect(slugs).toContain(seedGuide.slug)
    expect(slugs).toContain(seedGuide.prerequisite.slug)
    expect(slugs).not.toContain(draftGuide.slug)
  })

  test('el botón de búsqueda mide 44px de alto y es ancho', async ({ page }) => {
    await open(page)
    const pill = (await page.locator('.spill').boundingBox())!
    expect(pill.height).toBeGreaterThanOrEqual(44)
    expect(pill.width).toBeGreaterThanOrEqual(240)
  })

  test('la búsqueda abierta desde el panel de Misiones devuelve el foco a su botón', async ({
    page,
  }) => {
    await open(page)
    const misiones = page.getByRole('button', { name: 'Misiones', exact: true })
    await misiones.click()
    await page
      .locator('#menu-misiones')
      .getByRole('button', { name: /Buscar una misión/ })
      .click()
    const search = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await expect(search).toBeVisible()
    await expect(page.locator('#menu-misiones')).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(search).toBeHidden()
    await expect(misiones).toBeFocused()
  })

  test('los atajos de la búsqueda no abren nada con otro diálogo abierto', async ({ page }) => {
    await open(page)
    const link = page.getByRole('link', { name: /^Ver imagen a pantalla completa/ }).first()
    await link.scrollIntoViewIfNeeded()
    await link.click()
    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })
    await expect(viewer).toBeVisible()
    await page.keyboard.press('/')
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Buscar en el sitio' })).toBeHidden()
    await expect(viewer).toBeVisible()
  })

  test('la cabecera se vuelve opaca al bajar la página', async ({ page }) => {
    await open(page)
    const header = page.locator('header.site-hdr')
    await expect(header).not.toHaveClass(/is-scrolled/)
    await page.mouse.wheel(0, 800)
    await expect(header).toHaveClass(/is-scrolled/)
  })

  for (const mode of MODES) {
    test(`la cabecera abierta y el pie pasan axe en Arcano ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await open(page)
      await page.getByRole('button', { name: 'Dofus', exact: true }).click()
      expect(await axe(page, 'body > header')).toEqual([])
      expect(await axe(page, 'body > footer')).toEqual([])
    })
  }
})

test.describe('cabecera a 1120px', () => {
  test.use({ viewport: { width: 1120, height: 800 } })

  test('ningún panel se sale de la pantalla', async ({ page }) => {
    await open(page)
    for (const key of ['misiones', 'dofus']) {
      await page.locator(`.np[aria-controls="menu-${key}"]`).click()
      const box = (await page.locator(`#menu-${key}`).boundingBox())!
      expect(box.x, key).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, key).toBeLessThanOrEqual(1120)
      await page.keyboard.press('Escape')
    }
  })
})

test.describe('cabecera a 1360px, donde aparece el botón ancho de búsqueda', () => {
  test.use({ viewport: { width: 1360, height: 800 } })

  test('el menú y la búsqueda caben sin tocarse', async ({ page }) => {
    await open(page)
    const nav = (await page.getByRole('navigation', { name: 'Principal' }).boundingBox())!
    const pill = (await page.locator('.spill').boundingBox())!
    const mode = (await page.locator('.mode-switch').boundingBox())!
    expect(nav.x + nav.width).toBeLessThan(pill.x)
    expect(pill.x + pill.width).toBeLessThanOrEqual(mode.x)
    expect(mode.x + mode.width).toBeLessThanOrEqual(1360)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
})

test.describe('cabecera en una pantalla baja', () => {
  test.use({ viewport: { width: 1440, height: 560 } })

  test('el panel no pasa del borde inferior y se desplaza por dentro', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Dofus', exact: true }).click()
    const panel = page.locator('#menu-dofus')
    const box = (await panel.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(560)
    const last = panel.getByRole('link', { name: 'Ver todas las guías de Dofus' })
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
  })
})

test.describe('cabecera en el móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la hamburguesa abre el menú con las secciones, que se abren de una en una', async ({
    page,
  }) => {
    await open(page)
    const burger = page.getByRole('button', { name: 'Menú' })
    await burger.click()
    const sheet = page.getByRole('dialog', { name: 'Menú' })
    await expect(sheet).toBeVisible()
    const dofus = sheet.getByRole('button', { name: /Dofus y checklists/ })
    await expect(dofus).toHaveAttribute('aria-expanded', 'false')
    await dofus.click()
    await expect(dofus).toHaveAttribute('aria-expanded', 'true')
    await expect(sheet.getByRole('link', { name: /Almas del Ocre/ })).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Dofus Ocre' })).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Ver todas las guías de Dofus' })).toBeVisible()
    // Clases y Mazmorras: fichas apagadas que no se despliegan.
    for (const name of ['Clases', 'Mazmorras']) {
      const tile = sheet.locator('.stile__b--soon', { hasText: name })
      await expect(tile).toHaveAttribute('aria-disabled', 'true')
      await tile.click()
      await expect(tile).not.toHaveAttribute('aria-expanded')
    }
    expect(await axe(page, '#site-sheet')).toEqual([])

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(burger).toBeFocused()
  })

  test('la búsqueda abierta desde el menú devuelve el foco a la hamburguesa', async ({ page }) => {
    await open(page)
    const burger = page.getByRole('button', { name: 'Menú' })
    await burger.click()
    await page
      .getByRole('dialog', { name: 'Menú' })
      .getByRole('button', { name: /Buscar una misión/ })
      .click()
    const search = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await expect(search).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(search).toBeHidden()
    await expect(burger).toBeFocused()
  })

  test('el logo del menú lleva a la portada y cierra el menú', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Menú' }).click()
    const sheet = page.getByRole('dialog', { name: 'Menú' })
    await sheet.getByRole('link', { name: 'Torrente Arcano' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(sheet).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('no hay desbordamiento horizontal, tampoco a 320px', async ({ page }) => {
    await open(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    await page.setViewportSize({ width: 320, height: 640 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const bar = (await page.locator('.site-hdr__in').boundingBox())!
    const burger = (await page.getByRole('button', { name: 'Menú' }).boundingBox())!
    expect(burger.x + burger.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
  })
})

test.describe('cabecera a 320px con el dedo', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true })

  test('los botones miden 44px y la barra no desborda', async ({ page }) => {
    await open(page)
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    for (const name of ['Buscar (Ctrl K)', 'Menú']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
      expect(box.width, name).toBeGreaterThanOrEqual(44)
      expect(box.height, name).toBeGreaterThanOrEqual(44)
    }
    const bar = (await page.locator('.site-hdr__in').boundingBox())!
    const burger = (await page.getByRole('button', { name: 'Menú' }).boundingBox())!
    expect(burger.x + burger.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
})

test.describe('cabecera ancha con el dedo', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: true })

  test('el botón Buscar y los del menú miden al menos 44px de alto', async ({ page }) => {
    await open(page)
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    const search = page.locator('.spill')
    await expect(search).toBeVisible()
    expect((await search.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const dofus = page.getByRole('button', { name: 'Dofus', exact: true })
    expect((await dofus.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('pie', () => {
  test('Torre, Explorar, Comunidad y la banda legal, sin enlaces repetidos ni Instagram', async ({
    page,
  }) => {
    await open(page)
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('heading', { name: 'Torre', exact: true })).toBeVisible()
    const explore = footer.getByRole('navigation', { name: 'Explorar' })
    await expect(explore.getByRole('link')).toHaveText(['Misiones y logros', 'Dofus', 'Checklists'])
    for (const name of ['Clases', 'Mazmorras']) {
      await expect(explore.locator('.ft-soon', { hasText: name })).toContainText('Próximamente')
    }
    await expect(footer.getByRole('link', { name: /Únete al Discord/ })).toHaveAttribute(
      'href',
      'https://discord.gg/wgCxwd7b3r',
    )
    await expect(footer.getByRole('link', { name: /Apoya en Ko-fi/ })).toHaveAttribute(
      'href',
      'https://ko-fi.com/torrentearcano',
    )
    for (const name of ['Twitch', 'Kick', 'YouTube']) {
      await expect(footer.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveCount(1)
    }
    await expect(footer.getByRole('link', { name: 'Aviso legal' })).toBeVisible()
    await expect(footer).toContainText(`© ${new Date().getFullYear()} Torrente Arcano`)

    const hrefs = await footer
      .locator('a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
    const external = hrefs.filter((h) => h && h !== '#' && h !== '/')
    expect(new Set(external).size).toBe(external.length)
    expect(hrefs.join(' ')).not.toMatch(/instagram/i)
  })

  test('ningún icono del juego se pinta más grande que su archivo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page)
    for (const key of ['misiones', 'dofus']) {
      await page.locator(`.np[aria-controls="menu-${key}"]`).click()
      const panel = page.locator(`#menu-${key}`)
      for (const img of await panel.locator('img').all()) {
        await expect
          .poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth))
          .toBeGreaterThan(0)
      }
      const sizes = await panel
        .locator('img')
        .evaluateAll((imgs) =>
          (imgs as HTMLImageElement[]).map((img) => [img.clientWidth, img.naturalWidth, img.src]),
        )
      for (const [drawn, natural, src] of sizes) {
        expect(drawn as number, src as string).toBeLessThanOrEqual(natural as number)
      }
      await page.keyboard.press('Escape')
    }
  })

  test('la imagen de Torre carga', async ({ page }) => {
    await open(page)
    const face = page.locator('footer img.ft-torre__face')
    await face.scrollIntoViewIfNeeded()
    await expect
      .poll(() => face.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0)
  })
})

test.describe('volver arriba', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  /** Va al pie sin animación y apunta cada posición del scroll desde ahí. */
  async function fromFooter(page: Page) {
    await open(page)
    const up = page.getByRole('link', { name: 'Volver arriba' })
    await up.evaluate((link) => link.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500)
    await page.evaluate(() => {
      const w = window as unknown as { positions: number[] }
      w.positions = []
      addEventListener('scroll', () => w.positions.push(scrollY))
    })
    await up.focus()
    return up
  }

  const positions = (page: Page) =>
    page.evaluate(() => (window as unknown as { positions: number[] }).positions)

  test('sube con desplazamiento suave y el teclado sigue desde arriba', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await fromFooter(page)
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    // Suave: pasa por posiciones intermedias antes de llegar arriba.
    expect((await positions(page)).filter((y) => y > 0).length).toBeGreaterThan(1)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  })

  test('con movimiento reducido, salta arriba sin animación', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await fromFooter(page)
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    expect((await positions(page)).filter((y) => y > 0)).toEqual([])
  })

  // El paso queda debajo de la cabecera de 64px y en la parte alta de la pantalla (su
  // scroll-margin-top y el scroll-padding-top de html se suman).
  test('un enlace a un paso lo deja debajo de la cabecera', async ({ page }) => {
    await page.goto(`${url}#paso-2`)
    const top = (id: string) =>
      page.locator(`#${id}`).evaluate((step) => step.getBoundingClientRect().top)
    await expect.poll(() => top('paso-2')).toBeLessThanOrEqual(200)
    expect(await top('paso-2')).toBeGreaterThanOrEqual(64)

    await page.evaluate(() => {
      location.hash = '#paso-3'
    })
    await expect.poll(() => top('paso-3')).toBeLessThanOrEqual(200)
    expect(await top('paso-3')).toBeGreaterThanOrEqual(64)
  })
})
