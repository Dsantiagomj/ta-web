import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'

// El índice de metalogros (DESIGN.md, Metalogros index), sobre los metalogros que siembra
// scripts/seed-e2e.ts: Astrub, publicado, y Misiones de templo, sin nada publicado.

const url = '/metalogros'

/** «#45cdb9» como lo da getComputedStyle: «rgb(69, 205, 185)». */
const hexToRgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(', ')})`

test.describe('índice de metalogros', () => {
  test('una ficha abre los logros de su zona en un panel, y el ancla la sigue', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Todos los metalogros' }),
    ).toBeVisible()
    const tile = page.locator('button.vd-tile[data-zone="astrub"]')
    await expect(tile).toHaveAttribute('aria-expanded', 'false')
    await tile.click()
    await expect(tile).toHaveAttribute('aria-expanded', 'true')
    await expect(page).toHaveURL(/#astrub$/)
    const panel = page.getByRole('region', { name: logro.group.name })
    await expect(panel.getByRole('link', { name: new RegExp(logro.name) })).toHaveAttribute(
      'href',
      `/${logro.slug}`,
    )
    // En preparación: se lista sin enlace.
    await expect(panel.locator('[aria-disabled="true"]')).toContainText(logro.next.name)
    await expect(panel.getByRole('link', { name: new RegExp(logro.next.name) })).toHaveCount(0)
    // Esc lo cierra y devuelve el foco a la ficha.
    await panel.getByRole('link').first().focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(tile).toBeFocused()
  })

  test('el panel abierto es plano como las fichas: 2px de borde y 8px de radio', async ({
    page,
  }) => {
    await page.goto(url)
    await page.locator('button.vd-tile[data-zone="astrub"]').click()
    const panel = page.locator('.vd-panel:not([hidden])')
    await expect(panel).toBeVisible()
    const look = await panel.evaluate((node) => {
      const s = getComputedStyle(node)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      return { width: s.borderTopWidth, radius: parseFloat(s.borderTopLeftRadius) / rem }
    })
    expect(look.width).toBe('2px')
    expect(look.radius).toBeCloseTo(0.5)
  })

  test('cinco fichas por fila a 1024px y seis a 1440px', async ({ page }) => {
    for (const [width, columns] of [
      [1024, 5],
      [1440, 6],
    ] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      const tracks = await page
        .locator('.vd-grid')
        .first()
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
      expect(tracks, `${width}px`).toBe(columns)
    }
  })

  test('el icono de una ficha sin personaje cabe dentro de su rombo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const wells = page.locator('.zart--icon .well')
    test.skip((await wells.count()) === 0, 'Ninguna ficha sembrada lleva solo el icono')
    const [well, icon] = await wells
      .first()
      .evaluate((node) => [
        node.getBoundingClientRect().width,
        node.querySelector('img')!.getBoundingClientRect().width,
      ])
    // El cuadrado inscrito en el rombo (72 % del hueco, girado) mide la mitad del hueco.
    expect(icon).toBeLessThanOrEqual((well * 0.72) / Math.SQRT2 + 0.5)
  })

  test('un metalogro sin nada publicado se ve apagado, sin enlace ni panel', async ({ page }) => {
    await page.goto(url)
    const off = page.locator('.vd-tile[aria-disabled="true"]')
    await expect(off).toContainText(logro.emptyGroup.name)
    await expect(off).toContainText('En preparación')
    await expect(page.getByRole('button', { name: new RegExp(logro.emptyGroup.name) })).toHaveCount(
      0,
    )
  })

  test('el buscador encuentra logros y misiones; lo que está en preparación no se elige', async ({
    page,
  }) => {
    await page.goto(url)
    const input = page.getByRole('combobox', { name: 'Busca una zona, un logro o una misión' })
    await input.fill('biblioteca')
    await expect(page.getByRole('option', { name: new RegExp(logro.next.name) })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await input.fill('seis pies')
    const option = page.getByRole('option', { name: /Seis pies bajo tierra/ })
    await expect(option).toBeVisible()
    await input.press('ArrowDown')
    await input.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/${logro.slug}$`))
  })

  // Las fichas que abren su zona se inclinan como las tarjetas de /guias-dofus (DESIGN.md,
  // Metalogros index), con un brillo de su tono; la apagada no se mueve.
  test.describe('con el ratón', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('la ficha se inclina hacia el puntero, con su brillo, y vuelve al salir', async ({
      page,
    }) => {
      await page.goto(url)
      const tile = page.locator('button.vd-tile[data-zone="astrub"]')
      await expect(tile).toHaveAttribute('data-tilt', '')
      const foil = tile.locator('.vd-tile__foil')
      await expect(foil).toHaveCSS('opacity', '0')
      const box = (await tile.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await expect(tile).toHaveClass(/is-tilted/)
      await expect(tile).toHaveAttribute('style', /perspective\(800px\) rotateY\(\d/)
      await expect(foil).toHaveCSS('opacity', '1')
      await page.mouse.move(0, 0)
      await expect(tile).not.toHaveClass(/is-tilted/)
      await expect(foil).toHaveCSS('opacity', '0')
      // Abrirla con un clic sigue funcionando.
      await tile.click()
      await expect(tile).toHaveAttribute('aria-expanded', 'true')
    })

    test('la apagada no se inclina ni lleva brillo; con movimiento reducido, ninguna', async ({
      page,
    }) => {
      await page.goto(url)
      const off = page.locator('.vd-tile--off')
      await expect(off).not.toHaveAttribute('data-tilt')
      await expect(off.locator('.vd-tile__foil')).toHaveCount(0)
      const offBox = (await off.boundingBox())!
      await page.mouse.move(offBox.x + offBox.width * 0.9, offBox.y + offBox.height * 0.1)
      await page.mouse.move(offBox.x + offBox.width * 0.8, offBox.y + offBox.height * 0.2)
      await expect(off).not.toHaveClass(/is-tilted/)

      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.reload()
      const tile = page.locator('button.vd-tile[data-zone="astrub"]')
      const box = (await tile.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(tile).not.toHaveClass(/is-tilted/)
      await expect(tile).toHaveCSS('transform', 'none')
    })
  })

  test('cada ficha lleva su tono en el borde, y la apagada un borde de trazos', async ({
    page,
  }) => {
    await page.goto(url)
    const tile = page.locator('button.vd-tile[data-zone="astrub"]')
    await expect(tile).toHaveCSS('border-top-width', '2px')
    await expect(tile).toHaveCSS('border-top-style', 'solid')
    const hue = await tile.evaluate((el) => getComputedStyle(el).getPropertyValue('--v').trim())
    expect(hue).toMatch(/^#[0-9a-f]{6}$/)
    await expect(tile).toHaveCSS('border-top-color', hexToRgb(hue))
    await expect(page.locator('.vd-tile--off')).toHaveCSS('border-top-style', 'dashed')
  })

  test('el ancla abre su zona al llegar', async ({ page }) => {
    await page.goto(`${url}#astrub`)
    await expect(page.getByRole('region', { name: logro.group.name })).toBeVisible()
  })

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('las fichas enlazan a la lista de cada zona, debajo', async ({ page }) => {
      await page.goto(url)
      await expect(page.getByRole('link', { name: new RegExp(logro.group.name) })).toHaveAttribute(
        'href',
        '#astrub',
      )
      await expect(
        page.locator('#astrub').getByRole('link', { name: new RegExp(logro.name) }),
      ).toBeVisible()
      await expect(page.getByRole('combobox')).toBeHidden()
    })
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}, con un panel abierto`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(`${url}#astrub`)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.getByRole('region', { name: logro.group.name })).toBeVisible()
      // Que el panel acabe de entrar: a media animación axe mide el botón de cerrar más
      // pequeño o tapado y da target-size en .vd-close. Sin los bucles del ambiente.
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .every((a) => a.playState !== 'running'),
      )
      // Y que la página haya llegado al panel: el ancla lo trae con un desplazamiento suave
      // (scroll-behavior: smooth), que no es una animación de getAnimations(). A medio camino,
      // la cabecera fija tapa parte de .vd-close.
      await page.waitForFunction(
        () =>
          new Promise<boolean>((resolve) => {
            let last = scrollY
            let still = 0
            const frame = () => {
              still = scrollY === last ? still + 1 : 0
              last = scrollY
              if (still >= 3) resolve(true)
              else requestAnimationFrame(frame)
            }
            requestAnimationFrame(frame)
          }),
      )
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
