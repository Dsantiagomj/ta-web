import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { FREE_THEMES, MODES } from '../../src/lib/theme/theme.ts'
import { computedContrast } from './colors.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// El Ko-fi de Torre (DESIGN.md, Layout: Ko-fi): un botón junto a la búsqueda de la cabecera y
// otro flotante abajo a la derecha de todo el sitio, que se va al llegar al pie, donde está el
// grande. Los dos abren su Ko-fi en otra pestaña.

const KOFI = 'https://ko-fi.com/torrentearcano'
const HEADER_NAME = 'Apoya a Torre en Ko-fi (se abre en otra pestaña)'
const FAB_NAME = 'Apoya en Ko-fi (se abre en otra pestaña)'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const url = `/${seedGuide.slug}`

/** El margen lateral de la cabecera a cada ancho (DESIGN.md, Breakpoints and containers). */
const gutter = (width: number) => (width >= 1024 ? 3 * 17.6 : width >= 640 ? 24 : 16)

async function open(page: Page, path = url) {
  await page.goto(path)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

// Qué enseña la cabecera a cada ancho: con su texto, solo la taza o nada. En el móvil lo cubre
// el flotante; de 1200 a 1279px el menú completo no le deja sitio, y de 1280 a 1535px solo
// cabe la taza junto a la búsqueda.
const HEADER_STATES = [
  [390, 'none'],
  [767, 'none'],
  [768, 'text'],
  [1024, 'text'],
  [1199, 'text'],
  [1200, 'none'],
  [1279, 'none'],
  [1280, 'icon'],
  [1366, 'icon'],
  [1440, 'icon'],
  [1535, 'icon'],
  [1536, 'text'],
  [1728, 'text'],
  [2560, 'text'],
] as const

test.describe('el Ko-fi de la cabecera', () => {
  for (const [width, state] of HEADER_STATES) {
    test(`a ${width}px sale ${state === 'none' ? 'escondido' : state === 'icon' ? 'solo con la taza' : 'con su texto'} y nada se sale ni se pisa`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await open(page)
      const kofi = page.locator('.site-hdr .hkofi')
      if (state === 'none') {
        await expect(kofi).toBeHidden()
      } else {
        const link = page.getByRole('banner').getByRole('link', { name: HEADER_NAME })
        await expect(link).toBeVisible()
        await expect(link).toHaveAttribute('href', KOFI)
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', 'noopener')
        const label = kofi.locator('.hkofi__t')
        if (state === 'text') await expect(label).toBeVisible()
        else await expect(label).toBeHidden()
        const box = (await kofi.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(40)
        expect(box.width).toBeGreaterThanOrEqual(40)
      }

      // Lo de la derecha acaba en el margen y no pisa el menú ni se pisa entre sí.
      const boxes = await page.evaluate(() => {
        const visible = (el: Element) => el.getBoundingClientRect().width > 0
        const nav = document.querySelector('.site-nav')!
        const act = [...document.querySelector('.site-hdr__act')!.children].filter(visible)
        return {
          nav: visible(nav) ? nav.getBoundingClientRect().right : null,
          lockup: document.querySelector('.site-hdr .lockup')!.getBoundingClientRect().right,
          act: act.map((el) => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right, name: el.className }
          }),
          overflow: document.documentElement.scrollWidth - innerWidth,
        }
      })
      expect(boxes.overflow).toBe(0)
      const first = boxes.act[0]
      expect(boxes.nav ?? boxes.lockup).toBeLessThan(first.left)
      for (let i = 1; i < boxes.act.length; i++) {
        expect(boxes.act[i - 1].right, boxes.act[i].name).toBeLessThanOrEqual(boxes.act[i].left)
      }
      if (width >= 768) {
        expect(boxes.act.at(-1)!.right).toBeLessThanOrEqual(width - gutter(width) + 0.5)
      }
    })
  }

  for (const theme of FREE_THEMES) {
    for (const mode of MODES) {
      test(`en ${theme} ${mode}, oro con tinta oscura (4,5:1) y borde que se ve sobre la barra (3:1)`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: 'ta-theme', value: theme, url: baseURL! },
          { name: 'ta-mode', value: mode, url: baseURL! },
        ])
        await page.setViewportSize({ width: 1728, height: 800 })
        await open(page)
        const colors = await page.locator('.hkofi').evaluate((node) => {
          const style = getComputedStyle(node)
          const bar = getComputedStyle(document.querySelector('.site-hdr')!, '::before')
          return {
            fill: style.backgroundColor,
            ink: style.color,
            line: style.borderTopColor,
            lineWidth: parseFloat(style.borderTopWidth),
            bar: bar.backgroundColor,
          }
        })
        expect(computedContrast(colors.ink, colors.fill)).toBeGreaterThanOrEqual(4.5)
        expect(colors.lineWidth).toBeGreaterThanOrEqual(1)
        expect(computedContrast(colors.line, colors.bar)).toBeGreaterThanOrEqual(3)
      })
    }
  }
})

