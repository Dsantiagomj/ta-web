import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedCards } from './seed/checklist-cards.ts'
import { indexChecklists as cl } from './seed/checklists-index.ts'
import { seedGuide } from './seed/guides.ts'

// El índice /checklists y las checklists del menú, sobre las que siembra scripts/seed-e2e.ts
// (tests/e2e/seed/checklists-index.ts): todo sale de la colección checklists.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function axe(page: Page, selector?: string) {
  const builder = new AxeBuilder({ page }).withTags(WCAG)
  const results = await (selector ? builder.include(selector) : builder).analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

/**
 * Sigue un enlace a una checklist Publicada y comprueba que su página responde 200 y es la
 * suya (su h1).
 */
async function followToChecklist(page: Page, link: Locator) {
  const href = await link.getAttribute('href')
  expect(href).toBe(`/${cl.published.slug}`)
  const response = page.waitForResponse(
    (r) => r.request().isNavigationRequest() && new URL(r.url()).pathname === href,
  )
  await link.click()
  expect((await response).status()).toBe(200)
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await expect(page.getByRole('heading', { level: 1, name: cl.published.title })).toBeVisible()
}

/** Espera a la isla de la cabecera: sin ella, los paneles no se abren. */
async function ready(page: Page, url: string) {
  await page.goto(url)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

test.describe('índice de las checklists', () => {
  test('el título y un cartel por checklist publicada, en el orden de Torre (Ocre 2, Nebuloso 3, Jyfus 4), con la «???» al final', async ({
    page,
  }) => {
    const response = await page.goto('/checklists')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Checklists' })).toBeVisible()
    // Ninguna cifra en el título ni en la entradilla.
    await expect(page.locator('.ck-hero')).not.toContainText(/\d/)

    const grid = page.locator('[data-checklist-grid]')
    const names = await grid.locator('.poster__name').allTextContents()
    const order = [cl.legacy.name, cl.published.name, cl.preparing.name].map((name) =>
      names.indexOf(name),
    )
    expect(order.every((i) => i >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    // El borrador no sale; la «???» va la última.
    expect(names).not.toContain(cl.draft.name)
    expect(names.at(-1)).toBe(seedCards.teaser.text)

    // La Publicada abre su página del sitio. Solo el nombre: sin la frase de Torre.
    const published = grid.getByRole('link', { name: new RegExp(cl.published.name) })
    await expect(published).toHaveAttribute('href', `/${cl.published.slug}`)
    await expect(published).not.toContainText(cl.published.description)
    await expect(published).not.toContainText('En preparación')
  })

  test('el cartel lleva la escena y el PNJ de su ficha, con su encuadre, y el huevo de su Dofus', async ({
    page,
  }) => {
    await page.goto('/checklists')
    const poster = page.getByRole('link', { name: new RegExp(cl.published.name) })
    for (const part of ['.poster__art img', '.poster__npc img', '.poster__egg img']) {
      const img = poster.locator(part)
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth))
        .toBeGreaterThan(0)
    }
    const { npcHeight, npcRight, npcTop } = seedCards.npcFit
    await expect(poster.locator('.poster__npc')).toHaveAttribute(
      'style',
      `--npc-h:${npcHeight}%;--npc-r:${npcRight}%;--npc-t:${npcTop}%`,
    )
  })

  test('una Publicada lleva a su página, que responde', async ({ page }) => {
    await page.goto('/checklists')
    await followToChecklist(
      page,
      page
        .locator('[data-checklist-grid]')
        .getByRole('link', { name: new RegExp(cl.published.name) }),
    )
  })

  test('una En preparación con su checklist antigua la enlaza como un cartel más, sin avisos', async ({
    page,
  }) => {
    await page.goto('/checklists')
    const legacy = page.getByRole('link', { name: new RegExp(cl.legacy.name) })
    await expect(legacy).toHaveAttribute('href', cl.legacy.legacyHref)
    await expect(legacy).not.toContainText('En preparación')
    await expect(legacy).not.toContainText('web anterior')
    await expect(legacy.locator('[data-poster-progress]')).toHaveCount(0)
    // El huevo sale de la guía de su Dofus y carga.
    const egg = legacy.locator('.poster__egg img')
    await egg.scrollIntoViewIfNeeded()
    await expect
      .poll(() => egg.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth))
      .toBeGreaterThan(0)
  })

  test('una En preparación sin checklist antigua sale apagada, sin enlace, con su píldora', async ({
    page,
  }) => {
    await page.goto('/checklists')
    const card = page.locator('.poster', { hasText: cl.preparing.name })
    await expect(card).toHaveAttribute('aria-disabled', 'true')
    await expect(card.locator('.poster__badge')).toHaveText('En preparación')
    await expect(page.getByRole('link', { name: new RegExp(cl.preparing.name) })).toHaveCount(0)
  })

  test('la «???» no enlaza ni se inclina, con su etiqueta y su texto del panel', async ({
    page,
  }) => {
    await page.goto('/checklists')
    const soon = page.locator('.poster--soon')
    await expect(soon.locator('.poster__badge')).toHaveText(seedCards.teaser.label)
    await expect(soon.locator('.poster__name')).toHaveText(seedCards.teaser.text)
    await expect(soon.locator('a')).toHaveCount(0)
    await expect(soon).not.toHaveAttribute('data-tilt')
  })

  test.describe('con el ratón', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('el cartel se inclina hacia el puntero y vuelve al salir', async ({ page }) => {
      await page.goto('/checklists')
      const poster = page.getByRole('link', { name: new RegExp(cl.published.name) })
      await poster.scrollIntoViewIfNeeded()
      const box = (await poster.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await expect(poster).toHaveClass(/is-tilted/)
      await expect(poster).toHaveAttribute('style', /rotateY\(\d/)
      await page.mouse.move(0, 0)
      await expect(poster).not.toHaveClass(/is-tilted/)
    })

    test('con movimiento reducido no se inclina', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/checklists')
      const poster = page.getByRole('link', { name: new RegExp(cl.published.name) })
      await poster.scrollIntoViewIfNeeded()
      const box = (await poster.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(poster).not.toHaveClass(/is-tilted/)
    })
  })

  test('el porcentaje del navegador sale en su cartel después de marcar un paso', async ({
    page,
  }) => {
    await page.goto('/checklists')
    const ring = page.locator(`[data-poster-progress="${cl.published.slug}"]`)
    // Sin nada marcado no se enseña nada, ni un 0 %.
    await expect(ring).toBeHidden()

    await page.goto(`/${cl.published.slug}`)
    await page
      .locator('#paso-1 .ck-q', { has: page.locator('.ck-q__t', { hasText: seedGuide.title }) })
      .locator('[data-q-hit]')
      .click()
    const pct = page.locator('[data-ck-pct]').first()
    await expect(pct).not.toHaveText('0 %')
    const expected = (await pct.textContent())!.trim()

    await page.goto('/checklists')
    await expect(ring).toBeVisible()
    await expect(ring).toContainText(expected)
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto('/checklists')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await axe(page)).toEqual([])
    })
  }
})

