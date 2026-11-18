import { expect, test } from '@playwright/test'

import { logInPanel, releaseLocks } from './panel-helpers.ts'
import { E2E_PANEL_USER_5 } from './seed/guides.ts'

// El bloque Tabla en el panel (backlog D-02): Torre pega lo copiado de una hoja de cálculo,
// «Rellenar la tabla» crea las columnas y las filas en el formulario, sin guardar, y al
// guardar quedan en la página. Crea su propia página y la borra al acabar.

let userId: number

test.beforeEach(async ({ page }) => {
  userId = await logInPanel(page, E2E_PANEL_USER_5)
})

test.afterEach(async ({ page }) => {
  await releaseLocks(page, userId)
})

const pasted = [
  'Familiar\tNivel\tBonus',
  'Tofu\t12\t+80 Vitalidad',
  'Bwak de Aire\t1\tAgilidad',
  '',
].join('\n')

test('«Pegar desde una hoja de cálculo» rellena las columnas y las filas', async ({ page }) => {
  const slug = `prueba-tabla-pegada-${Date.now()}`
  let id: string | undefined
  try {
    await page.goto('/admin/collections/pages/create')
    await page.locator('#field-title').fill('Tabla pegada')
    await page.locator('#field-slug').fill(slug)
    await page.getByRole('button', { name: 'Añadir Bloque', exact: true }).last().click()
    const drawer = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Añadir Bloque' }) })
    await drawer.getByRole('button', { name: /Tabla/ }).click()

    // Sin nada pegado, lo dice.
    await page.getByRole('button', { name: 'Rellenar la tabla' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Pega primero' })).toBeVisible()

    await page.getByLabel('Pegar desde una hoja de cálculo').fill(pasted)
    await page.getByRole('button', { name: 'Rellenar la tabla' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Listo: 3 columnas y 2 filas.' }),
    ).toBeVisible()
    // Las filas, plegadas, se reconocen por su texto.
    await expect(page.getByText('Columna 2: Nivel')).toBeVisible()
    await expect(page.getByText('Fila 1: Tofu · 12 · +80 Vitalidad')).toBeVisible()
    await expect(page.getByText('Fila 2: Bwak de Aire · 1 · Agilidad')).toBeVisible()

    await page.getByRole('button', { name: 'Guardar borrador' }).click()
    await page.waitForURL(/\/admin\/collections\/pages\/\d+/)
    id = page.url().match(/pages\/(\d+)/)![1]
    const doc = await (await page.request.get(`/api/pages/${id}?draft=true&depth=0`)).json()
    const [block] = doc.body
    expect(block.blockType).toBe('table')
    expect(block.columns.map((column: { header: string; align: string }) => column)).toEqual([
      expect.objectContaining({ header: 'Familiar', align: 'start' }),
      expect.objectContaining({ header: 'Nivel', align: 'end' }),
      expect.objectContaining({ header: 'Bonus', align: 'start' }),
    ])
    expect(
      block.rows.map((row: { cells: { text: string }[] }) => row.cells.map(({ text }) => text)),
    ).toEqual([
      ['Tofu', '12', '+80 Vitalidad'],
      ['Bwak de Aire', '1', 'Agilidad'],
    ])
  } finally {
    if (id) await page.request.delete(`/api/pages/${id}`)
  }
})
