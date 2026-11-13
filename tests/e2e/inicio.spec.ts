import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { indexChecklists } from './seed/checklists-index.ts'
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
const list = (page: Page) => page.getByRole('listbox', { name: 'Resultados' })
const shown = (page: Page) => page.locator('.cbx__st')

async function axe(page: Page) {
  // El panel de resultados entra con un fundido: axe mide los colores ya quietos.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
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

  test('Intro durante la espera abre la primera de lo escrito, no la de la lista vieja', async ({
    page,
  }) => {
    // Un índice con dos títulos que cambian de orden según lo buscado, y el reloj en la mano
    // para que las teclas lleguen dentro de los 90 ms de espera.
    await page.route(`**${INDEX}`, (route) =>
      route.fulfill({
        json: {
          guides: [
            ['Ab cd', 'ab-cd', null, 1],
            ['Cd ab', 'cd-ab', null, 1],
          ],
        },
      }),
    )
    await page.clock.install()
    await open(page)
    await field(page).fill('ab')
    await page.clock.runFor(200)
    await expect(list(page).getByRole('option').first()).toContainText('Ab cd')
    // Antes de que se ordene «cd», dos flechas eligen la segunda de la lista vieja.
    await field(page).fill('cd')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/cd-ab$/)
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
      // Con misiones y logros, cada grupo lleva su título.
      await field(page).fill('hace')
      await expect(shown(page)).toHaveText('1 misión · 1 logro')
      expect(await axe(page)).toEqual([])
      await field(page).fill('zzzz')
      expect(await axe(page)).toEqual([])
    }
  })

  test('encuentra los logros publicados, en su grupo, y las flechas los recorren', async ({
    page,
  }) => {
    await open(page)
    await field(page).fill('hace')
    await expect(shown(page)).toHaveText('1 misión · 1 logro')
    const groups = list(page).getByRole('group')
    await expect(groups).toHaveCount(2)
    await expect(list(page).getByRole('group', { name: 'Misiones' })).toContainText(
      'Esto hace aguas',
    )
    const logros = list(page).getByRole('group', { name: 'Logros' })
    await expect(logros.getByRole('option')).toHaveText(/La ocasión hace al ladrón/)
    await expect(logros.getByRole('option')).toContainText('Astrub · 3 misiones')
    // Lo que está En preparación no se busca.
    await field(page).fill('biblioteca')
    await expect(shown(page)).toHaveText(/^Ninguna misión se llama «biblioteca»/)
    // Las flechas pasan de un grupo al otro; Intro abre la página del logro.
    await field(page).fill('hace')
    await expect(groups).toHaveCount(2)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(logros.getByRole('option')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/la-ocasion-hace-al-ladron$/)
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

test.describe('portada: las secciones', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el cartel de las misiones cuenta lo mismo que la cabecera', async ({ page }) => {
    await open(page)
    const header = (await page.locator('#menu-misiones .panel__d').textContent())!
    const [guides, achievements] = header.match(/\d[\d\u202f]*/g)!
    const banner = page.locator('.areas__big .area__d')
    await expect(banner).toHaveText(
      new RegExp(`^${guides} misi(ón|ones) en ${achievements} logros?\\.`),
    )
    // Los miles con el espacio fino que no se parte, nunca con punto.
    expect(await banner.textContent()).not.toMatch(/\d\.\d{3}/)
  })

  test('cada tarjeta es un solo enlace, su título, y va adonde va el menú', async ({ page }) => {
    await open(page)
    const section = page.getByRole('region', { name: 'Qué vas a encontrar' })
    const links = section.getByRole('link')
    await expect(links).toHaveText(['Misiones y logros', 'Guías de Dofus', 'Checklists'])
    // Clases y Mazmorras aún no tienen páginas: salen apagadas, sin enlace.
    for (const name of ['Clases', 'Mazmorras']) {
      const card = section.locator('.area--soon', { hasText: name })
      await expect(card).toContainText('Próximamente')
      await expect(card.getByRole('link')).toHaveCount(0)
    }
    const footerLinks = page.getByRole('navigation', { name: 'Explorar' }).getByRole('link')
    const menu = await footerLinks.evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    const cards = await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(cards).toEqual(menu)
    // El enlace cubre la tarjeta: un clic en el arte la abre.
    await expect(links.nth(1)).toHaveAccessibleDescription(/Lo que pide cada Dofus/)
  })

  test('al señalar un punto de la guía, su parte se enmarca; los números no tapan texto', async ({
    page,
  }) => {
    await open(page)
    const ring = (n: number) =>
      page
        .locator(`.spec [data-part="${n}"]`)
        .evaluate((el) => getComputedStyle(el, '::after').opacity)
    await page.locator('[data-tour-step="3"] h3').hover()
    await expect.poll(() => ring(3)).toBe('1')
    // Los rectángulos de cada línea de texto de la guía, sin los números, contra los números.
    const overlaps = await page.evaluate(() => {
      const marks = [...document.querySelectorAll('.spec__mark')].map((m) =>
        m.getBoundingClientRect(),
      )
      const walker = document.createTreeWalker(
        document.querySelector('.spec__page')!,
        NodeFilter.SHOW_TEXT,
      )
      const lines: DOMRect[] = []
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('.spec__mark')) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        lines.push(...range.getClientRects())
      }
      return marks.filter((m) =>
        lines.some(
          (t) => m.left < t.right && m.right > t.left && m.top < t.bottom && m.bottom > t.top,
        ),
      ).length
    })
    expect(overlaps).toBe(0)
  })

  test('las checklists del menú, de su colección y sin cifras', async ({ page }) => {
    await open(page)
    const section = page.getByRole('region', { name: 'Checklists para ir a por tu Dofus' })
    // Las mismas que el menú (loadChecklistNav): la Publicada abre su página del sitio, la
    // En preparación con legacyHref abre Squarespace y la que no lo tiene no es un enlace.
    await expect(
      section.getByRole('link', { name: new RegExp(indexChecklists.published.name) }),
    ).toHaveAttribute('href', `/${indexChecklists.published.slug}`)
    await expect(
      section.getByRole('link', { name: new RegExp(indexChecklists.legacy.name) }),
    ).toHaveAttribute('href', indexChecklists.legacy.legacyHref)
    await expect(
      section.getByRole('link', { name: new RegExp(indexChecklists.preparing.name) }),
    ).toHaveCount(0)
    await expect(section).toContainText(indexChecklists.published.description)
    await expect(section).not.toContainText(/\d+ (pasos|almas)/)
  })

  test('Torre: una invitación al Discord y, sin directo, un aviso pequeño', async ({ page }) => {
    await open(page)
    const section = page.getByRole('region', { name: 'Las guías son de Torre' })
    await expect(section.getByRole('link', { name: /Discord/ })).toHaveCount(1)
    await expect(section).toContainText('Ahora no está en directo.')
    await expect(page.getByRole('region', { name: 'Torre en directo' })).toHaveCount(0)
  })

  test('el pie de la portada no repite a Torre y sus tarjetas son compactas', async ({ page }) => {
    await open(page)
    const footer = page.locator('footer')
    await expect(footer.locator('.ft-torre')).toBeHidden()
    await expect(footer.getByText('Sigue a Torre')).toBeHidden()
    for (const card of await footer.locator('.ft-join, .ft-kofi').all()) {
      // 24rem: 384px a la raíz de 16px, 422,4px con la raíz al 110 % del escritorio.
      expect((await card.boundingBox())!.width).toBeLessThanOrEqual(24 * 17.6)
    }
  })

  test('cada imagen de la portada carga', async ({ page }) => {
    await open(page)
    for (const img of await page.locator('main img').all()) {
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth))
        .toBeGreaterThan(0)
    }
  })

  for (const mode of ['dark', 'light']) {
    test(`la página entera pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page }) => {
      // El modo, por la cookie: así axe no mide a mitad de la transición del interruptor.
      await page.context().addCookies([{ name: 'ta-mode', value: mode, url: 'http://localhost' }])
      await open(page)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const results = await new AxeBuilder({ page }).include('main').withTags(WCAG).analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})

test.describe('portada en el móvil: las secciones', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('las cuatro tarjetas van en 2 × 2 con solo el título', async ({ page }) => {
    await open(page)
    const cards = page.locator('.areas > li:not(.areas__big)')
    const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
    expect(new Set(boxes.map(Math.round)).size).toBe(2)
    await expect(cards.first().locator('.area__d')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})

// El hero no se mueve mientras llega el HTML. La cabecera bloquea el analizador hasta que
// cargan las hojas (su script de modo va detrás de ellas); luego Chrome analiza el resto y
// puede pintar con el hero a medias. Si el texto iba antes que la isla en el HTML y la isla
// subía con `order`, ese primer pintado lo dejaba arriba y bajaba 240 px al llegar la isla
// (CLS 0,24 en una de cada tres ejecuciones de Lighthouse CI). Aquí se sirve la portada
// cortada justo antes del segundo hijo del hero, sin JavaScript, y lo que ya se ve tiene que
// estar donde queda con la página entera.
for (const viewport of [
  { width: 412, height: 823 },
  { width: 1440, height: 900 },
]) {
  test.describe(`portada a ${viewport.width} px, con el HTML a medias`, () => {
    test.use({ viewport, javaScriptEnabled: false })

    const heroBoxes = (page: Page) =>
      page.evaluate(async () => {
        await document.fonts.ready
        return Object.fromEntries(
          [...document.querySelectorAll('.hero__in > *')].map((el) => {
            const { x, y, width, height } = el.getBoundingClientRect()
            return [el.className, { x, y, width, height }]
          }),
        )
      })

    test('lo que se pinta del hero ya está en su sitio', async ({ page }) => {
      const html = await (await page.request.get('/')).text()
      const starts = ['<div class="hero__txt"', '<div class="hero__art"'].map((tag) =>
        html.indexOf(tag),
      )
      expect(Math.min(...starts), 'el hero tiene texto e isla').toBeGreaterThan(0)
      const partial = html.slice(0, Math.max(...starts))

      await page.route('/', (route) => route.fulfill({ contentType: 'text/html', body: partial }))
      await page.goto('/')
      const early = await heroBoxes(page)
      expect(Object.keys(early)).toHaveLength(1)

      await page.unrouteAll()
      await page.goto('/')
      const full = await heroBoxes(page)
      for (const [name, box] of Object.entries(early)) {
        expect(box, name).toEqual(full[name])
      }
    })
  })
}
