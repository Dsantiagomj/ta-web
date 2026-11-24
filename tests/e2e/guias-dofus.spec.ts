import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { contrastRatio } from '../../src/lib/checklists/poster-ink.ts'
import { FREE_THEMES, MODES } from '../../src/lib/theme/theme.ts'
import { computedContrast } from './colors.ts'
import { visualLines } from './meta-lines.ts'
import { seedAchievement as logro } from './seed/achievements.ts'
import { seedDofus as dofus } from './seed/dofus-guides.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// Las guías de Dofus (DESIGN.md, Dofus guides index y Dofus guide page), sobre las que siembra
// scripts/seed-e2e.ts: el Dofus Ocre completo, el Dofawa sin logros y el Jyfus En preparación.
// Todo lo que se ve sale de la colección dofus-guides y de su índice.

/** «rgb(209, 139, 35)» → «#d18b23». */
const rgbHex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? [])
    .slice(0, 3)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('índice de las guías de Dofus', () => {
  test('pinta el título, la entradilla de Torre y una tarjeta por Dofus, en su orden', async ({
    page,
  }) => {
    const response = await page.goto('/guias-dofus')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Guías de Dofus' })).toBeVisible()
    await expect(page.getByText(dofus.index.intro)).toBeVisible()
    // Ninguna cifra en el título ni en la entradilla.
    await expect(page.locator('.dg-hero')).not.toContainText(/\d+ (guías|Dofus)/)

    const cards = page.locator('[data-dofus-grid] > li')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0)).toContainText(dofus.dofawa.name)
    await expect(cards.nth(2).getByRole('link')).toHaveAttribute('href', `/${dofus.ocre.slug}`)
    await expect(cards.nth(2)).toContainText(dofus.ocre.meta)
    await expect(cards.nth(2)).toContainText(dofus.ocre.tag)
    // Un Dofus En preparación se ve apagado y sin enlace.
    await expect(cards.nth(1).getByRole('link')).toHaveCount(0)
    await expect(cards.nth(1).locator('[aria-disabled="true"]')).toContainText('En preparación')
    // La etiqueta es una píldora pequeña, no texto suelto del tamaño del nombre.
    const tag = cards.nth(1).getByText('En preparación', { exact: true })
    // 22px y 11px a la raíz de 16px; en el escritorio (1280px), la raíz es el 110 %.
    expect((await tag.boundingBox())!.height).toBeCloseTo(22 * 1.1, 0)
    await expect(tag).toHaveCSS('font-size', '12.1px')
  })

  test('el filtro y la búsqueda dejan solo los que encajan y lo dicen', async ({ page }) => {
    await page.goto('/guias-dofus')
    const cards = page.locator('[data-dofus-grid] > li:visible')
    const status = page.getByRole('status')
    await expect(status).toHaveText('')

    await page.getByRole('button', { name: 'Primordiales' }).click()
    await expect(page.getByRole('button', { name: 'Primordiales' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(dofus.ocre.name)
    await expect(status).toHaveText('1 encontrado')

    await page.getByRole('button', { name: 'Todos' }).click()
    await page.getByRole('searchbox', { name: 'Buscar un Dofus por su nombre' }).fill('DOFAWA')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(dofus.dofawa.name)

    await page.getByRole('searchbox').fill('zurcarak')
    await expect(cards).toHaveCount(0)
    await expect(status).toHaveText('Ningún Dofus se llama «zurcarak».')
  })

  test('los antetítulos del índice, de /checklists y de la portada van en el acento y Lexend', async ({
    page,
  }) => {
    for (const [path, selector] of [
      ['/guias-dofus', '.dg-eyebrow'],
      ['/checklists', '.ck-eyebrow'],
      ['/', '.hero__eyebrow'],
    ]) {
      await page.goto(path)
      const look = await page.locator(selector).evaluate((el) => {
        const probe = document.createElement('i')
        probe.style.color = 'var(--color-accent)'
        el.append(probe)
        const accent = getComputedStyle(probe).color
        probe.remove()
        const s = getComputedStyle(el)
        return {
          accent: s.color === accent,
          family: s.fontFamily.split(',')[0].replaceAll('"', ''),
        }
      })
      expect(look, path).toEqual({ accent: true, family: 'Lexend' })
    }
  })

  test('el filtro elegido va sobre el relleno de los botones, con su tinta', async ({ page }) => {
    await page.goto('/guias-dofus')
    const all = page.getByRole('button', { name: 'Todos' })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    const look = await page.locator('.dg-seg').evaluate((seg) => {
      const probe = document.createElement('i')
      seg.append(probe)
      const token = (name: string) => {
        probe.style.color = `var(${name})`
        return getComputedStyle(probe).color
      }
      const out = {
        btn: token('--color-btn'),
        ink: token('--color-btn-ink'),
        indicator: getComputedStyle(seg.querySelector('.dg-seg__ind')!).backgroundColor,
        pressed: getComputedStyle(seg.querySelector('[aria-pressed="true"]')!).color,
        family: getComputedStyle(seg.querySelector('.dg-pill')!).fontFamily.split(',')[0],
      }
      probe.remove()
      return out
    })
    expect(look.indicator).toBe(look.btn)
    expect(look.pressed).toBe(look.ink)
    expect(look.family.replaceAll('"', '')).toBe('Lexend')
  })

  // El relleno del elegido no llega a 3:1 sobre la pista en todos los temas (el lima de Amakna
  // claro da 1,67): lleva un filete en la tinta de los botones, y uno de los dos, el filete o el
  // relleno, pasa 3:1 sobre la pista (WCAG 1.4.11).
  for (const theme of FREE_THEMES) {
    for (const mode of MODES) {
      test(`el filtro elegido se distingue de la pista (3:1) en ${theme} ${mode}`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: 'ta-theme', value: theme, url: baseURL! },
          { name: 'ta-mode', value: mode, url: baseURL! },
        ])
        await page.goto('/guias-dofus')
        const [track, fill, ring] = await page.locator('.dg-seg').evaluate((seg) => {
          const indicator = getComputedStyle(seg.querySelector('.dg-seg__ind')!)
          return [
            getComputedStyle(seg).backgroundColor,
            indicator.backgroundColor,
            /^(rgb\([^)]*\)|color\([^)]*\))/.exec(indicator.boxShadow)?.[1] ?? '',
          ]
        })
        expect(ring).not.toBe('')
        expect(
          Math.max(computedContrast(fill, track), computedContrast(ring, track)),
        ).toBeGreaterThanOrEqual(3)
      })
    }
  }

  test('en el modo claro la tarjeta En preparación se ve: su trazo llega a 3:1', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'ta-mode', value: 'light', url: baseURL! }])
    await page.goto('/guias-dofus')
    const [border, background] = await page
      .locator('.dcard--off')
      .first()
      .evaluate((card) => [
        getComputedStyle(card).borderTopColor,
        getComputedStyle(document.documentElement).backgroundColor,
      ])
    expect(computedContrast(border, background)).toBeGreaterThanOrEqual(3)
  })

  for (const width of [360, 390]) {
    test(`a ${width}px la etiqueta de la tarjeta no tapa el huevo`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      const tag = (await card.locator('.dcard__tag').boundingBox())!
      const egg = (await card.locator('.dcard__art img').boundingBox())!
      const overlaps =
        tag.x < egg.x + egg.width &&
        egg.x < tag.x + tag.width &&
        tag.y < egg.y + egg.height &&
        egg.y < tag.y + tag.height
      expect(overlaps).toBe(false)
    })
  }

  // Opción D de Torre: el borde de 2px en el color de su Dofus, la apagada de trazos, y las
  // etiquetas rellenas: «Evento» en el tono 6 y el primordial en el 2, con la tinta de los tonos.
  test('cada tarjeta con el borde de su Dofus y las etiquetas rellenas de su tono', async ({
    page,
  }) => {
    await page.goto('/guias-dofus')
    const token = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('span')
        probe.style.color = `var(${n})`
        document.body.append(probe)
        const value = getComputedStyle(probe).color
        probe.remove()
        return value
      }, name)
    const ocre = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
    await expect(ocre).toHaveCSS('border-top-width', '2px')
    await expect(ocre).toHaveCSS('border-top-color', 'rgb(209, 139, 35)')
    await expect(ocre.locator('.dcard__tag')).toHaveCSS(
      'background-color',
      await token('--color-hue-2'),
    )
    await expect(ocre.locator('.dcard__tag')).toHaveCSS('color', await token('--color-on-hue'))
    const off = page.locator('.dcard--off', { hasText: dofus.jyfus.name })
    await expect(off).toHaveCSS('border-top-style', 'dashed')
    await expect(off.locator('.dcard__tag')).toHaveCSS(
      'background-color',
      await token('--color-hue-6'),
    )
  })

  // El color de un Dofus lo elige Torre: en el modo claro, el borde se oscurece lo justo para
  // llegar a 3:1 sobre el fondo y la tarjeta (el Dofus Plateado casi no se veía).
  test('en el modo claro el borde de cada tarjeta se ve: 3:1 sobre el fondo', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'ta-mode', value: 'light', url: baseURL! }])
    await page.goto('/guias-dofus')
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
    const ocre = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
    const [border, background] = await ocre.evaluate((card) => [
      getComputedStyle(card).borderTopColor,
      getComputedStyle(document.documentElement).backgroundColor,
    ])
    expect(border).not.toBe('rgb(209, 139, 35)')
    expect(contrastRatio(rgbHex(border!), rgbHex(background!))).toBeGreaterThanOrEqual(3)
  })

  test('en el móvil, las cifras de una tarjeta se parten entre sus partes, sin empezar por el guion', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/guias-dofus')
    const meta = page.getByRole('link', { name: new RegExp(dofus.ocre.name) }).locator('.dcard__m')
    await expect(meta).toHaveText(dofus.ocre.meta)
    // Del móvil más estrecho al más ancho, la tarjeta cambia de ancho y la línea se parte en
    // otro sitio: en ninguno empieza una línea por el guion.
    for (let width = 320; width <= 440; width += 4) {
      await page.setViewportSize({ width, height: 844 })
      const lines = await visualLines(meta)
      expect(lines.length, `${width}px`).toBeGreaterThan(1)
      for (const line of lines) expect(line, `${width}px`).not.toMatch(/^-/)
      expect(lines.join(' '), `${width}px`).toBe(dofus.ocre.meta)
    }
  })

  test('sin JavaScript se ven todas las tarjetas y no sale el buscador', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/guias-dofus')
    await expect(page.locator('[data-dofus-grid] > li')).toHaveCount(3)
    await expect(page.locator('.dg-tools')).toBeHidden()
    await context.close()
  })

  // La tarjeta en 3D (DESIGN.md, Dofus guides components): con el ratón se inclina hacia él y el
  // brillo del color de su Dofus lo sigue, como los carteles de /checklists. Solo las publicadas.
  test.describe('con el ratón', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('la tarjeta publicada se inclina hacia el puntero, con su brillo, y vuelve al salir', async ({
      page,
    }) => {
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      const foil = card.locator('.dcard__foil')
      await expect(foil).toHaveCSS('opacity', '0')
      const box = (await card.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await expect(card).toHaveClass(/is-tilted/)
      await expect(card).toHaveAttribute('style', /perspective\(800px\) rotateY\(\d/)
      await expect(foil).toHaveCSS('opacity', '1')
      expect(await axe(page)).toEqual([])
      await page.mouse.move(0, 0)
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(foil).toHaveCSS('opacity', '0')
    })

    test('la «En preparación» no se inclina ni lleva brillo', async ({ page }) => {
      await page.goto('/guias-dofus')
      const off = page.locator('.dcard--off', { hasText: dofus.jyfus.name })
      await expect(off).not.toHaveAttribute('data-tilt')
      await expect(off.locator('.dcard__foil')).toHaveCount(0)
      const box = (await off.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(off).not.toHaveClass(/is-tilted/)
      await expect(off).toHaveCSS('transform', 'none')
    })

    test('con movimiento reducido no se inclina', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      const box = (await card.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(card).toHaveCSS('transform', 'none')
      await expect(card.locator('.dcard__foil')).toHaveCSS('opacity', '0')
    })
  })

  test('con el dedo no se inclina', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true })
    try {
      const page = await context.newPage()
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      await expect(card).toHaveAttribute('data-tilt')
      const box = (await card.boundingBox())!
      for (const pointerType of ['touch', 'pen']) {
        await card.dispatchEvent('pointermove', {
          pointerType,
          clientX: box.x + box.width * 0.9,
          clientY: box.y + box.height * 0.1,
        })
      }
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(card).toHaveCSS('transform', 'none')
    } finally {
      await context.close()
    }
  })

  // El LCP (DESIGN.md, Performance budgets): con un `filter` en el huevo, Chrome lo contaba como un
  // recuadro mayor que el que se ve. Su halo es un degradado detrás, sin `filter`.
  test('el huevo de una tarjeta cuenta para el LCP por lo que se ve', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
    })
    try {
      const page = await context.newPage()
      await page.addInitScript(() => {
        const w = window as unknown as { lcp: { element: Element; size: number }[] }
        w.lcp = []
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as LargestContentfulPaint[]) {
            if (entry.element) w.lcp.push({ element: entry.element, size: entry.size })
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      })
      await page.goto('/guias-dofus', { waitUntil: 'networkidle' })
      const eggs = page.locator('a.dcard .dcard__art img')
      for (const egg of await eggs.all()) await expect(egg).toHaveCSS('filter', 'none')
      const eggSizes = await page.evaluate(() => {
        const w = window as unknown as { lcp: { element: Element; size: number }[] }
        return w.lcp
          .filter(({ element }) => element.matches('.dcard__art img'))
          .map(({ element, size }) => {
            const box = element.getBoundingClientRect()
            return { size, drawn: box.width * box.height }
          })
      })
      for (const { size, drawn } of eggSizes) expect(size).toBeLessThanOrEqual(drawn * 1.05)
    } finally {
      await context.close()
    }
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto('/guias-dofus')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await axe(page)).toEqual([])
    })
  }
})

