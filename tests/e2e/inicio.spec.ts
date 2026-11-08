import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// La portada (DESIGN.md, Layout: Home) y su búsqueda de misiones, un combobox con lista
// (SEARCH-SPEC de inicio v9). Las guías publicadas de la semilla son «Seis pies bajo tierra» y
// «Esto hace aguas»: «es» encuentra las dos, primero la que empieza así.

const INDEX = '/api/search/guides'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function open(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

const field = (page: Page) => page.getByRole('combobox', { name: '¿Qué misión estás haciendo?' })
const list = (page: Page) => page.getByRole('listbox', { name: 'Misiones' })
const shown = (page: Page) => page.locator('.cbx__st')

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).include('.hero').withTags(WCAG).analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('portada', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el hero: qué es, la frase y la pregunta de Torre', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Guías de Dofus en español Torrente Arcano',
    )
    await expect(field(page)).toBeVisible()
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false')
    // La isla carga en AVIF y con prioridad alta.
    const isle = page.locator('.hero__isle')
    await expect(isle).toHaveAttribute('fetchpriority', 'high')
    await expect
      .poll(() => isle.evaluate((img: HTMLImageElement) => img.currentSrc))
      .toMatch(/krosmoz-\d+\.avif$/)
  })

  test('no pide el índice al cargar, sino al enfocar el campo', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes(INDEX)) requests.push(request.url())
    })
    await open(page)
    expect(requests).toHaveLength(0)
    await field(page).focus()
    await expect.poll(() => requests.length).toBe(1)
    // El diálogo de la cabecera usa la misma petición.
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await page.keyboard.type('seis')
    await expect(dialog.getByRole('status')).toHaveText('1 misión')
    expect(requests).toHaveLength(1)
  })

  test('con una letra pide otra; desde dos, lista las misiones resaltadas', async ({ page }) => {
    await open(page)
    await field(page).fill('s')
    await expect(shown(page)).toHaveText('Escribe una letra más para buscar.')
    await expect(list(page)).toBeHidden()
    await field(page).fill('es')
    await expect(shown(page)).toHaveText('2 misiones')
    const options = list(page).getByRole('option')
    await expect(options).toHaveCount(2)
    await expect(options.nth(0)).toContainText('Esto hace aguas')
    await expect(options.nth(0).locator('mark')).toHaveText(['Es'])
    await expect(field(page)).toHaveAttribute('aria-expanded', 'true')
    // El lector de pantalla lo oye en la región de estado, cuando se deja de escribir.
    await expect(page.locator('.ask [role="status"]')).toHaveText('2 misiones')
    await field(page).fill('zzzz')
    await expect(shown(page)).toHaveText('Ninguna misión se llama «zzzz». Prueba con otra palabra.')
  })

  test('abrir el panel, escribir y no encontrar nada no mueve la página', async ({ page }) => {
    await open(page)
    const tops = () =>
      page.evaluate(() =>
        ['.hero__art', 'h1', 'footer'].map(
          (s) => document.querySelector(s)!.getBoundingClientRect().top,
        ),
      )
    const before = await tops()
    await field(page).click()
    await page.keyboard.type('s')
    expect(await tops()).toEqual(before)
    await page.keyboard.type('esto')
    await expect(shown(page)).not.toHaveText('Escribe una letra más para buscar.')
    expect(await tops()).toEqual(before)
  })

  test('↓↓ e Intro abren la segunda; Intro sin elegir abre la primera', async ({ page }) => {
    await open(page)
    await field(page).fill('es')
    await expect(list(page).getByRole('option')).toHaveCount(2)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    const second = list(page).getByRole('option').nth(1)
    await expect(second).toHaveAttribute('aria-selected', 'true')
    await expect(field(page)).toHaveAttribute(
      'aria-activedescendant',
      (await second.getAttribute('id'))!,
    )
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${seedGuide.slug}$`))

    await open(page)
    await field(page).fill('es')
    await expect(list(page).getByRole('option')).toHaveCount(2)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${seedGuide.prerequisite.slug}$`))
  })

  test('una flecha pulsada mientras llega la lista nueva no deja una opción fantasma', async ({
    page,
  }) => {
    await open(page)
    await field(page).fill('es')
    await expect(list(page).getByRole('option')).toHaveCount(2)
    // «est» deja una sola misión; las flechas llegan antes de que se ordene la lista nueva.
    await page.keyboard.type('t')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(list(page).getByRole('option')).toHaveCount(1)
    await expect(field(page)).not.toHaveAttribute('aria-activedescendant')
    // Desde ahí, la flecha elige la que hay.
    await page.keyboard.press('ArrowDown')
    await expect(list(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  })

  test('Esc cierra, otro Esc borra; un clic fuera cierra', async ({ page }) => {
    await open(page)
    await field(page).fill('es')
    await expect(list(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(list(page)).toBeHidden()
    await expect(field(page)).toHaveValue('es')
    await page.keyboard.press('Escape')
    await expect(field(page)).toHaveValue('')

    await field(page).fill('es')
    await expect(list(page)).toBeVisible()
    await page.locator('.hero__lead').click()
    await expect(list(page)).toBeHidden()
    // Al volver al campo con texto, se abre otra vez.
    await field(page).focus()
    await expect(list(page)).toBeVisible()
  })

  test('un clic en una misión la abre', async ({ page }) => {
    await open(page)
    await field(page).fill('seis')
    await list(page)
      .getByRole('option', { name: /Seis pies bajo tierra/ })
      .click()
    await expect(page).toHaveURL(new RegExp(`/${seedGuide.slug}$`))
  })

  test('si el índice no carga, lo dice y el siguiente foco lo reintenta', async ({ page }) => {
    await page.route(`**${INDEX}`, (route) => route.abort())
    await open(page)
    await field(page).fill('seis')
    await expect(shown(page)).toHaveText('No se pudieron cargar las misiones. Vuelve a intentarlo.')
    await page.unroute(`**${INDEX}`)
    await page.locator('h1').click()
    await field(page).focus()
    await expect(shown(page)).toHaveText('1 misión')
  })

  test('mientras se ve el campo, el botón de búsqueda de la cabecera se aparta', async ({
    page,
  }) => {
    // Una ventana baja: el campo empieza bajo el borde y se puede subir y bajar.
    await page.setViewportSize({ width: 1440, height: 560 })
    await open(page)
    const button = page.locator('.site-hdr .spill')
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    await page.locator('.ask__bar').evaluate((bar) => bar.scrollIntoView({ block: 'center' }))
    await expect(button).toBeHidden()
    // Ctrl K sigue abriendo el diálogo.
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Buscar en el sitio' })).toBeVisible()
    await page.keyboard.press('Escape')
    // Fuera de la vista, el botón vuelve en el mismo sitio.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect(button).toBeVisible()
    expect(await button.boundingBox()).toEqual(box)
  })

  test('pasa axe (WCAG 2.2 AA) cerrado, con la pista, cargando, con resultados y sin ellos', async ({
    page,
  }) => {
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${INDEX}`, async (route) => {
      await held
      await route.continue()
    })
    for (const mode of ['dark', 'light']) {
      await open(page)
      if (mode === 'light') await page.getByRole('switch', { name: 'Modo claro' }).click()
      expect(await axe(page)).toEqual([])
      await field(page).fill('s')
      expect(await axe(page)).toEqual([])
      await field(page).fill('seis')
      if (mode === 'dark') {
        await expect(shown(page)).toHaveText('Cargando las misiones…')
        expect(await axe(page)).toEqual([])
        release()
      }
      await expect(shown(page)).toHaveText('1 misión')
      expect(await axe(page)).toEqual([])
      await field(page).fill('zzzz')
      expect(await axe(page)).toEqual([])
    }
  })
})

test.describe('portada con movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('Torre no se mueve al enfocar el campo', async ({ page }) => {
    await open(page)
    await field(page).focus()
    await expect(page.locator('.ask__torre img')).toHaveCSS('transform', 'none')
  })
})

test.describe('portada en el móvil', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true })

  test('el campo sube bajo la cabecera y el panel cabe en lo visible', async ({ page }) => {
    await open(page)
    await field(page).click()
    await page.keyboard.type('es')
    await expect(list(page)).toBeVisible()
    const header = (await page.locator('[data-site-header]').boundingBox())!
    await expect
      .poll(async () => (await page.locator('.ask__bar').boundingBox())!.y)
      .toBeLessThan(header.y + header.height + 24)
    const panel = (await page.locator('.cbx').boundingBox())!
    const viewport = await page.evaluate(() => window.visualViewport!.height)
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport)
    // Ocupa el ancho del campo, dentro de los márgenes.
    expect(panel.x).toBeGreaterThanOrEqual(16)
    expect(panel.x + panel.width).toBeLessThanOrEqual(390 - 16)
  })

  test('no hay desbordamiento horizontal', async ({ page }) => {
    await open(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
