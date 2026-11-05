import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator } from '@playwright/test'

import { MODES, THEMES } from '../../src/lib/theme/theme.ts'

// El catálogo de componentes (DESIGN.md, Component catalog). En producción da 404; el
// servidor de estas pruebas lo abre con E2E_DESIGN_CATALOG=1 (playwright.config.ts).

const COMPONENTS = [
  'buttons',
  'chips',
  'callouts',
  'figures',
  'checkbox',
  'cards',
  'medallion',
  'hero',
  'ribbon',
  'items',
  'fight',
  'coordinates',
  'stages',
  'botin',
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
      const card = section.locator('.stage__card').first()
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

  test('el objetivo de un chip de coordenadas mide al menos 40px de alto', async ({ page }) => {
    await page.goto('/sistema?tema=arcano&modo=dark')
    // El chip dibujado mide 26px; el ::after transparente agranda el área que se pulsa.
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
