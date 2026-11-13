import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'

// La página de una checklist (prototipo A), sobre el Nebuloso que siembra scripts/seed-e2e.ts:
// tres pasos con un logro, un «detente aquí» y un «aquí se resuelve». El progreso llega en el
// PR 5: aquí no se marca nada.

const neb = seedChecklists.nebuloso
const url = `/${neb.slug}`

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

const step = (page: Page, n: number) => page.locator(`#paso-${n}`)

// El paso abierto entra con un fundido: axe mide el contraste cuando ya ha terminado.
const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

test.describe('página de una checklist', () => {
  test('las migas, la cabecera con el huevo y la lista de pasos con el primero abierto', async ({
    page,
  }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(new RegExp(neb.title))
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: neb.guide.name })).toHaveAttribute(
      'href',
      `/${neb.guide.slug}`,
    )
    await expect(page.getByRole('heading', { level: 1, name: neb.title })).toBeVisible()
    await expect(page.getByText(neb.description)).toBeVisible()
    await expect(page.locator('.ck-egg img')).toBeVisible()

    const rows = page.getByRole('list', { name: 'Pasos' }).getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.first()).toContainText(seedAchievement.name)
    await expect(step(page, 1)).toBeVisible()
    await expect(step(page, 2)).toBeHidden()
  })

  test('el texto de Torre tal cual, con el logro enlazado, y la misión con su guía y su nivel', async ({
    page,
  }) => {
    await page.goto(url)
    const first = step(page, 1)
    await expect(first.locator('.ck-text')).toHaveText(neb.steps.first)
    await expect(
      first.locator('.ck-text').getByRole('link', { name: seedAchievement.name }),
    ).toHaveAttribute('href', `/${seedAchievement.slug}`)
    const quest = first.locator('.ck-q').first()
    await expect(quest.getByRole('link', { name: seedGuide.title })).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
    await expect(quest).toContainText(`Niv. ${seedGuide.level}`)
  })

  test('Necesitarás: los objetos copian su nombre; «Kama» y «Captura de almas» son texto', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(url)
    const needs = step(page, 1).getByRole('region', { name: 'Necesitarás' })
    await expect(needs.getByRole('heading', { name: 'Recursos' })).toBeVisible()
    await expect(needs.getByText(neb.labels.kama, { exact: true })).toBeVisible()
    await expect(needs.getByText(neb.labels.spell, { exact: true })).toBeVisible()
    await expect(needs.getByText(neb.labels.spellNote)).toBeVisible()
    await expect(needs.getByRole('button', { name: `Copiar ${neb.labels.kama}` })).toHaveCount(0)
    const item = seedDofus.ocre.needsItems[0]!.name
    await needs.getByRole('button', { name: `Copiar ${item}` }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(item)
  })

  test('el paso que para: su rojo, los objetivos de la misión con la línea y las coordenadas que llegan después', async ({
    page,
  }) => {
    await page.goto(url)
    await page.getByRole('list', { name: 'Pasos' }).getByRole('link', { name: /^2/ }).click()
    const second = step(page, 2)
    await expect(second).toBeVisible()
    await expect(page).toHaveURL(/#paso-2$/)
    await expect(second.locator('mark.hl--stop')).toHaveText(neb.steps.stop)
    await expect(second.getByText('Hasta dónde llegar')).toBeVisible()
    await expect(second.getByText('se cierra en el 3')).toBeVisible()

    const route = second.locator('.ck-route > li')
    const { objectives, stopObjective } = neb.stopQuest
    await expect(route).toHaveCount(objectives.length + 1)
    await expect(route.nth(stopObjective)).toHaveClass(/ck-line--stop/)
    await expect(route.nth(stopObjective)).toHaveText(neb.steps.stop)
    await expect(route.nth(stopObjective + 1)).toContainText('Muestra de sangre')

    // Los detalles: quién la da y las coordenadas, como chips que copian /travel.
    const quest = second.locator('.ck-q').first()
    await expect(quest.locator('[data-ck-npc]')).toHaveText(neb.stopQuest.npc)
    await expect(
      quest.getByRole('button', { name: /\[-8,-4\], copiar \/travel -8,-4/ }),
    ).toBeVisible()
  })

  test('el paso que resuelve: su verde y a qué paso lleva', async ({ page }) => {
    await page.goto(`${url}#paso-3`)
    const third = step(page, 3)
    await expect(third).toBeVisible()
    await expect(third.locator('mark.hl--resolve')).toHaveText(neb.steps.resolve)
    await third.getByRole('link', { name: 'cierra el 2' }).click()
    await expect(step(page, 2)).toBeVisible()
    await expect(third).toBeHidden()
  })

  test('Objetos suma lo que piden los pasos y deja fuera lo que no cuenta', async ({ page }) => {
    await page.goto(url)
    await page.getByRole('tab', { name: /Objetos/ }).click()
    const panel = page.getByRole('tabpanel', { name: /Objetos/ })
    await expect(panel).toBeVisible()
    const pico = panel.locator('.ck-slot', { hasText: seedDofus.ocre.needsItems[0]!.name })
    await expect(pico).toContainText('5')
    await expect(pico).toContainText('Pasos 1 y 3')
    await expect(panel.getByText(neb.labels.kama, { exact: true })).toBeVisible()
    await expect(panel.getByText(neb.labels.spell, { exact: true })).toHaveCount(0)
    await expect(panel.getByRole('heading', { name: 'Almas' })).toBeVisible()
  })

  test('Prerrequisitos: la introducción y los grupos de Torre', async ({ page }) => {
    await page.goto(url)
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    const panel = page.getByRole('tabpanel', { name: /Prerrequisitos/ })
    await expect(panel.getByText(neb.intro)).toBeVisible()
    for (const group of neb.prerequisites) {
      await expect(panel.getByRole('heading', { name: group.title })).toBeVisible()
      await expect(panel.getByText(group.rows[0]!.text)).toBeVisible()
    }
    await expect(page.getByRole('searchbox')).toBeHidden()
  })

  test('el buscador deja los pasos que tienen lo escrito, o el número', async ({ page }) => {
    await page.goto(url)
    const search = page.getByRole('searchbox', { name: 'Buscar un paso por número o texto' })
    const rows = page.locator('.ck-row:not([hidden])')
    await search.fill('rey')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toHaveAttribute('data-n', '3')
    await search.fill('2')
    await expect(rows).toHaveCount(1)
    await search.fill('nada parecido')
    await expect(rows).toHaveCount(0)
    await expect(page.getByText('Ningún paso tiene «nada parecido».')).toBeVisible()
  })

  test('en el móvil el paso se abre en una hoja y al cerrarla vuelve a la lista', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    await expect(step(page, 1)).toBeHidden()
    const row = page.getByRole('list', { name: 'Pasos' }).getByRole('link', { name: /^2/ })
    await row.click()
    const sheet = page.getByRole('dialog', { name: 'Paso 2' })
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('mark.hl--stop')).toHaveText(neb.steps.stop)
    await settled(page)
    expect(await axe(page)).toEqual([])
    await sheet.getByRole('button', { name: 'Cerrar el paso' }).click()
    await expect(sheet).toBeHidden()
    await expect(row).toBeFocused()
  })

  test('un enlace a una pestaña la abre, también en el escritorio, y no cambia la dirección', async ({
    page,
  }) => {
    await page.goto(`${url}#ck-p-obj`)
    await expect(page.getByRole('tab', { name: /Objetos/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByRole('tabpanel', { name: /Objetos/ })).toBeVisible()
    await expect(page).toHaveURL(/#ck-p-obj$/)
    await page.getByRole('tab', { name: 'Diario' }).click()
    await expect(step(page, 1)).toBeVisible()
  })

  test('en el móvil, un toque dentro de la hoja no la cierra; uno fuera, sí', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    await page.getByRole('list', { name: 'Pasos' }).getByRole('link', { name: /^2/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Paso 2' })
    await expect(sheet).toBeVisible()
    await settled(page)
    // La esquina de arriba de la hoja, al lado del asa: el clic cae en el propio <dialog>.
    // Al cerrarse sigue pintada un momento (su transición): se mira el atributo open.
    const dialog = page.locator('[data-ck-sheet]')
    await sheet.click({ position: { x: 8, y: 8 } })
    await page.waitForTimeout(300)
    await expect(dialog).toHaveAttribute('open', '')
    // Encima de la hoja, en el fondo.
    await page.mouse.click(195, 20)
    await expect(dialog).not.toHaveAttribute('open')
  })

  test('en el móvil, las flechas recorren la lista y Intro abre el paso', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const links = page.getByRole('list', { name: 'Pasos' }).getByRole('link')
    await links.first().focus()
    await page.keyboard.press('ArrowDown')
    await expect(links.nth(1)).toBeFocused()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Paso 2' })).toBeVisible()
  })

  test('sin JavaScript se ven todos los pasos y las tres partes, y no sale el buscador', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(url)
    for (const n of [1, 2, 3]) await expect(step(page, n)).toBeVisible()
    await expect(page.locator('#ck-p-pre')).toBeVisible()
    await expect(page.locator('#ck-p-obj')).toBeVisible()
    await expect(page.locator('.ck-find')).toBeHidden()
    await context.close()
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(`${url}#paso-2`)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(step(page, 2).locator('.coord').first()).toBeVisible()
      await settled(page)
      expect(await axe(page)).toEqual([])
      await page.getByRole('tab', { name: /Objetos/ }).click()
      await settled(page)
      expect(await axe(page)).toEqual([])
    })
  }
})

test.describe('API de detalles de una checklist', () => {
  test('JSON público que el navegador guarda cinco minutos', async ({ request }) => {
    const response = await request.get(`/api/checklists/${neb.slug}/details`)
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toMatch(/^public, max-age=300\b/)
    const body = await response.json()
    expect(body.q[neb.stopQuest.dofusId][0]).toBe(neb.stopQuest.npc)
    expect(body.q[neb.stopQuest.dofusId][3]).toHaveLength(neb.stopQuest.objectives.length)
  })

  test('404 para una checklist que no existe', async ({ request }) => {
    const response = await request.get('/api/checklists/no-existe/details')
    expect(response.status()).toBe(404)
  })
})

test('una checklist En preparación lleva a la de Squarespace', async ({ request }) => {
  const { silvestre } = seedChecklists
  const response = await request.get(`/${silvestre.slug}`, { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toBe(silvestre.legacyHref)
})
