import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator } from '@playwright/test'

import { MODES, THEMES } from '../../src/lib/theme/theme.ts'

// El catálogo de componentes (DESIGN.md, Component catalog). En producción da 404; el
// servidor de estas pruebas lo abre con E2E_DESIGN_CATALOG=1 (playwright.config.ts).

const COMPONENTS = [
  'brand',
  'site',
  'buttons',
  'chips',
  'callouts',
  'figures',
  'checkbox',
  'cards',
  'torre',
  'header',
  'wells',
  'items',
  'fight',
  'coordinates',
  'steps',
  'chain',
  'video',
  'image',
]

const sections = THEMES.flatMap((theme) => MODES.map((mode) => ({ theme, mode })))

/** El color de un valor crudo del tema (--t-*) leído en la propia sección, como rgb(). */
function rawToken(section: Locator, name: string) {
  return section.evaluate((node, token) => {
    const probe = document.createElement('span')
    probe.style.color = getComputedStyle(node).getPropertyValue(token).trim()
    node.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, name)
}

test.describe('catálogo /sistema', () => {
  test('las cifras separan los miles con un espacio fino que no se parte', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    const amount = page.locator('[data-component="figures"] .amount').first()
    await expect(amount).toHaveText('1\u202F272')
    await expect(amount).toHaveCSS('white-space', 'nowrap')
  })

  test('pinta cada componente en los cinco temas y los dos modos', async ({ page }) => {
    await page.goto('/sistema')
    await expect(page.getByRole('heading', { level: 1, name: 'Sistema de diseño' })).toBeVisible()

    for (const { theme, mode } of sections) {
      const section = page.locator(`section[data-theme="${theme}"][data-mode="${mode}"]`)
      await expect(section).toHaveCount(1)
      for (const component of COMPONENTS) {
        await expect(
          section.locator(`[data-component="${component}"]`),
          `${component} en ${theme} ${mode}`,
        ).toBeVisible()
      }
    }
  })

  test('el CSS escrito a mano lee los colores del tema de su sección', async ({ page }) => {
    await page.goto('/sistema')

    for (const { theme, mode } of sections) {
      const section = page.locator(`#${theme}-${mode}`)
      const card = section.locator('.torre__box').first()
      const chip = section.locator('.coord').first()
      expect(await card.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
        await rawToken(section, '--t-surface'),
      )
      expect(await chip.evaluate((node) => getComputedStyle(node).color)).toBe(
        await rawToken(section, '--t-accent'),
      )
    }
  })

  test('un chip de coordenadas copia /travel x,y y lo anuncia', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/sistema?tema=arcano&modo=dark')

    const chip = page.getByRole('button', { name: '[1,-17], copiar /travel 1,-17' })
    await chip.click()

    await expect(page.getByRole('status')).toHaveText('Copiado: /travel 1,-17')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/travel 1,-17')

    await page.getByRole('button', { name: '[5,-18], copiar /travel 5,-18' }).press('Enter')
    await expect(page.getByRole('status')).toHaveText('Copiado: /travel 5,-18')
  })

  test('un objeto copia su nombre, lo anuncia y su icono también copia', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/sistema?tema=arcano&modo=dark')

    // En reposo, el objeto se ve como siempre: sin el icono de copiar.
    const header = page.locator('[data-component="header"]')
    const name = header.getByRole('button', { name: 'Copiar Ojo de arakmutada' })
    await expect(name.locator('.copyname__i').first()).toHaveCSS('opacity', '0')

    // Un clic en el hueco del icono copia el nombre, sin la cantidad.
    const row = header.locator('li', {
      has: page.getByRole('button', { name: 'Copiar Ojo de arakmutada' }),
    })
    // El centro del hueco de 44px: el ::after del nombre lo cubre.
    await row.click({ position: { x: 22, y: 22 } })
    await expect(page.getByRole('status')).toHaveText('Copiado: Ojo de arakmutada')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Ojo de arakmutada')
    await expect(name).toHaveAttribute('data-copied', '')

    // Con el ratón encima: el nombre en accent y el icono a la vista.
    await name.hover()
    await expect(name.locator('.copyname__ok')).toHaveCSS('opacity', '1')

    // En el chip, «× 1» va justo detrás del nombre: el chip no enseña icono de copiar.
    const chip = page.getByRole('button', { name: 'Copiar Dofus Esmeralda' })
    await chip.hover()
    await expect(chip.locator('.copyname__i').first()).toBeHidden()

    await page.getByRole('button', { name: 'Copiar Pico de tofu' }).press('Enter')
    await expect(page.getByRole('status')).toHaveText('Copiado: Pico de tofu')
  })

  test('todo control con hit-target tiene al menos 40px de objetivo', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    const heights = await page
      .locator('.hit-target')
      .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el, '::after').height)))
    expect(heights.length).toBeGreaterThan(0)
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(40)
  })

  test('el objetivo de un chip de coordenadas mide al menos 40px de alto', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    // El chip dibujado mide 32px; el ::after transparente agranda el área que se pulsa.
    const height = await page
      .locator('.coord')
      .first()
      .evaluate((chip) => {
        const after = getComputedStyle(chip, '::after')
        return (
          chip.getBoundingClientRect().height - parseFloat(after.top) - parseFloat(after.bottom)
        )
      })
    expect(height).toBeGreaterThanOrEqual(40)
  })

  test('los huecos de los iconos son claros en modo claro', async ({ page }) => {
    await page.goto('/sistema')
    for (const theme of THEMES) {
      const section = page.locator(`#${theme}-light`)
      const well = section.locator('[data-component="wells"] .well').first()
      expect(await well.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
        await rawToken(section, '--t-bg'),
      )
      // El color del hueco en 0-255, sea rgb() o color(srgb …), que da color-mix.
      const [r, g, b] = await well.evaluate((node) => {
        const canvas = document.createElement('canvas').getContext('2d')!
        canvas.fillStyle = getComputedStyle(node).backgroundColor
        canvas.fillRect(0, 0, 1, 1)
        return [...canvas.getImageData(0, 0, 1, 1).data]
      })
      // Claro, como el chip de coordenadas (DESIGN.md, Icon wells).
      expect((r! + g! + b!) / 3).toBeGreaterThan(180)
    }
  })

  test('el vídeo no carga nada de YouTube hasta pulsar', async ({ page }) => {
    const youtube: string[] = []
    page.on('request', (request) => {
      if (/youtube|ytimg|googlevideo/.test(new URL(request.url()).hostname)) {
        youtube.push(request.url())
      }
    })
    await page.goto('/sistema?tema=arcano&modo=dark')
    const video = page.locator('[data-component="video"]')
    await expect(video.locator('iframe')).toHaveCount(0)
    expect(youtube).toEqual([])

    await video
      .getByRole('link', { name: /^Ver el vídeo/ })
      .first()
      .click()

    await expect(video.locator('iframe').first()).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/VaY3tyYTq4A?autoplay=1',
    )
  })

  test('una captura se abre a pantalla completa y Esc la cierra', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    const link = page
      .locator('[data-component="image"]')
      .getByRole('link', { name: /^Ver imagen a pantalla completa/ })
    await link.click()

    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })
    await expect(viewer).toBeVisible()
    await expect(viewer.locator('img')).toBeVisible()
    expect(await viewer.locator('img').evaluate((img: HTMLImageElement) => img.complete)).toBe(true)
    await expect(viewer.getByText('Hupe Esse, en la Biblioteca de Astrub.')).toBeVisible()
    // El visor toma el tema y el modo de la sección de la captura.
    await expect(viewer).toHaveAttribute('data-theme', 'arcano')

    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    await expect(link).toBeFocused()
  })

  test('el visor se cierra con el botón Cerrar y con un clic fuera de la imagen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/sistema?tema=bonta&modo=light')
    const link = page
      .locator('[data-component="image"]')
      .getByRole('link', { name: /^Ver imagen a pantalla completa/ })
    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })

    await link.click()
    await expect(viewer).toBeVisible()
    await expect(viewer).toHaveAttribute('data-theme', 'bonta')
    // La imagen nunca pasa del ancho de la pantalla.
    const box = (await viewer.locator('img').boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)

    await viewer.getByRole('button', { name: 'Cerrar' }).click()
    await expect(viewer).toBeHidden()
    await expect(link).toBeFocused()

    await link.click()
    await expect(viewer).toBeVisible()
    // Un clic en el fondo, lejos de la imagen y del pie.
    await page.mouse.click(195, 830)
    await expect(viewer).toBeHidden()
    await expect(link).toBeFocused()
  })

  test('el visor abierto pasa axe (WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=light')
    await page
      .locator('[data-component="image"]')
      .getByRole('link', { name: /^Ver imagen a pantalla completa/ })
      .click()
    await expect(page.getByRole('dialog', { name: 'Imagen a pantalla completa' })).toBeVisible()
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState === 'finished'),
    )

    const results = await new AxeBuilder({ page })
      .include('dialog')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(
      results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
    ).toEqual([])
  })

  test('pasa axe (WCAG 2.2 AA) en todos los temas y modos', async ({ page }) => {
    await page.goto('/sistema')
    // El contraste se mide en reposo: durante la entrada escalonada de la cabecera
    // (opacity de 0 a 1, DESIGN.md, Motion) el texto aún no tiene su color final.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState === 'finished'),
    )

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(
      results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
    ).toEqual([])
  })
})

// DESIGN.md, Imagery: srcset y sizes eligen el ancho que necesita la pantalla; el visor
// abre siempre el archivo más ancho.
test.describe('catálogo /sistema en un móvil', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })

  test('la captura carga su ancho de 480 y el visor abre el más ancho', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    const figure = page.locator('[data-component="image"]')
    const image = figure.locator('figure img')
    await image.scrollIntoViewIfNeeded()
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
      .toMatch(/\/seis-pies-hupe-esse-480\.avif$/)

    await figure.getByRole('link', { name: /^Ver imagen a pantalla completa/ }).click()
    const viewer = page.getByRole('dialog', { name: 'Imagen a pantalla completa' })
    await expect
      .poll(() => viewer.locator('img').evaluate((img: HTMLImageElement) => img.currentSrc))
      .toMatch(/\/seis-pies-hupe-esse\.avif$/)
  })
})
