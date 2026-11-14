import { expect, type Page } from '@playwright/test'

import { E2E_PANEL_USER_2 } from './seed/guides.ts'

// Lo que comparten las pruebas de la ola 2 del panel: una sesión de su propia cuenta y el
// id de un documento sembrado.

export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function logInPanel(page: Page) {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER_2 })
  expect(login.ok()).toBe(true)
}

export async function docId(page: Page, collection: string, slug: string): Promise<number> {
  const response = await page.request.get(
    `/api/${collection}?where[slug][equals]=${slug}&depth=0&draft=true`,
  )
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  expect(docs, `${collection}/${slug} sembrado`).toHaveLength(1)
  return docs[0]!.id
}
