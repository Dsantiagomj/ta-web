import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedGuide } from './seed/guides.ts'

// La cabecera y el pie de todo el sitio (DESIGN.md, Layout: Header y Footer).

const url = `/${seedGuide.slug}`
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Espera a la isla de la cabecera: sin ella, los atajos de teclado no hacen nada. */
async function open(page: Page) {
  await page.goto(url)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

async function axe(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).withTags(WCAG).analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('cabecera', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('tiene un desplegable por sección y Dofus trae también los checklists', async ({ page }) => {
    await open(page)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    for (const name of ['Misiones', 'Dofus', 'Clases', 'Mazmorras']) {
      await expect(nav.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(nav.getByRole('button', { name: 'Checklists' })).toHaveCount(0)

    const dofus = nav.getByRole('button', { name: 'Dofus', exact: true })
    await dofus.click()
    await expect(dofus).toHaveAttribute('aria-expanded', 'true')
    const panel = page.locator('#menu-dofus')
    await expect(panel.getByRole('link', { name: /Dofus Silvestre/ })).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Dofus Ébano' })).toBeVisible()
    await expect(panel.getByRole('listitem')).toHaveCount(3 + 19)
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
    await nav.getByRole('button', { name: 'Clases' }).click()
    await expect(panel).toBeHidden()
    await expect(page.locator('#menu-clases').getByRole('link')).toHaveCount(19 + 1)
    await page.mouse.click(1300, 700)
    await expect(page.locator('#menu-clases')).toBeHidden()
  })

  test('con el teclado: Tab entra al panel y salir con Tab lo cierra', async ({ page }) => {
    await open(page)
    const button = page.getByRole('button', { name: 'Mazmorras' })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#menu-mazmorras')).toBeVisible()
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    await expect(page.locator('#menu-mazmorras')).toBeHidden()
  })

  test('Ctrl K abre la búsqueda, encuentra sin tildes y Esc la cierra', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('searchbox')).toBeFocused()
    await page.keyboard.type('ebano')
    await expect(dialog.getByRole('status')).toHaveText('1 resultado')
    await expect(dialog.getByRole('link', { name: 'Dofus Ébano' })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(dialog.getByRole('link', { name: 'Dofus Ébano' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
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
    await expect(sheet.getByRole('link', { name: 'Dofus Abisal' })).toBeVisible()
    expect(await axe(page, '#site-sheet')).toEqual([])

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(burger).toBeFocused()
  })

  test('no hay desbordamiento horizontal', async ({ page }) => {
    await open(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
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
    await expect(explore.getByRole('link')).toHaveText([
      'Misiones y logros',
      'Dofus',
      'Checklists',
      'Clases',
      'Mazmorras',
    ])
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

  test('la imagen de Torre carga', async ({ page }) => {
    await open(page)
    const face = page.locator('footer img.ft-torre__face')
    await face.scrollIntoViewIfNeeded()
    await expect
      .poll(() => face.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0)
  })
})
