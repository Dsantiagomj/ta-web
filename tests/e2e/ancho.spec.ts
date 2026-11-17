import { expect, test, type Locator, type Page } from '@playwright/test'

import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'
import { seedPages } from './seed/pages.ts'
import { FRAME_MAX, frame, gutter } from './frame.ts'

// Toda la página a lo ancho de la ventana, alineada a la izquierda (Torre, 2026-11-16;
// DESIGN.md, Layout): ni la cabecera, ni el pie, ni el contenido van en una columna
// centrada. Solo queda el margen lateral, que desde 1024px crece con la ventana (el 5 %:
// 72px a 1440px, 96px a 1920px), y el contenido no pasa de 110rem (1936px): en una pantalla
// más ancha va centrado, con los fondos de borde a borde. El logo de la cabecera empieza
// donde empieza el contenido y su último botón acaba donde acaba (tests/e2e/frame.ts).

// Cada página con la caja que lleva su contenido: su borde izquierdo y el derecho son los
// del marco.
const pages: { name: string; path: string; box: string }[] = [
  { name: 'la portada', path: '/', box: '.home-wrap' },
  { name: 'una guía de misión', path: `/${seedGuide.slug}`, box: 'main.quest' },
  { name: 'una página del sitio', path: `/${seedPages.emote.slug}`, box: 'main.quest' },
  { name: 'un logro', path: `/${seedAchievement.slug}`, box: 'main.logro' },
  { name: 'una guía de Dofus', path: `/${seedDofus.ocre.slug}`, box: 'main.logro' },
  { name: 'los metalogros', path: '/metalogros', box: 'main.idx' },
  { name: 'las guías de Dofus', path: '/guias-dofus', box: 'main.dg-index' },
  { name: 'las checklists', path: '/checklists', box: 'main.ck-index' },
  { name: 'una checklist', path: `/${seedChecklists.nebuloso.slug}`, box: 'main.ck' },
  { name: 'la página 404', path: '/no-existe-esta-pagina', box: 'main' },
]

/** Los bordes de la caja de contenido: sin el relleno, que es el margen lateral. */
function contentEdges(locator: Locator) {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    return {
      left: rect.left + parseFloat(style.paddingLeft),
      right: rect.right - parseFloat(style.paddingRight),
    }
  })
}

async function expectFramed(page: Page, locator: Locator, label: string) {
  const { left, right } = frame(page.viewportSize()!.width)
  const edges = await contentEdges(locator)
  expect(edges.left, `${label}: borde izquierdo`).toBeCloseTo(left, 0)
  expect(edges.right, `${label}: borde derecho`).toBeCloseTo(right, 0)
}

