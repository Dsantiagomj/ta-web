import { expect, test } from '@playwright/test'

import { captureVisits, pushRoute, stayedOnPage } from './analytics-capture'
import { ANALYTICS_E2E } from './app-server'
import { seedGuide } from './seed/guides'

// La analítica sin cookies (Umami, backlog S-18). La suite principal corre sin UMAMI_* y no
// envía nada; un segundo servidor, con el mismo build y la misma base, tiene Umami
// encendido contra un Umami falso que se intercepta aquí: ninguna petición sale a la red.

const analyticsUrl = process.env.E2E_ANALYTICS_URL
// Lo que tarda el script tras un cambio de ruta (300 ms) y un margen.
const SETTLE_MS = 1_000

test.describe('sin UMAMI_HOST ni UMAMI_WEBSITE_ID', () => {
  test('no pinta el script ni envía nada, tampoco al cambiar de ruta', async ({ page }) => {
    const visits = await captureVisits(page)
    const sends: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/send')) sends.push(request.url())
    })

    const response = await page.goto(`/${seedGuide.slug}`, { waitUntil: 'load' })
    expect(await response!.text()).not.toContain('/api/send')
    await pushRoute(page, '/metalogros')
    await page.waitForTimeout(SETTLE_MS)

    expect(visits).toEqual([])
    expect(sends).toEqual([])
  })
})

test.describe('con Umami encendido', () => {
  test.skip(!!process.env.SMOKE_BASE_URL, 'El servidor con Umami solo arranca en local')

  test('cada página cargada envía una visita con su ruta, su título y sin cookies', async ({
    page,
  }) => {
    const visits = await captureVisits(page)

    await page.goto(`${analyticsUrl}/${seedGuide.slug}?directo=1#paso-2`)
    await expect.poll(() => visits.length).toBe(1)
    const title = await page.title()

    expect(visits[0]!.body).toEqual({
      type: 'event',
      payload: {
        website: ANALYTICS_E2E.websiteId,
        hostname: 'localhost',
        language: await page.evaluate(() => navigator.language),
        referrer: '',
        screen: await page.evaluate(() => `${screen.width}x${screen.height}`),
        title,
        url: `/${seedGuide.slug}`,
      },
    })
    expect(title).not.toBe('')
    expect(visits[0]!.cookie).toBeUndefined()

    await page.goto(`${analyticsUrl}/`)
    await expect
      .poll(() => visits.map((visit) => visit.body.payload.url))
      .toEqual([`/${seedGuide.slug}`, '/'])
  })

  test('cuenta los cambios de ruta del App Router, una vez por ruta', async ({ page }) => {
    const visits = await captureVisits(page)
    await page.goto(`${analyticsUrl}/`)
    await expect.poll(() => visits.length).toBe(1)

    await pushRoute(page, `/${seedGuide.slug}`)
    await expect.poll(() => visits.length).toBe(2)
    expect(visits[1]!.body.payload).toMatchObject({
      url: `/${seedGuide.slug}`,
      referrer: `${analyticsUrl}/`,
    })

    // Un ancla o una consulta en la misma ruta no es otra visita.
    await pushRoute(page, `/${seedGuide.slug}#paso-2`)
    await pushRoute(page, `/${seedGuide.slug}?filtro=1`)
    await page.waitForTimeout(SETTLE_MS)
    expect(visits).toHaveLength(2)

    // La vuelta atrás del navegador sí.
    await page.goBack()
    await page.goBack()
    await page.goBack()
    await expect
      .poll(() => visits.map((visit) => visit.body.payload.url))
      .toEqual(['/', `/${seedGuide.slug}`, '/'])
    expect(await stayedOnPage(page)).toBe(true)
  })
})