test.describe('página de una guía de Dofus', () => {
  const url = `/${dofus.ocre.slug}`

  test('las migas, la cabecera con el huevo, la ficha con Prerrequisitos, la checklist y la intro', async ({
    page,
  }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Guías de Dofus' })).toHaveAttribute(
      'href',
      '/guias-dofus',
    )
    const header = page.locator('header.dg-head')
    await expect(header.getByRole('heading', { level: 1, name: dofus.ocre.name })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toContainText(dofus.ocre.meta)
    await expect(header.locator('.qhead__meta')).toContainText(dofus.ocre.tag)
    // La cabecera del logro: nada más que el huevo, el título y el subtítulo.
    await expect(header.getByRole('heading', { level: 2 })).toHaveCount(0)
    const prerequisites = page.locator('.lsheet').getByRole('region', { name: 'Prerrequisitos' })
    await expect(prerequisites.getByText(dofus.ocre.prerequisite)).toBeVisible()
    // La checklist de su Dofus publicada en la web (la semilla del Nebuloso apunta a esta
    // guía), no la de Squarespace que guarda la guía.
    await expect(
      page.getByRole('link', { name: new RegExp(dofus.ocre.checklist.name) }),
    ).toHaveAttribute('href', `/${seedChecklists.nebuloso.slug}`)
    await expect(page.getByText(dofus.ocre.intro)).toBeVisible()
  })

  test('la ficha va a la derecha desde 64rem, abierta, a la altura de las migas', async ({
    page,
  }) => {
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    const parts = page.getByRole('region', { name: 'El logro' })
    const sheet = page.locator('.lsheet')
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      const [side, list, top] = [
        (await sheet.boundingBox())!,
        (await parts.boundingBox())!,
        (await crumbs.boundingBox())!,
      ]
      expect(side.x).toBeGreaterThanOrEqual(list.x + list.width)
      expect(Math.abs(side.y - top.y)).toBeLessThan(2)
      // Como la ficha del logro: unos 20rem, no pegajosa.
      expect(side.width).toBeLessThan(21 * 17.6)
      await expect(sheet).not.toHaveCSS('position', 'sticky')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      )
    }
    // Abierta y quieta: pulsar su título no la pliega.
    for (const name of ['Prerrequisitos', 'Necesitarás']) {
      const part = sheet.getByRole('region', { name })
      await expect(part.locator('details')).toHaveAttribute('open', '')
      await part.locator('summary').click()
      await expect(part.locator('details')).toHaveAttribute('open', '')
    }
  })

  test('en el móvil la ficha va plegada entre la cabecera y la entrada, y se abre al pulsarla', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const header = (await page.locator('header.dg-head').boundingBox())!
    const sheet = (await page.locator('.lsheet').boundingBox())!
    const intro = (await page.getByText(dofus.ocre.intro).boundingBox())!
    expect(sheet.y).toBeGreaterThanOrEqual(header.y + header.height)
    expect(intro.y).toBeGreaterThanOrEqual(sheet.y + sheet.height)
    const needs = page.locator('.lsheet').getByRole('region', { name: 'Necesitarás' })
    await expect(needs.locator('details')).not.toHaveAttribute('open', '')
    await expect(needs.getByText(dofus.ocre.needsNote)).toBeHidden()
    await needs.locator('summary').click()
    await expect(needs.getByText(dofus.ocre.needsNote)).toBeVisible()
  })

  test('Necesitarás: el objeto copia su nombre para buscarlo en el juego', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    await expect(needs.getByText(dofus.ocre.needsNote)).toBeVisible()
    const [item] = dofus.ocre.needsItems
    await needs.getByRole('button', { name: `Copiar ${item!.name}` }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(item!.name)
  })

  test('Necesitarás: una fila por línea, los objetos y después la nota de Torre, aunque vaya en medio', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    const rows = needs.locator('.lneeds__list > li')
    await expect(rows).toHaveCount(dofus.ocre.needsItems.length + 1)
    await expect(rows.last()).toContainText(dofus.ocre.needsNote)
    const boxes = await rows.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().toJSON() as DOMRect),
    )
    for (const [above, below] of boxes.slice(0, -1).map((box, i) => [box, boxes[i + 1]!])) {
      expect(below.y).toBeGreaterThanOrEqual(above.y + above.height - 1)
      expect(Math.abs(below.x - above.x)).toBeLessThan(1)
    }
    // Una nota de dos párrafos los pone uno debajo del otro, no lado a lado.
    const first = await needs.getByText(dofus.ocre.needsNote, { exact: true }).boundingBox()
    const second = await needs.getByText(dofus.ocre.needsNoteMore, { exact: true }).boundingBox()
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1)
    expect(Math.abs(second!.x - first!.x)).toBeLessThan(2)
  })

  test('el logro trae las misiones como las escribe Torre; la suelta lleva su nota', async ({
    page,
  }) => {
    await page.goto(url)
    const parts = page.getByRole('region', { name: 'El logro' })
    await expect(parts.getByRole('link', { name: logro.name, exact: true })).toHaveAttribute(
      'href',
      `/${logro.slug}`,
    )
    // Las misiones del logro son las de Torre, con su texto, no las de la página de logro.
    const { torreQuests } = dofus.ocre
    const achievementQuests = parts.getByRole('list').first()
    await expect(achievementQuests.getByRole('listitem')).toHaveCount(3)
    await expect(achievementQuests.getByRole('link', { name: torreQuests.own })).toHaveAttribute(
      'href',
      `/${seedGuide.prerequisite.slug}`,
    )
    // Una fila con dos guías: cada trozo de su texto enlaza la suya.
    const [first, second] = torreQuests.pair
    const pair = achievementQuests.getByRole('listitem').nth(1)
    await expect(pair).toContainText(torreQuests.pair.join(' - '))
    await expect(pair.getByRole('link', { name: first! })).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
    await expect(pair.getByRole('link', { name: second! })).toHaveAttribute(
      'href',
      `/${seedGuide.prerequisite.slug}`,
    )
    const noGuide = achievementQuests.getByRole('listitem').nth(2)
    await expect(noGuide).toContainText(torreQuests.noGuide)
    await expect(noGuide).toContainText('Sin guía todavía')
    await expect(noGuide.getByRole('link')).toHaveCount(0)
    // La página de logro tiene «El cazador cazado»: no sale, sale el texto de Torre.
    await expect(parts.getByText('El cazador cazado', { exact: true })).toHaveCount(0)

    await expect(parts.getByRole('heading', { name: dofus.ocre.looseTitle })).toBeVisible()
    await expect(parts.getByText(dofus.ocre.looseNote)).toBeVisible()
    await expect(parts.getByRole('link', { name: seedGuide.title }).first()).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
    // Lo que Torre enlaza que no es una misión queda en su lista, sin número de misión.
    const linkRow = parts
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: dofus.ocre.looseLink.title }) })
    await expect(linkRow.getByRole('link')).toHaveAttribute('href', dofus.ocre.looseLink.link)
    await expect(linkRow).toContainText(dofus.ocre.looseLink.note)
    await expect(linkRow).not.toContainText(/Misión \d/)
  })

  test('las misiones en la lista numerada del logro, en una sola columna', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const parts = page.getByRole('region', { name: 'El logro' })
    const rows = parts.locator('.lq__list').first().locator('.lq__item')
    await expect(rows.first().locator('.lq__n')).toHaveText('1')
    const xs = await rows.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().x),
    )
    expect(new Set(xs).size).toBe(1)
    // Toda la fila abre la guía.
    const first = (await rows.first().boundingBox())!
    await page.mouse.click(first.x + first.width - 8, first.y + first.height / 2)
    await expect(page).toHaveURL(`/${seedGuide.prerequisite.slug}`)
  })

  test('sin lista lateral, con el Dofus anterior', async ({ page }) => {
    await page.goto(url)
    await expect(page.getByRole('complementary')).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Guías de Dofus' })
    await expect(nav.getByRole('link', { name: /Dofus anterior/ })).toHaveAttribute(
      'href',
      `/${dofus.dofawa.slug}`,
    )
  })

  test('el paso a paso (como la Piñata de pino): prosa, captura, paso y cierre', async ({
    page,
  }) => {
    await page.goto(`/${dofus.dofawa.slug}`)
    const body = page.getByRole('region', { name: 'Paso a paso' })
    await expect(body.getByText(dofus.dofawa.bodyIntro)).toBeVisible()
    await expect(body.getByRole('img', { name: dofus.dofawa.bodyImageAlt })).toBeVisible()
    await expect(body.getByText(/habla con Goblepino/)).toBeVisible()
    // Las coordenadas, como en las guías de misión: un chip que se copia.
    await expect(body.locator('.coord').first()).toContainText(/38,\s*-80/)
    await expect(body.getByText(dofus.dofawa.bodyOutro)).toBeVisible()
  })

  test('Necesitarás: cada mazmorra lleva el jefe que nombra, o el icono de mazmorra', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/${dofus.dofawa.slug}`)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    const [kumijo, generic] = dofus.dofawa.needsDungeons
    const row = (text: string) => needs.locator('.lneeds__list > li').filter({ hasText: text })
    // La nota de Torre, con su cantidad en negrita; a su lado, el jefe de la Casa de los
    // Espíritus.
    const named = row('Mazmorra Kumijo')
    await expect(named).toHaveText(kumijo!.replace(' x ', ' × '))
    await expect(named.locator('b')).toHaveText('1 ×')
    const boss = named.locator('.well img')
    await expect(boss).toHaveAttribute('src', /\/api\/media\/file\//)
    await boss.scrollIntoViewIfNeeded()
    await expect
      .poll(() => boss.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0)
    // La que no nombra una sola mazmorra: el icono de mazmorra.
    await expect(row(generic!).locator('.well img')).toHaveAttribute(
      'src',
      '/img/game/jefes/crunchidor.webp',
    )
    // Un combate lleva el icono de combate.
    await expect(row(dofus.dofawa.needsCombat).locator('.well')).toHaveAttribute(
      'data-icon',
      'combat',
    )
    // El hueco va a la altura de la primera línea de la nota.
    const slot = (await named.locator('.well').boundingBox())!
    const line = await named.locator('.dg-note__t p').evaluate((p) => {
      const range = document.createRange()
      range.selectNodeContents(p)
      const [first] = range.getClientRects()
      return { y: first!.y, height: first!.height }
    })
    expect(Math.abs(slot.y + slot.height / 2 - (line.y + line.height / 2))).toBeLessThan(2)
  })

  test('un Dofus En preparación no tiene página', async ({ page }) => {
    const response = await page.goto(`/${dofus.jyfus.slug}`)
    expect(response?.status()).toBe(404)
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await axe(page)).toEqual([])
    })
  }
})

test('el menú de Dofus lleva al índice y a cada guía publicada, desde la colección', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Dofus' }).click()
  const panel = page.locator('#menu-dofus')
  await expect(panel.getByRole('link', { name: 'Ver todas las guías de Dofus' })).toHaveAttribute(
    'href',
    '/guias-dofus',
  )
  await expect(panel.getByRole('link', { name: dofus.ocre.name })).toHaveAttribute(
    'href',
    `/${dofus.ocre.slug}`,
  )
  await expect(panel.getByRole('link', { name: dofus.jyfus.name })).toHaveCount(0)
})