for (const width of [1440, 1728, 1920, 2560]) {
  test.describe(`a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    for (const { name, path, box } of pages) {
      test(`${name}: la cabecera, el contenido y el pie, con los mismos bordes`, async ({
        page,
      }) => {
        await page.goto(path)
        await expectFramed(page, page.locator('.site-hdr__in'), 'la cabecera')
        await expectFramed(page, page.locator(box).first(), 'el contenido')
        await expectFramed(page, page.locator('.site-ft__in'), 'el pie')
        await expectFramed(page, page.locator('.site-ft__legal'), 'la banda legal')

        // El logo, donde empieza el contenido; el último botón de la cabecera, donde acaba.
        const { left, right } = frame(width)
        const logo = (await page.locator('.site-hdr__in > .lockup').boundingBox())!
        expect(logo.x).toBeCloseTo(left, 0)
        const last = await page
          .locator('.site-hdr__act')
          .evaluate((el) =>
            Math.max(...[...el.children].map((child) => child.getBoundingClientRect().right)),
          )
        expect(last, 'el último botón de la cabecera').toBeCloseTo(right, 0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      })
    }
  })
}

// El margen crece con la ventana desde 1024px: el 5 % de su ancho, entre 3rem y 8rem.
for (const [width, expected] of [
  [1024, 52.8],
  [1440, 72],
  [1728, 86.4],
  [1920, 96],
  [2560, 128],
] as const) {
  test(`a ${width}px el margen lateral mide ${expected}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/${seedGuide.slug}`)
    const measured = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.position = 'absolute'
      probe.style.width = 'var(--gutter)'
      document.body.append(probe)
      const value = probe.getBoundingClientRect().width
      probe.remove()
      return value
    })
    expect(Math.abs(measured - expected), `${width}px`).toBeLessThanOrEqual(2)
    expect(gutter(width)).toBeCloseTo(expected, 0)
  })
}

// En una pantalla muy ancha el contenido se para en 110rem y va centrado; los fondos (la
// barra de la cabecera, el pie, el fondo de zona) siguen de borde a borde.
test('a 2560px el contenido mide 110rem, centrado, y los fondos llegan a los bordes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1000 })
  await page.goto(`/${seedGuide.slug}`)
  const content = await contentEdges(page.locator('main.quest'))
  expect(content.right - content.left).toBeCloseTo(FRAME_MAX, 0)
  expect(content.left).toBeCloseTo(2560 - content.right, 0)
  expect(content.left).toBeGreaterThan(gutter(2560))
  for (const selector of ['.site-hdr', '.site-ft', 'main.quest']) {
    const box = (await page.locator(selector).first().boundingBox())!
    expect(box.x, selector).toBe(0)
    expect(box.width, selector).toBe(2560)
  }
})

// El Ko-fi flotante acaba en el borde derecho del contenido, también en una pantalla ancha.
for (const width of [1440, 2560]) {
  test(`a ${width}px el Ko-fi flotante acaba donde acaba el contenido`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/${seedGuide.slug}`)
    const fab = (await page.locator('.kofi-fab').boundingBox())!
    expect(fab.x + fab.width).toBeCloseTo(frame(width).right, 0)
  })
}

// Nada se sale a lo ancho, tampoco donde la cabecera va justa (el menú completo desde 1200px,
// la taza de Ko-fi desde 1280px).
for (const width of [320, 390, 1024, 1200, 1280, 1440]) {
  test(`a ${width}px ninguna página se sale a lo ancho`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const { name, path } of pages) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(overflow, name).toBe(0)
    }
  })
}

// Las rejillas llenan la fila con más columnas, sin estirar las tarjetas; en una pantalla muy
// ancha, hasta el ancho máximo del contenido (110rem).
test('las guías de Dofus: cinco por fila a 1440px y más en una pantalla ancha', async ({
  page,
}) => {
  const columns = () =>
    page
      .locator('.dg-grid')
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/guias-dofus')
  expect(await columns()).toBe(5)
  await page.setViewportSize({ width: 2560, height: 900 })
  expect(await columns()).toBeGreaterThanOrEqual(7)
})

test('los carteles de las checklists empiezan a la izquierda, no en el centro', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 900 })
  await page.goto('/checklists')
  const first = (await page.locator('[data-checklist-grid] > li').first().boundingBox())!
  expect(first.x).toBeCloseTo(frame(2560).left, 0)
})

// Ninguna columna se para antes del margen derecho (Torre, 2026-11-17): con la ventana más
// ancha que 1440px (la de Torre mide 1728px) no queda una franja vacía a la derecha de la
// página. Cada caso dice qué caja llega al borde derecho de su contenedor.
const columns: { name: string; path: string; column: string; edge: string }[] = [
  {
    name: 'una guía de misión',
    path: `/${seedGuide.slug}`,
    column: 'main.quest > article',
    edge: 'main.quest',
  },
  {
    name: 'una página del sitio',
    path: `/${seedPages.emote.slug}`,
    column: 'main.quest > article',
    edge: 'main.quest',
  },
  // La ficha, pegada al margen derecho; las misiones, hasta la ficha.
  { name: 'un logro', path: `/${seedAchievement.slug}`, column: '.lsheet', edge: 'main.logro' },
  {
    name: 'una guía de Dofus',
    path: `/${seedDofus.ocre.slug}`,
    column: 'main.logro > .logro__main',
    edge: 'main.logro',
  },
  // El paso abierto llena su panel: la cabecera del paso y sus secciones, hasta el borde.
  {
    name: 'una checklist',
    path: `/${seedChecklists.nebuloso.slug}`,
    column: '.ck-step__scroll:visible > .ck-sec',
    edge: '.ck-step__scroll:visible',
  },
]

