import { expect, test, type Page } from '@playwright/test'

import { MODES, THEMES, type Mode, type Theme } from '../../src/lib/theme/theme.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// El ambiente del sitio (DESIGN.md, Ambience): partículas que suben hacia la cabecera en lo
// alto de cada página, con el aspecto del tema y el modo. Solo CSS: decoración oculta a los
// lectores de pantalla, que no se pulsa, va detrás del contenido y no mueve nada.

const guide = `/${seedGuide.slug}`

/** Lo que mueve cada tema y modo: la animación de sus partículas. */
const LOOK: Record<Theme, Record<Mode, string>> = {
  arcano: { dark: 'amb-rise', light: 'amb-rise' },
  amakna: { dark: 'amb-rise', light: 'amb-fall' },
  bonta: { dark: 'amb-drift', light: 'amb-drift' },
  brakmar: { dark: 'amb-ember', light: 'amb-ember' },
  ocre: { dark: 'amb-spark', light: 'amb-spark' },
}

const site = (page: Page) => page.locator('body > .amb')

/** Cambia el tema y el modo de <html>, como haría el servidor para un miembro con el derecho. */
const paint = (page: Page, theme: Theme, mode: Mode) =>
  page.evaluate(
    ([theme, mode]) => {
      document.documentElement.dataset.theme = theme
      document.documentElement.dataset.mode = mode
    },
    [theme, mode] as const,
  )

/** Cómo se ve la primera partícula: su animación y su fondo. */
const look = (page: Page, selector = 'body > .amb i') =>
  page
    .locator(selector)
    .first()
    .evaluate((node) => {
      const style = getComputedStyle(node)
      return { animation: style.animationName, background: style.backgroundImage }
    })

test.describe('el ambiente', () => {
  test('es decoración: oculta, detrás del contenido, sin clics, arriba de la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const layer = site(page)
    await expect(layer).toHaveCount(1)
    await expect(layer).toHaveAttribute('aria-hidden', 'true')
    await expect(layer).toHaveCSS('position', 'absolute')
    await expect(layer).toHaveCSS('z-index', '-1')
    await expect(layer).toHaveCSS('pointer-events', 'none')
    await expect(layer).toHaveCSS('overflow', 'hidden')
    await expect(layer.locator('i')).toHaveCount(14)

    const box = await layer.boundingBox()
    expect(box?.y).toBe(0)
    expect(box?.width).toBe(1440)
    expect(box?.height).toBeLessThanOrEqual(900)

    // El texto de la página queda delante: en el centro de un titular manda el titular.
    const heading = page.getByRole('heading', { level: 1 })
    const front = await heading.evaluate((node) => {
      const r = node.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return hit !== null && node.contains(hit)
    })
    expect(front).toBe(true)
  })

  for (const theme of THEMES) {
    for (const mode of MODES) {
      test(`${theme} ${mode}: partículas con el aspecto del tema`, async ({ page }) => {
        await page.goto(guide)
        await paint(page, theme, mode)
        await expect(site(page)).toBeVisible()
        const { animation, background } = await look(page)
        expect(animation).toBe(LOOK[theme][mode])
        expect(background).not.toBe('none')
      })
    }
  }

  test('cada tema y modo tiene su propio aspecto', async ({ page }) => {
    await page.goto(guide)
    const seen = new Set<string>()
    for (const theme of THEMES) {
      for (const mode of MODES) {
        await paint(page, theme, mode)
        seen.add(JSON.stringify(await look(page)))
      }
    }
    expect(seen.size).toBe(THEMES.length * MODES.length)
  })

  test('las luciérnagas suben hacia la cabecera; las hojas de Amakna claro caen', async ({
    page,
  }) => {
    await page.goto(guide)
    // Dónde nace la primera partícula, sin contar su animación (offsetTop no ve transform),
    // en fracción de la altura de la capa: abajo si sube, arriba si cae.
    const from = () =>
      page
        .locator('body > .amb i')
        .first()
        .evaluate((node) => (node as HTMLElement).offsetTop / node.parentElement!.clientHeight)
    await paint(page, 'arcano', 'dark')
    expect(await from()).toBeGreaterThan(0.9)
    await paint(page, 'amakna', 'light')
    expect(await from()).toBeLessThan(0.1)
  })

  test('en el móvil solo van la mitad', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(guide)
    const shown = await site(page)
      .locator('i')
      .evaluateAll((nodes) => nodes.filter((n) => getComputedStyle(n).display !== 'none').length)
    expect(shown).toBe(7)
  })

  test('con movimiento reducido no hay partículas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const path of ['/', guide, `/${seedChecklists.hielos.slug}`]) {
      await page.goto(path)
      const layers = page.locator('.amb')
      expect(await layers.count()).toBeGreaterThan(0)
      for (const layer of await layers.all()) await expect(layer).toBeHidden()
    }
  })

  test('no mueve nada: ningún desplazamiento de diseño viene de él y no ensancha la página', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as Window & { ambienceShifts?: number }
      w.ambienceShifts = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          sources?: { node?: Node | null }[]
        })[]) {
          for (const source of entry.sources ?? []) {
            const node = source.node
            const el = node instanceof Element ? node : node?.parentElement
            if (el?.closest('.amb')) w.ambienceShifts! += 1
          }
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(guide)
      // Que pasen varias partículas.
      await page.waitForTimeout(3000)
      const result = await page.evaluate(() => {
        const w = window as Window & { ambienceShifts?: number }
        const doc = document.documentElement
        return {
          shifts: w.ambienceShifts,
          wide: doc.scrollWidth > doc.clientWidth,
        }
      })
      expect(result.shifts, `a ${width}px`).toBe(0)
      expect(result.wide, `a ${width}px`).toBe(false)
    }
  })

  test('el Hielos nieva en vez del ambiente del tema', async ({ page }) => {
    await page.goto(`/${seedChecklists.hielos.slug}`)
    await expect(site(page)).toBeHidden()
    const own = page.locator('.amb[data-fx="snow"]')
    await expect(own).toBeVisible()
    await expect(own).toHaveAttribute('aria-hidden', 'true')
    expect((await look(page, '.amb[data-fx="snow"] i')).animation).toBe('amb-snow')
    // La nieve cae en los dos modos.
    await paint(page, 'arcano', 'light')
    expect((await look(page, '.amb[data-fx="snow"] i')).animation).toBe('amb-snow')
  })

  test('el Nebuloso lleva motas del color de su Dofus', async ({ page }) => {
    await page.goto(`/${seedChecklists.nebuloso.slug}`)
    await expect(site(page)).toBeHidden()
    const own = page.locator('.amb[data-fx="egg"]')
    await expect(own).toBeVisible()
    const { animation, background } = await look(page, '.amb[data-fx="egg"] i')
    expect(animation).toBe('amb-rise')
    const egg = await own.evaluate((node) => {
      const probe = document.createElement('span')
      probe.style.color = getComputedStyle(node).getPropertyValue('--egg').trim()
      node.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    })
    expect(egg).toMatch(/^rgb/)
    expect(background).toContain(egg)
  })
})
