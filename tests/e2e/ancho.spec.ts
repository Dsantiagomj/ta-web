import { expect, test, type Locator, type Page } from '@playwright/test'

import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'
import { seedPages } from './seed/pages.ts'

// Toda la página a lo ancho de la ventana, alineada a la izquierda (Torre, 2026-11-16;
// DESIGN.md, Layout): ni la cabecera, ni el pie, ni el contenido van en una columna
// centrada. Solo queda el margen lateral (3rem desde 64rem, con la raíz al 110 %: 52,8px).
// El logo de la cabecera empieza donde empieza el contenido.

const GUTTER = 3 * 17.6

// Cada página con la caja que lleva su contenido: su borde izquierdo y el derecho son los
// de la ventana menos el margen.
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

async function expectFullWidth(page: Page, locator: Locator, label: string) {
  const width = page.viewportSize()!.width
  const { left, right } = await contentEdges(locator)
  expect(left, `${label}: borde izquierdo`).toBeCloseTo(GUTTER, 0)
  expect(right, `${label}: borde derecho`).toBeCloseTo(width - GUTTER, 0)
}

for (const width of [1440, 2560]) {
  test.describe(`a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    for (const { name, path, box } of pages) {
      test(`${name}: la cabecera, el contenido y el pie, de margen a margen`, async ({ page }) => {
        await page.goto(path)
        await expectFullWidth(page, page.locator('.site-hdr__in'), 'la cabecera')
        await expectFullWidth(page, page.locator(box).first(), 'el contenido')
        await expectFullWidth(page, page.locator('.site-ft__in'), 'el pie')
        await expectFullWidth(page, page.locator('.site-ft__legal'), 'la banda legal')

        // El logo, donde empieza el contenido.
        const logo = (await page.locator('.site-hdr__in > .lockup').boundingBox())!
        expect(logo.x).toBeCloseTo(GUTTER, 0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      })
    }
  })
}

// Las rejillas llenan la fila con más columnas, sin estirar las tarjetas.
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
  expect(await columns()).toBeGreaterThanOrEqual(9)
})

test('los carteles de las checklists empiezan a la izquierda, no en el centro', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 900 })
  await page.goto('/checklists')
  const first = (await page.locator('[data-checklist-grid] > li').first().boundingBox())!
  expect(first.x).toBeCloseTo(GUTTER, 0)
})

// Ninguna columna se para antes del margen derecho (Torre, 2026-11-17): con la ventana más
// ancha que 1440px no queda una franja vacía a la derecha de la página. Cada caso dice qué
// caja llega al borde derecho de su contenedor.
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

for (const width of [1920, 2560]) {
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
      expect(sheet.x - (body.x + body.width)).toBeLessThanOrEqual(GUTTER + 1)
    })
  })
}

// El texto corrido conserva una medida de lectura aunque la columna llegue al margen: el de
// los pasos, lo que mide la fila de dos capturas (73rem, como a 1440px); la entrada y el
// cierre, 72ch. Los avisos y los consejos de Torre, como el texto de los pasos.
test('el texto corrido no crece con la columna en una pantalla ancha', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1000 })
  await page.goto(`/${seedGuide.slug}`)
  const row = 73 * 17.6
  for (const selector of ['#paso-1 .qstep__body p', '#paso-2 .callout', '#paso-2 .torre']) {
    const box = (await page.locator(selector).first().boundingBox())!
    expect(box.width, selector).toBeLessThanOrEqual(row + 1)
  }
  const intro = page.locator('.quest__intro p').first()
  const measure = await intro.evaluate((p) => {
    const probe = document.createElement('span')
    probe.textContent = '0'.repeat(72)
    probe.style.whiteSpace = 'nowrap'
    p.append(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  })
  expect(await intro.evaluate((p) => parseFloat(getComputedStyle(p).maxWidth))).toBeLessThanOrEqual(
    measure + 1,
  )

  // En una página del sitio, el aviso tampoco se estira.
  await page.goto(`/${seedPages.emote.slug}`)
  const callout = (await page.locator('.guide-body .callout').first().boundingBox())!
  expect(callout.width).toBeLessThanOrEqual(row + 1)
})

// El vídeo y las capturas sueltas de la prosa no crecen con la columna: hasta --width-media
// (55rem, 968px con la raíz al 110 %), lo que medía la columna de la guía antes.
for (const { name, path } of [
  { name: 'la guía de misión', path: `/${seedGuide.slug}` },
  { name: 'la guía de Dofus', path: `/${seedDofus.ocre.slug}` },
]) {
  test(`el vídeo de ${name} no pasa de 55rem`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 })
    await page.goto(path)
    const video = (await page.locator('.video__frame').first().boundingBox())!
    expect(video.width).toBeCloseTo(55 * 17.6, 0)
    expect(video.x).toBeCloseTo(GUTTER, 0)
  })
}
