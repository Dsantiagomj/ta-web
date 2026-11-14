import { expect, test, type Page } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { E2E_EDITOR_USER, seedGuide } from './seed/guides.ts'

// El panel para un editor (docs/research/backlog.md, A-15, A-17 y A-23): borra lo que no vino
// de la importación, pero el panel se niega si sale en otra guía, y no cambia los campos que
// rompen datos.

async function docId(page: Page, collection: string, slug: string): Promise<number> {
  const response = await page.request.get(
    `/api/${collection}?where[slug][equals]=${slug}&depth=0&draft=true`,
  )
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  expect(docs, `${collection}/${slug} sembrado`).toHaveLength(1)
  return docs[0]!.id
}

test.describe('el panel para un editor', () => {
  // Una sola sesión del editor para todo el bloque: cada inicio de sesión reescribe las
  // sesiones de la cuenta.
  test.describe.configure({ mode: 'serial' })
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage()
    const { email, password } = E2E_EDITOR_USER
    const login = await page.request.post('/api/users/login', { data: { email, password } })
    expect(login.ok()).toBe(true)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  test('no borra una guía que sale en una guía de Dofus, y dice dónde sale', async () => {
    const id = await docId(page, 'quest-guides', seedGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${id}`)

    await page.locator('.doc-controls__popup .popup-button').click()
    await page.locator('#action-delete').click()
    await page.locator('#confirm-action').click()

    await expect(
      page.getByText(
        `Esta guía de misión sale en 1 guía: «${seedDofus.ocre.name}». ` +
          'Quítala de ella antes de borrarla.',
      ),
    ).toBeVisible()
    // Sigue ahí.
    const stillThere = await page.request.get(`/api/quest-guides/${id}?depth=0&draft=true`)
    expect(stillThere.ok()).toBe(true)
  })

  test('ve el orden y la clave guardada de un prerrequisito, pero no los cambia', async () => {
    const id = await docId(page, 'checklists', seedChecklists.nebuloso.slug)
    await page.goto(`/admin/collections/checklists/${id}`)

    const order = page.locator('#field-order')
    await expect(order).toBeDisabled()
    await expect(page.getByText('solo un administrador puede cambiarlo').first()).toBeVisible()

    const savedKey = page.locator('#field-prerequisites__groups__0__rows__0__key')
    await expect(savedKey).toHaveValue('l1')
    await expect(savedKey).toBeDisabled()
    await expect(
      page.getByText('Se escribe al crear la fila y luego queda fija').first(),
    ).toBeVisible()

    // Una fila nueva sí se escribe: su clave se pone al crearla.
    const rows = page.locator('#field-prerequisites__groups__0__rows')
    await rows.getByRole('button', { name: 'Añadir Fila' }).click()
    const newKey = page.locator('#field-prerequisites__groups__0__rows__1__key')
    await expect(newKey).toBeEnabled()
  })
})
