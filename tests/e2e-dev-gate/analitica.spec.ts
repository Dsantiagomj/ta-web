import { expect, test } from '@playwright/test'

import { captureVisits, pushRoute } from '../e2e/analytics-capture'
import { seedGuide } from '../e2e/seed/guides'

// En el entorno dev la analítica nunca se enciende, aunque tenga UMAMI_HOST y
// UMAMI_WEBSITE_ID (playwright.dev-gate.config.ts las pone): las visitas de prueba no se
// mezclan con las de verdad.

test('en dev no se pinta el script de Umami ni se envía ninguna visita', async ({ page }) => {
  const visits = await captureVisits(page)

  const response = await page.goto(`/${seedGuide.slug}`, { waitUntil: 'load' })
  expect(await response!.text()).not.toContain('/api/send')
  await pushRoute(page, '/metalogros')
  await page.waitForTimeout(1_000)

  expect(visits).toEqual([])
})
