import { expect, test } from '@playwright/test'

import { indexTextDefaults, siteSettingsDefaults } from '../../src/lib/site-copy/defaults.ts'
import { logInPanel, releaseLocks } from './panel-helpers.ts'
import { E2E_PANEL_USER_2 } from './seed/guides.ts'

// «Ajustes del sitio» y «Portada e índices», en «Ajustes»: Torre cambia un texto en el panel y
// la web lo enseña en la siguiente visita, sin esperar a la caché. Cada prueba deja el texto
// de siempre al acabar. Van con textos que ninguna otra prueba mira, porque el resto de
// archivos corre a la vez.

let userId: number

test.beforeEach(async ({ page }) => {
  userId = await logInPanel(page, E2E_PANEL_USER_2)
})

test.afterEach(async ({ page }) => {
  await releaseLocks(page, userId)
})

test('el texto del Discord del pie se cambia en «Ajustes del sitio»', async ({ page }) => {
  const text = 'Pregunta en el Discord lo que quieras.'
  try {
    await page.goto('/admin/globals/site-settings')
    await page.locator('.tabs-field__tab-button', { hasText: 'Pie de página' }).click()
    const field = page.getByLabel('Discord: texto')
    await expect(field).toHaveValue(siteSettingsDefaults.footer.discordText)
    await field.fill(text)
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.locator('.payload-toast-container')).toContainText('Se actualizó con éxito.')

    await page.goto('/')
    await expect(page.locator('.ft-join__d')).toHaveText(text)
  } finally {
    const restored = await page.request.post('/api/globals/site-settings', {
      data: { footer: { discordText: siteSettingsDefaults.footer.discordText } },
    })
    expect(restored.ok()).toBe(true)
  }
  await page.goto('/')
  await expect(page.locator('.ft-join__d')).toHaveText(siteSettingsDefaults.footer.discordText)
})

test('el título de /checklists en Google se cambia en «Portada e índices»', async ({ page }) => {
  const title = 'Las checklists de Torre'
  const { seo } = indexTextDefaults.checklists
  try {
    const saved = await page.request.post('/api/globals/index-texts', {
      data: { checklists: { seo: { title } } },
    })
    expect(saved.ok()).toBe(true)
    await page.goto('/checklists')
    await expect(page).toHaveTitle(title)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title)
  } finally {
    const restored = await page.request.post('/api/globals/index-texts', {
      data: { checklists: { seo: { title: seo.title } } },
    })
    expect(restored.ok()).toBe(true)
  }
  await page.goto('/checklists')
  await expect(page).toHaveTitle(seo.title)
})

test('los dos globales están en «Ajustes», con sus pestañas', async ({ page }) => {
  await page.goto('/admin/globals/index-texts')
  const settings = page.locator('nav .nav-group').last()
  await expect(settings.getByRole('link', { name: 'Ajustes del sitio' })).toBeVisible()
  // La página abierta sale en el menú como texto, no como enlace.
  await expect(settings.getByText('Portada e índices', { exact: true })).toBeVisible()
  await expect(page.locator('.tabs-field__tab-button')).toHaveText([
    'Portada',
    'Metalogros',
    'Guías de Dofus',
    'Checklists',
  ])
  await expect(page.getByLabel('Antetítulo').first()).toHaveValue(indexTextDefaults.home.eyebrow)
})
