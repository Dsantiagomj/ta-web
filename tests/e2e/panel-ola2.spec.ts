import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { docId, logInPanel, releaseLocks, restorePublished, WCAG } from './panel-helpers.ts'
import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { draftGuide } from './seed/guides.ts'

// El panel para Torre, ola 2 (docs/research/backlog.md, A-13 a A-22), con la segunda cuenta
// del panel de la base de pruebas.

test.describe('el panel para Torre, ola 2', () => {
  // Una sola sesión para todo el bloque, en serie: cada inicio de sesión reescribe las
  // sesiones de la cuenta.
  test.describe.configure({ mode: 'serial' })
  let page: Page
  let userId: number

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage()
    userId = await logInPanel(page)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test.afterEach(async () => {
    await releaseLocks(page, userId)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  const publishStatus = () => page.locator('.ta-publish')
  const statusLine = () => page.locator('.ta-publish__text')

  /** Abre la vista previa en vivo; un clic antes de que el panel se monte se pierde. */
  async function openLivePreview() {
    await expect(async () => {
      if (!(await page.locator('.live-preview-toggler--active').isVisible())) {
        await page.locator('.live-preview-toggler').click()
      }
      await expect(page.locator('.live-preview-toolbar-controls')).toBeVisible({ timeout: 1500 })
    }).toPass()
  }

  test('A-16: la barra lateral dice en una línea si la página se ve', async () => {
    // Ni este logro ni la checklist de abajo los abre otra spec: Payload bloquea lo abierto.
    const live = await docId(page, 'achievement-pages', seedAchievement.previous.slug)
    await page.goto(`/admin/collections/achievement-pages/${live}`)
    await expect(statusLine()).toHaveText('En la web: visible')

    const preparing = await docId(page, 'achievement-pages', seedAchievement.next.slug)
    await page.goto(`/admin/collections/achievement-pages/${preparing}`)
    await expect(statusLine()).toHaveText('En la web: sale apagado, sin página')

    const draft = await docId(page, 'quest-guides', draftGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${draft}`)
    await expect(statusLine()).toHaveText('No se ve en la web: es un borrador')
  })

  test('A-16: avisa de lo no guardado y, tras guardar el borrador, de lo no publicado', async () => {
    // Jyfus está publicada «En preparación»; la prueba la deja como estaba al acabar.
    const id = await docId(page, 'dofus-guides', seedDofus.jyfus.slug)
    try {
      await page.goto(`/admin/collections/dofus-guides/${id}`)
      await expect(statusLine()).toHaveText('En la web: el huevo sale apagado, sin página')
      await expect(publishStatus()).not.toContainText('Tienes cambios sin publicar')

      await page.locator('#field-aliases').fill('jyfus prueba')
      await expect(publishStatus()).toContainText('Lo que acabas de cambiar aún no está guardado.')

      await page.getByRole('button', { name: 'Guardar borrador' }).click()
      // Lo que se ve sigue siendo lo publicado; el borrador solo se menciona.
      await expect(publishStatus()).toContainText(
        'Tienes cambios sin publicar: la web sigue enseñando la versión publicada.',
      )
      await expect(statusLine()).toHaveText('En la web: el huevo sale apagado, sin página')
      await expect(publishStatus()).not.toContainText('aún no está guardado')
    } finally {
      await restorePublished(page, 'dofus-guides', id)
    }
  })

  test('A-20: la vista previa tiene móvil, tableta y escritorio', async () => {
    const id = await docId(page, 'dofus-guides', seedDofus.ocre.slug)
    await page.goto(`/admin/collections/dofus-guides/${id}`)
    await openLivePreview()
    await page.locator('.live-preview-toolbar-controls .popup-button').first().click()
    // La lista sale en un portal, fuera de la barra de la vista previa.
    for (const size of ['Móvil', 'Tableta', 'Escritorio']) {
      await expect(page.getByRole('button', { name: size, exact: true })).toBeVisible()
    }
  })

  test('A-20: la vista previa de una checklist abre su página', async () => {
    const { slug } = seedChecklists.hielos
    const id = await docId(page, 'checklists', slug)
    await page.goto(`/admin/collections/checklists/${id}`)
    await openLivePreview()
    await expect(page.locator('.iframe-loader__iframe')).toHaveAttribute(
      'src',
      new RegExp(`/vista-previa\\?slug=${slug}$`),
    )
  })

  test('A-13: el panel de control dice qué hay pendiente, con atajos para crear', async () => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Pendiente' })).toBeVisible()
    // La cuadrícula de colecciones de Payload ya no está: las colecciones van en el menú.
    await expect(page.locator('.dashboard__card-list')).toHaveCount(0)

    const drafts = page.getByRole('region', { name: /Borradores sin publicar/ })
    await expect(drafts.getByRole('link', { name: draftGuide.title })).toBeVisible()
    await expect(drafts.getByText('Nunca publicada').first()).toBeVisible()

    const preparing = page.getByRole('region', { name: 'En preparación' })
    await expect(
      preparing.getByRole('link', { name: seedDofus.jyfus.name, exact: true }),
    ).toBeVisible()

    const dofus = page.getByRole('region', { name: /Guías de Dofus sin checklist/ })
    await expect(dofus.getByRole('link', { name: seedDofus.jyfus.name, exact: true })).toBeVisible()

    await expect(page.getByRole('region', { name: 'Cambios recientes' })).toBeVisible()

    await page.getByRole('link', { name: 'Nueva guía de misión' }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/quest-guides\/create$/)
  })

  test('A-13: el panel de control pasa axe', async () => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Pendiente' })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })

  test('A-14: la guía del panel se abre desde el menú y desde «Pendiente»', async () => {
    await page.goto('/admin')
    await page.getByRole('link', { name: 'Lee la guía del panel' }).click()
    await expect(page).toHaveURL(/\/admin\/guia$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Guía del panel' })).toBeVisible()
    // Lleva la plantilla del panel: el menú sigue ahí, con su enlace a la guía.
    await expect(page.locator('nav').getByRole('link', { name: 'Guía del panel' })).toBeVisible()

    await page.getByRole('link', { name: 'Versiones: tu botón de deshacer' }).click()
    await expect(page).toHaveURL(/#versiones$/)
    await expect(page.getByText('Restaurar esta versión', { exact: false })).toBeVisible()

    const parts = page.locator('.ta-guide__parts')
    await expect(parts.getByRole('link', { name: 'Guías de misiones' })).toBeVisible()
  })

  test('A-14: cada lista empieza con la línea que dice qué guarda', async () => {
    await page.goto('/admin/collections/dofus-guides')
    await expect(page.getByText('Una guía por Dofus: lo que pide')).toBeVisible()
  })

  test('A-14: la guía del panel pasa axe', async () => {
    await page.goto('/admin/guia')
    await expect(page.getByRole('heading', { level: 1, name: 'Guía del panel' })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })
})

test('A-14: la guía del panel pide iniciar sesión', async ({ page }) => {
  await page.goto('/admin/guia')
  await expect(page).toHaveURL(/\/admin\/login/)
})