test.describe('checklists en el menú', () => {
  test.describe('escritorio', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('el panel de Dofus lista las checklists y lleva a su índice', async ({ page }) => {
      await ready(page, '/')
      await page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('button', { name: 'Dofus', exact: true })
        .click()
      const panel = page.locator('#menu-dofus')
      await expect(
        panel.getByRole('link', { name: new RegExp(cl.published.name) }),
      ).toHaveAttribute('href', `/${cl.published.slug}`)
      await expect(panel.getByRole('link', { name: new RegExp(cl.legacy.name) })).toHaveAttribute(
        'href',
        cl.legacy.legacyHref,
      )
      // El lector de pantalla oye que abre la web anterior.
      await expect(
        panel.getByRole('link', {
          name: /Almas del Ocre \(en preparación: se abre en la web anterior\)/,
        }),
      ).toHaveCount(1)
      await expect(panel.locator('.chk__off', { hasText: cl.preparing.name })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      expect(await axe(page, '#menu-dofus')).toEqual([])

      await panel.getByRole('link', { name: 'Ver todas las checklists' }).click()
      await expect(page).toHaveURL(/\/checklists$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Checklists' })).toBeVisible()
    })

    test('una Publicada del panel lleva a su página, que responde', async ({ page }) => {
      await ready(page, '/')
      await page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('button', { name: 'Dofus', exact: true })
        .click()
      await followToChecklist(
        page,
        page.locator('#menu-dofus').getByRole('link', { name: new RegExp(cl.published.name) }),
      )
    })

    test('el pie lleva Checklists al índice del sitio', async ({ page }) => {
      await page.goto('/')
      const explore = page.getByRole('contentinfo').getByRole('navigation', { name: 'Explorar' })
      await expect(explore.getByRole('link', { name: 'Checklists' })).toHaveAttribute(
        'href',
        '/checklists',
      )
    })
  })

  test.describe('móvil', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('el menú del móvil lista las checklists y lleva a su índice', async ({ page }) => {
      await ready(page, '/')
      await page.getByRole('button', { name: 'Menú' }).click()
      const sheet = page.getByRole('dialog', { name: 'Menú' })
      await sheet.getByRole('button', { name: /Dofus y checklists/ }).click()
      await expect(
        sheet.getByRole('link', { name: new RegExp(cl.published.name) }),
      ).toHaveAttribute('href', `/${cl.published.slug}`)
      const all = sheet.getByRole('link', { name: 'Ver todas las checklists' })
      await expect(all).toHaveAttribute('href', '/checklists')
      expect(await axe(page, '#site-sheet')).toEqual([])
    })
  })
})
