import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'
import { seedDofus as dofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'

// Las guías de Dofus (DESIGN.md, Dofus guides index y Dofus guide page), sobre las que siembra
// scripts/seed-e2e.ts: el Dofus Ocre completo, el Dofawa sin logros y el Jyfus En preparación.
// Todo lo que se ve sale de la colección dofus-guides y de su índice.

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

  test('sin JavaScript se ven todas las tarjetas y no sale el buscador', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/guias-dofus')
    await expect(page.locator('[data-dofus-grid] > li')).toHaveCount(3)
    await expect(page.locator('.dg-tools')).toBeHidden()
    await context.close()
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

  test('las migas, la cabecera con el huevo y Prerrequisitos, la checklist y la intro', async ({
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
    await expect(header.getByRole('heading', { name: 'Prerrequisitos' })).toBeVisible()
    await expect(header.getByText(dofus.ocre.prerequisite)).toBeVisible()
    await expect(
      page.getByRole('link', { name: new RegExp(dofus.ocre.checklist.name) }),
    ).toHaveAttribute('href', dofus.ocre.checklist.url)
    await expect(page.getByText(dofus.ocre.intro)).toBeVisible()
  })

  test('Necesitarás: el objeto copia su nombre para buscarlo en el juego', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    await expect(needs.getByText(dofus.ocre.needsNote)).toBeVisible()
    await needs.getByRole('button', { name: `Copiar ${dofus.ocre.needsItem.name}` }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      dofus.ocre.needsItem.name,
    )
  })

  test('el logro trae las misiones de su página de logro; la suelta lleva la nota de Torre', async ({
    page,
  }) => {
    await page.goto(url)
    const parts = page.getByRole('region', { name: 'El logro' })
    await expect(parts.getByRole('link', { name: logro.name })).toHaveAttribute(
      'href',
      `/${logro.slug}`,
    )
    // La lista del logro: la primera; la de las misiones sueltas va después.
    const achievementQuests = parts.getByRole('list').first()
    for (const quest of logro.quests) {
      await expect(achievementQuests.getByText(quest.title, { exact: true })).toBeVisible()
      if (quest.href) {
        await expect(achievementQuests.getByRole('link', { name: quest.title })).toHaveAttribute(
          'href',
          quest.href,
        )
      }
    }
    await expect(parts.getByRole('heading', { name: dofus.ocre.looseTitle })).toBeVisible()
    await expect(parts.getByText(dofus.ocre.looseNote)).toBeVisible()
    await expect(parts.getByRole('link', { name: seedGuide.title }).first()).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
  })

  test('una sola columna, sin lista lateral, con el Dofus anterior', async ({ page }) => {
    await page.goto(url)
    await expect(page.getByRole('complementary')).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Guías de Dofus' })
    await expect(nav.getByRole('link', { name: /Dofus anterior/ })).toHaveAttribute(
      'href',
      `/${dofus.dofawa.slug}`,
    )
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
