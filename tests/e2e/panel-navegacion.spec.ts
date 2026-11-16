import { expect, test } from '@playwright/test'

import { navigationDefaults } from '../../src/lib/site-copy/defaults.ts'
import { logInPanel, releaseLocks } from './panel-helpers.ts'
import { E2E_PANEL_USER_2 } from './seed/guides.ts'

// «Navegación», en «Ajustes»: Torre cambia la frase de una sección en el panel y el menú del
// móvil la enseña en la siguiente visita, sin esperar a la caché. Va con la frase de Dofus,
// que ninguna otra prueba mira, porque el resto de archivos corre a la vez, y deja el menú de
// siempre al acabar.

let userId: number

test.beforeEach(async ({ page }) => {
  userId = await logInPanel(page, E2E_PANEL_USER_2)
})

test.afterEach(async ({ page }) => {
  await releaseLocks(page, userId)
})

test('la frase de Dofus del menú del móvil se cambia en «Navegación»', async ({ page }) => {
  const text = 'Todos los huevos, paso a paso.'
  try {
    await page.goto('/admin/globals/navigation')
    const settings = page.locator('nav .nav-group').last()
    await expect(settings.getByText('Navegación', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir todo' }).click()
    const field = page.locator('#field-sections__1__description')
    await expect(field).toHaveValue(navigationDefaults.sections[1]!.description)
    await field.fill(text)
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.locator('.payload-toast-container')).toContainText('Se actualizó con éxito.')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator('[data-open-sheet]').click()
    await expect(page.locator('#site-sheet .stile__d').filter({ hasText: text })).toBeVisible()
  } finally {
    const restored = await page.request.post('/api/globals/navigation', {
      data: { sections: navigationDefaults.sections, featuredDofus: [] },
    })
    expect(restored.ok()).toBe(true)
  }
})
