import type { Page } from '@playwright/test'

import { ANALYTICS_E2E } from './app-server'

export type Visit = {
  body: { type: string; payload: Record<string, string> }
  cookie: string | undefined
}

/**
 * Intercepta todo lo que iría a Umami, sin red: el Umami falso de las pruebas
 * (ANALYTICS_E2E) y cualquier `/api/send`. Responde como Umami, con CORS, también a la
 * petición previa (OPTIONS) que el navegador hace por el Content-Type JSON. Devuelve las
 * visitas recibidas, en orden.
 */
export async function captureVisits(page: Page): Promise<Visit[]> {
  const visits: Visit[] = []
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST',
    'access-control-allow-headers': 'content-type',
  }
  const handler = async (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    visits.push({
      body: request.postDataJSON(),
      cookie: (await request.headerValue('cookie')) ?? undefined,
    })
    return route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: '{}',
    })
  }
  await page.route(`${ANALYTICS_E2E.host}/**`, handler)
  await page.route('**/api/send', handler)
  return visits
}

/** Cambia la ruta como lo hace el App Router de Next: history.pushState, sin recargar. */
export async function pushRoute(page: Page, url: string) {
  await page.evaluate((target) => {
    ;(window as Window & { __sinRecarga?: boolean }).__sinRecarga = true
    window.history.pushState(null, '', target)
  }, url)
}

/** Que la página siguió sin recargarse desde pushRoute. */
export function stayedOnPage(page: Page) {
  return page.evaluate(() => (window as Window & { __sinRecarga?: boolean }).__sinRecarga === true)
}
