import { expect, test } from '@playwright/test'

import { panelStrings } from '../../src/lib/admin/strings.ts'
import { logInPanel } from './panel-helpers.ts'
import { E2E_EDITOR_USER, E2E_PANEL_USER_4 } from './seed/guides.ts'

// «Refrescos de datos», en «Datos del juego»: cómo acabó el último refresco de DofusDB y el
// botón «Traer ahora», solo para un administrador. No se pulsa: lanzaría el refresco de
// verdad contra DofusDB (lo cubren tests/unit/game-data-refresh-endpoint.test.ts y
// tests/integration/game-data-refresh-runs.test.ts).

const t = panelStrings.gameDataRefresh
const LIST = '/admin/collections/game-data-refreshes'

test('un administrador ve el último refresco y el botón para traer los datos ahora', async ({
  page,
}) => {
  await logInPanel(page, E2E_PANEL_USER_4)
  await page.goto(LIST)

  await expect(page.getByRole('heading', { name: t.title })).toBeVisible()
  await expect(page.getByText(t.never)).toBeVisible()
  await expect(page.getByRole('button', { name: t.button })).toBeEnabled()
})

test('un editor ve el último refresco, pero no el botón', async ({ page }) => {
  await logInPanel(page, E2E_EDITOR_USER)
  await page.goto(LIST)

  await expect(page.getByRole('heading', { name: t.title })).toBeVisible()
  await expect(page.getByText(t.adminOnly)).toBeVisible()
  await expect(page.getByRole('button', { name: t.button })).toHaveCount(0)
})

test('la API no deja lanzarlo a un editor', async ({ page }) => {
  await logInPanel(page, E2E_EDITOR_USER)
  const response = await page.request.post('/api/game-data/refresh')
  expect(response.status()).toBe(403)
})