for (const width of [1728, 1920, 2560]) {
  test.describe(`sin franja vacía a la derecha a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    for (const { name, path, column, edge } of columns) {
      test(`${name}: la columna llega al margen derecho`, async ({ page }) => {
        await page.goto(path)
        const box = (await page.locator(column).first().boundingBox())!
        const { right } = await contentEdges(page.locator(edge).first())
        expect(right - (box.x + box.width), 'hueco a la derecha').toBeLessThan(1)
      })
    }

    test('un logro: las misiones llegan hasta la ficha', async ({ page }) => {
      await page.goto(`/${seedAchievement.slug}`)
      const body = (await page.locator('.logro__body').boundingBox())!
      const sheet = (await page.locator('.lsheet').boundingBox())!
      // Solo el hueco entre las dos columnas (3rem).
      expect(sheet.x - (body.x + body.width)).toBeLessThanOrEqual(3 * 17.6 + 1)
    })
  })
}

// El texto corrido conserva una medida de lectura aunque la columna llegue al margen: 75ch
// en los pasos y dentro de los avisos y los consejos de Torre, cuyas cajas van de margen a
// margen; 72ch en la entrada y el cierre.
test('el texto corrido no crece con la columna en una pantalla ancha; las cajas, sí', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1000 })
  await page.goto(`/${seedGuide.slug}`)
  const measure = (selector: string, chars: number) =>
    page
      .locator(selector)
      .first()
      .evaluate((node, chars) => {
        const probe = document.createElement('span')
        probe.textContent = '0'.repeat(chars)
        probe.style.whiteSpace = 'nowrap'
        node.append(probe)
        const width = probe.getBoundingClientRect().width
        probe.remove()
        return { width, max: parseFloat(getComputedStyle(node).maxWidth) }
      }, chars)
  for (const selector of [
    '#paso-1 .qstep__body p',
    '#paso-2 .callout__body > p',
    '#paso-2 .torre__body > p',
  ]) {
    const { width, max } = await measure(selector, 75)
    expect(max, selector).toBeLessThanOrEqual(width + 1)
  }
  const intro = await measure('.quest__intro p', 72)
  expect(intro.max).toBeLessThanOrEqual(intro.width + 1)

  // Las cajas de los avisos y de los consejos de Torre, hasta el margen derecho.
  for (const selector of ['#paso-2 .callout', '#paso-2 .torre']) {
    const box = (await page.locator(selector).first().boundingBox())!
    expect(frame(2560).right - (box.x + box.width), selector).toBeLessThan(1)
  }
})

// El vídeo crece con la fila de capturas hasta dos de 40rem y su hueco (81rem, 1425,6px con
// la raíz al 110 %): ni pequeño junto a la rejilla ni de margen a margen.
for (const { name, path } of [
  { name: 'la guía de misión', path: `/${seedGuide.slug}` },
  { name: 'la guía de Dofus', path: `/${seedDofus.ocre.slug}` },
]) {
  test(`el vídeo de ${name} llega a 81rem y no pasa de ahí`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 })
    await page.goto(path)
    const video = (await page.locator('.video__frame').first().boundingBox())!
    expect(video.width).toBeCloseTo(81 * 17.6, 0)
    expect(video.x).toBeCloseTo(frame(1920).left, 0)
    await page.setViewportSize({ width: 1440, height: 900 })
    expect((await page.locator('.video__frame').first().boundingBox())!.width).toBeCloseTo(
      frame(1440).width,
      0,
    )
  })
}
