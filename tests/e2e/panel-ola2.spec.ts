import { expect, test, type Page } from '@playwright/test'

import { docId, logInPanel, releaseLocks } from './panel-helpers.ts'
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
    await expect(publishStatus()).toContainText('En la web: visible')

    const preparing = await docId(page, 'achievement-pages', seedAchievement.next.slug)
    await page.goto(`/admin/collections/achievement-pages/${preparing}`)
    await expect(publishStatus()).toContainText('No se ve en la web: En preparación')

    const draft = await docId(page, 'quest-guides', draftGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${draft}`)
    await expect(publishStatus()).toContainText('No se ve en la web: es un borrador')
  })

  test('A-16: avisa de lo no guardado y, tras guardar el borrador, de lo no publicado', async () => {
    // Jyfus está «En preparación»: un borrador suyo no cambia nada de lo que se ve.
    const id = await docId(page, 'dofus-guides', seedDofus.jyfus.slug)
    await page.goto(`/admin/collections/dofus-guides/${id}`)
    // Una ejecución anterior pudo dejar un borrador: solo cuenta que no se ve.
    await expect(publishStatus()).not.toContainText('En la web: visible')

    await page.locator('#field-aliases').fill(`jyfus prueba ${Date.now()}`)
    await expect(publishStatus()).toContainText('Lo que acabas de cambiar aún no está guardado.')

    await page.getByRole('button', { name: 'Guardar borrador' }).click()
    await expect(publishStatus()).toContainText('Tienes cambios sin publicar')
    await expect(publishStatus()).not.toContainText('aún no está guardado')
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
})