test.describe('el Ko-fi flotante', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  /** Baja hasta dejar el borde de arriba del pie a `offset` px del borde de abajo de la pantalla. */
  async function footerAt(page: Page, offset: number) {
    await page.evaluate((offset) => {
      const top = document.querySelector('.site-ft')!.getBoundingClientRect().top + scrollY
      scrollTo({ top: top - innerHeight + offset, behavior: 'instant' })
    }, offset)
  }

  test('a media página se ve abajo a la derecha y abre Ko-fi en otra pestaña', async ({ page }) => {
    await open(page)
    await footerAt(page, -600)
    const fab = page.getByRole('link', { name: FAB_NAME })
    await expect(fab).toBeVisible()
    await expect(fab).toHaveAttribute('href', KOFI)
    await expect(fab).toHaveAttribute('target', '_blank')
    await expect(fab).toHaveAttribute('rel', 'noopener')
    await expect(fab.locator('.kofi-fab__t')).toBeVisible()
    const box = (await fab.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(1440 - gutter(1440) + 0.5)
    expect(box.x + box.width).toBeGreaterThan(1440 - gutter(1440) - 2)
    expect(900 - (box.y + box.height)).toBeGreaterThanOrEqual(16)
    expect(900 - (box.y + box.height)).toBeLessThanOrEqual(32)
  })

  test('va antes del pie y por debajo de la cabecera', async ({ page }) => {
    await open(page)
    const order = await page.evaluate(() => {
      const dock = document.querySelector('.kofi-dock')!
      const footer = document.querySelector('.site-ft')!
      return dock.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    })
    expect(order).toBeTruthy()
    const z = (selector: string) =>
      page.locator(selector).evaluate((node) => Number(getComputedStyle(node).zIndex))
    expect(await z('.kofi-dock')).toBeLessThan(await z('.site-hdr'))
  })

  test('al llegar al pie se va, y nunca lo pisa', async ({ page }) => {
    await open(page)
    const fab = page.locator('.kofi-fab')
    await footerAt(page, -600)
    await expect(fab).toBeVisible()
    // Con el pie asomando, el botón queda por encima de su borde.
    await footerAt(page, 24)
    const [fabBox, footerBox] = [
      (await fab.boundingBox())!,
      (await page.locator('.site-ft').boundingBox())!,
    ]
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(footerBox.y + 0.5)
    // Con el pie en pantalla, ya no está.
    await footerAt(page, 400)
    await expect(fab).toBeHidden()
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    await expect(fab).toBeHidden()
    // Y vuelve al subir.
    await footerAt(page, -600)
    await expect(fab).toBeVisible()
  })

  test('en el móvil es solo la taza, con el mismo nombre', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page)
    await footerAt(page, -500)
    const fab = page.getByRole('link', { name: FAB_NAME })
    await expect(fab).toBeVisible()
    const box = (await fab.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(52)
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(390 - (box.x + box.width)).toBeGreaterThanOrEqual(16)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })

  test('el menú del móvil abierto lo tapa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page)
    await footerAt(page, -500)
    const box = (await page.locator('.kofi-fab').boundingBox())!
    await page.getByRole('button', { name: 'Menú' }).click()
    await expect(page.locator('#site-sheet')).toBeVisible()
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('.kofi-fab') !== null,
      [box.x + box.width / 2, box.y + box.height / 2],
    )
    expect(hit).toBe(false)
  })

  test('con la búsqueda de la portada abierta, se aparta', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('.kofi-fab')).toBeVisible()
    await page.getByRole('combobox').fill('seis')
    await expect(page.locator('.ask .cbx')).toBeVisible()
    await expect(page.locator('.kofi-fab')).toBeHidden()
  })

  test('en una checklist de escritorio no tapa el pie de su ventana; en el móvil, sí sale', async ({
    page,
  }) => {
    await page.goto(`/${seedChecklists.nebuloso.slug}`)
    await expect(page.locator('.ck-diary')).toBeVisible()
    await expect(page.locator('.kofi-fab')).toBeHidden()
    await expect(page.locator('.site-hdr .hkofi')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.kofi-fab')).toBeVisible()
  })

  test('no se imprime', async ({ page }) => {
    await open(page)
    await footerAt(page, -600)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.kofi-fab')).toBeHidden()
  })

  for (const mode of MODES) {
    test(`la cabecera y el flotante pasan axe en Amakna ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await open(page)
      await footerAt(page, -600)
      await expect(page.locator('.kofi-fab')).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include('.site-hdr')
        .include('.kofi-dock')
        .withTags(WCAG)
        .analyze()
      expect(results.violations.map(({ id, nodes }) => ({ id, n: nodes.length }))).toEqual([])
    })
  }

  for (const theme of FREE_THEMES) {
    for (const mode of MODES) {
      test(`en ${theme} ${mode}, su texto se lee (4,5:1) y su borde se ve sobre la página (3:1)`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: 'ta-theme', value: theme, url: baseURL! },
          { name: 'ta-mode', value: mode, url: baseURL! },
        ])
        await open(page)
        const colors = await page.locator('.kofi-fab').evaluate((node) => {
          const style = getComputedStyle(node)
          return {
            fill: style.backgroundColor,
            ink: style.color,
            line: style.borderTopColor,
            bg: getComputedStyle(document.documentElement).backgroundColor,
          }
        })
        expect(computedContrast(colors.ink, colors.fill)).toBeGreaterThanOrEqual(4.5)
        expect(computedContrast(colors.line, colors.bg)).toBeGreaterThanOrEqual(3)
      })
    }
  }

  test('con movimiento reducido entra sin animación', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await page.goto(url)
    const timed = await page
      .locator('.kofi-fab')
      .evaluate(
        (node) =>
          node
            .getAnimations()
            .filter((a) => a.timeline === document.timeline && a.playState !== 'finished').length,
      )
    expect(timed).toBe(0)
    await context.close()
  })

  test('en colores forzados conserva su borde', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await open(page)
    await footerAt(page, -600)
    const border = await page.locator('.kofi-fab').evaluate((node) => {
      const style = getComputedStyle(node)
      return { width: parseFloat(style.borderTopWidth), style: style.borderTopStyle }
    })
    expect(border.width).toBeGreaterThanOrEqual(1)
    expect(border.style).toBe('solid')
  })
})
