import { expect, type Page } from '@playwright/test'

import { panelStrings } from '../../src/lib/admin/strings.ts'
import { E2E_PANEL_USER_2 } from './seed/guides.ts'

// Lo que comparten las pruebas de la ola 2 del panel: una sesión de su propia cuenta, el id
// de un documento sembrado, soltar los documentos que Payload bloquea al abrirlos y dejar
// uno como su versión publicada.

type Account = { email: string; password: string }

export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Inicia sesión y devuelve el id de la cuenta, para soltar luego sus bloqueos. Cada archivo
 * de pruebas usa su propia cuenta.
 */
export async function logInPanel(page: Page, account: Account = E2E_PANEL_USER_2): Promise<number> {
  const login = await page.request.post('/api/users/login', { data: account })
  expect(login.ok()).toBe(true)
  return ((await login.json()) as { user: { id: number } }).user.id
}

/**
 * Payload bloquea el documento que una cuenta tiene abierto, y cerrar el navegador no lo
 * suelta: otra prueba que lo abra después vería «Documento bloqueado». Se sueltan tras cada
 * prueba.
 */
export async function releaseLocks(page: Page, userId: number) {
  const mine = `where[user.value][equals]=${userId}`
  const released = await page.request.delete(`/api/payload-locked-documents?${mine}`)
  expect(released.ok()).toBe(true)
}

export async function docId(page: Page, collection: string, slug: string): Promise<number> {
  const response = await page.request.get(
    `/api/${collection}?where[slug][equals]=${slug}&depth=0&draft=true`,
  )
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  expect(docs, `${collection}/${slug} sembrado`).toHaveLength(1)
  return docs[0]!.id
}

/**
 * Deja un documento como su versión publicada, igual que «Revertir a la versión publicada»
 * de Payload: una prueba que guarda un borrador no se lo deja a la siguiente.
 */
export async function restorePublished(page: Page, collection: string, id: number) {
  const url = `/api/${collection}/${id}?depth=0`
  const published = await page.request.get(`${url}&draft=false`)
  expect(published.ok()).toBe(true)
  const restored = await page.request.patch(url, { data: await published.json() })
  expect(restored.ok()).toBe(true)
}

/**
 * Espera a que PanelA11y ponga sus nombres (A-21): los pone un fotograma después de cada
 * cambio, y networkidle solo no lo espera. Comprueba nombres concretos en lo que la página
 * tenga.
 */
export async function waitForPanelNames(page: Page) {
  const a11y = panelStrings.a11y
  const known: [string, string][] = [
    ['.collapsible__drag[role="button"]', a11y.dragHandle],
    ['.doc-controls__popup button.popup-button', a11y.documentActions],
    ['#select-all', a11y.selectAll],
    ['.upload-relationship-details__edit', a11y.editUpload],
    ['.upload-relationship-details__remove', a11y.removeUpload],
  ]
  // Primero, que llegue lo que la página pide (las imágenes elegidas se pintan después);
  // luego, el fotograma de PanelA11y.
  await page.waitForLoadState('networkidle')
  await expect
    .poll(() =>
      page.evaluate((targets) => {
        return targets.every(([selector, label]) =>
          [...document.querySelectorAll(selector)].every(
            (element) => element.getAttribute('aria-label') === label,
          ),
        )
      }, known),
    )
    .toBe(true)
}

/** El dominio de la cookie de una prueba: el de baseURL. */
export function cookieDomain(baseURL: string | undefined): string {
  return new URL(baseURL ?? 'http://localhost').hostname
}
