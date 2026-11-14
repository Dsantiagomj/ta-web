import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { WCAG } from './panel-helpers.ts'
import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { E2E_PANEL_USER, seedGuide } from './seed/guides.ts'

// El panel para Torre, ola 1 (docs/research/backlog.md, A-01 a A-12), con el usuario del
// panel de la base de pruebas.

async function logIn(page: Page) {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER })
  expect(login.ok()).toBe(true)
}

/**
 * Abre un desplegable de Payload hasta que se vea lo que tiene dentro. Payload guarda en las
 * preferencias de la cuenta qué desplegables dejó abiertos, y uno cerrado al cargar no pinta
 * sus campos hasta abrirlo: un clic a ciegas podría cerrarlo, y uno durante el montaje se
 * pierde. Se reintenta.
 */
async function openUntil(collapsible: Locator, inside: Locator) {
  const toggle = collapsible.locator('> .collapsible__toggle-wrap > .collapsible__toggle')
  await expect(async () => {
    if (!(await inside.isVisible())) await toggle.click()
    await expect(inside).toBeVisible({ timeout: 1500 })
  }).toPass()
}

async function docId(page: Page, collection: string, slug: string): Promise<number> {
  const response = await page.request.get(
    `/api/${collection}?where[slug][equals]=${slug}&depth=0&draft=true`,
  )
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  expect(docs, `${collection}/${slug} sembrado`).toHaveLength(1)
  return docs[0]!.id
}

test.describe('el panel para Torre', () => {
  // Una sola sesión para todo el bloque, en serie: cada inicio de sesión reescribe las
  // sesiones de la cuenta, y varios a la vez pueden borrarse entre sí (y la de la vista
  // previa de guia.spec.ts, que usa la misma cuenta).
  test.describe.configure({ mode: 'serial' })
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    page = await context.newPage()
    // Una prueba que deja cambios sin guardar (el orden de los pasos) hace que el navegador
    // pregunte al salir: se sale sin guardar, también si esa prueba falla a medias.
    page.on('dialog', (dialog) => void dialog.accept())
    await logIn(page)
    // Sin preferencias guardadas: lo que cerró o abrió otra ejecución no cuenta, y cada
    // desplegable empieza como lo configura el panel.
    const cleared = await page.request.delete('/api/payload-preferences?where[id][exists]=true')
    expect(cleared.ok()).toBe(true)
  })

  // Payload bloquea el documento que alguien tiene abierto, y cerrar el navegador no lo
  // suelta: lo que se abre aquí quedaría bloqueado para la prueba siguiente que lo abra.
  test.afterEach(async () => {
    const me = await page.request.get('/api/users/me')
    const id = ((await me.json()) as { user?: { id: number } }).user?.id
    if (id === undefined) return
    const mine = `where[user.value][equals]=${id}`
    expect((await page.request.delete(`/api/payload-locked-documents?${mine}`)).ok()).toBe(true)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  test('el menú pone primero el contenido y al final los datos del juego y los ajustes', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/admin')
    const groups = page.locator('nav .nav-group__label')
    await expect(groups).toHaveText([
      'Contenido',
      'Imágenes',
      'Datos del juego (solo lectura)',
      'Ajustes',
    ])
    const content = page.locator('nav .nav-group').first()
    await expect(content.getByRole('link')).toHaveText([
      'Guías de misiones',
      'Logros',
      'Metalogros',
      'Guías de Dofus',
      'Checklists',
      'Índice de guías de Dofus',
    ])
    await expect(page).toHaveTitle(/ · Torrente Arcano$/)
  })

  test('un logro tiene un solo «Estado»: el de Payload, en palabras claras', async () => {
    const id = await docId(page, 'achievement-pages', seedAchievement.slug)
    await page.goto(`/admin/collections/achievement-pages/${id}`)

    await expect(page.locator('.doc-controls').getByText('Estado:')).toBeVisible()
    await expect(page.locator('.doc-controls').getByText('Publicado en la web')).toBeVisible()
    // El campo de Torre ya no se llama «Estado».
    await expect(page.locator('#field-state').getByText('Visible en la web')).toBeVisible()
    await expect(page.locator('.field-label', { hasText: /^Estado/ })).toHaveCount(0)
    await expect(page.getByText('pulsa «Publicar cambios» arriba')).toBeVisible()
  })

  test('el slug se llama «Dirección en la web» y enseña la dirección completa', async () => {
    const id = await docId(page, 'quest-guides', seedGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${id}`)

    await expect(page.locator('label[for="field-slug"]')).toContainText('Dirección en la web')
    await expect(page.getByText(`torrentearcano.com/${seedGuide.slug}`)).toBeVisible()
    await expect(page.locator('.field-label', { hasText: /^Slug/ })).toHaveCount(0)

    // La dirección vacía tiene su propio mensaje, no el del formato.
    await page.locator('#field-slug').fill('')
    await expect(
      page.getByText('Escribe la dirección para ver dónde se verá la página.'),
    ).toBeVisible()
  })

  test('sin pestaña API, sin selector de idioma y sin «— Español»', async () => {
    const id = await docId(page, 'quest-guides', seedGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${id}`)

    await expect(page.getByRole('link', { name: 'Versiones' })).toBeVisible()
    await expect(page.locator('.doc-tabs').getByText('API', { exact: true })).toHaveCount(0)
    await expect(page.locator('.localizer')).toBeHidden()
    const suffixes = page.locator('.field-label .localized')
    expect(await suffixes.count()).toBeGreaterThan(0)
    for (const suffix of await suffixes.all()) await expect(suffix).toBeHidden()
  })

  test('los pasos de una checklist se llaman por su texto y el identificador va aparte', async () => {
    const nebuloso = seedChecklists.nebuloso
    const id = await docId(page, 'checklists', nebuloso.slug)
    await page.goto(`/admin/collections/checklists/${id}`)

    const first = page.locator('#steps-row-0')
    await expect(first.getByText(`Paso 1: ${nebuloso.steps.first}`)).toBeVisible()
    // Empieza cerrado: el identificador no se ve hasta abrir «Datos técnicos».
    await expect(first.locator('#field-steps__0__stepId')).toBeHidden()
    await openUntil(first.locator('> .collapsible'), first.locator('#field-steps__0__zone'))
    // Las misiones van en su pestaña (A-18). Sus filas se llaman por su misión: el nombre
    // llega en una petición por colección para todas las filas, no en una por fila.
    await first.getByRole('button', { name: 'Misiones y logros' }).click()
    await expect(first.getByText(`Misión 1: ${seedGuide.title}`)).toBeVisible()
    // Payload pinta en el servidor los campos de la fila recién abierta: hasta que termina,
    // abrir «Datos técnicos» puede quedarse sin sus campos.
    await page.waitForLoadState('networkidle')
    const technical = first.locator('.collapsible-field__collapsible', {
      hasText: 'Datos técnicos',
    })
    await expect(first.locator('#field-steps__0__stepId')).toBeHidden()
    await openUntil(technical, first.locator('#field-steps__0__stepId'))
    await expect(
      first.getByRole('button', { name: 'Copiar el identificador del paso' }),
    ).toBeVisible()
  })

  test('el orden de los pasos se cambia con sus flechas y con el teclado (A-18)', async () => {
    const nebuloso = seedChecklists.nebuloso
    const id = await docId(page, 'checklists', nebuloso.slug)
    await page.goto(`/admin/collections/checklists/${id}`)
    const outline = page.locator('.ta-outline')
    await outline.locator('summary').click()
    const rows = outline.locator('.ta-outline__row')
    await expect(rows).toHaveCount(3)
    await expect(rows.first()).toContainText(`Paso 1: ${nebuloso.steps.first}`)
    const results = await new AxeBuilder({ page }).include('.ta-outline').withTags(WCAG).analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])

    await outline.getByRole('button', { name: 'Bajar el paso 1' }).click()
    await expect(rows.nth(1)).toContainText(nebuloso.steps.first)
    await expect(page.locator('#steps-row-1')).toContainText(nebuloso.steps.first)
    await expect(outline.getByRole('status')).toHaveText('El paso 1 es ahora el 2.')

    // Con el foco en el paso movido, Alt y la flecha arriba lo devuelven a su sitio.
    await expect(rows.nth(1)).toBeFocused()
    await page.keyboard.press('Alt+ArrowUp')
    await expect(rows.first()).toContainText(nebuloso.steps.first)
    await expect(page.locator('#steps-row-0')).toContainText(nebuloso.steps.first)
  })

  test('los pasos y el objetivo de parada se eligen por su nombre (A-19)', async () => {
    const nebuloso = seedChecklists.nebuloso
    const id = await docId(page, 'checklists', nebuloso.slug)
    await page.goto(`/admin/collections/checklists/${id}`)

    // El paso 3 se resuelve y cierra el 2: el 2 sale por su nombre, no por su identificador.
    const third = page.locator('#steps-row-2')
    const resolve = third.locator('#steps-2-segments-row-1')
    await openUntil(third.locator('> .collapsible'), resolve)
    await page.waitForLoadState('networkidle')
    const closes = third.locator('#field-steps__2__segments__1__closes')
    await openUntil(resolve.locator('> .collapsible'), closes)
    await expect(closes).toContainText(`Paso 2: ${nebuloso.steps.stopPlain}`)
    // Un paso recién añadido se puede elegir sin guardar: su identificador nace con la fila.
    await page.locator('#field-steps').getByRole('button', { name: 'Añadir Paso' }).last().click()
    await expect(page.locator('#steps-row-3')).toBeVisible()
    await closes.locator('.rs__control').click()
    await expect(page.locator('.rs__option', { hasText: /^Paso 4$/ })).toBeVisible()
    await page.keyboard.press('Escape')

    // El paso 2 para en el segundo objetivo de su misión: sale por su texto.
    const second = page.locator('#steps-row-1')
    const stop = second.locator('#steps-1-segments-row-1')
    await openUntil(second.locator('> .collapsible'), stop)
    await page.waitForLoadState('networkidle')
    const objective = second.locator('#field-steps__1__segments__1__stopObjective')
    await openUntil(stop.locator('> .collapsible'), objective)
    await expect(objective).toContainText(`2. ${nebuloso.stopQuest.objectives[1].text}`)
    // Abierto, lista todos los objetivos de la misión, en su orden.
    await objective.locator('.rs__control').click()
    await expect(page.locator('.rs__option')).toHaveText(
      nebuloso.stopQuest.objectives.map((o, i) => `${i + 1}. ${o.text}`),
    )
    await page.keyboard.press('Escape')
  })

  test('el formulario de subir una imagen explica el texto alternativo', async () => {
    await page.goto('/admin/collections/media/create')
    await expect(page.getByText('Describe lo que se ve')).toBeVisible()
    await expect(page.getByText('Arte del juego')).toHaveCount(0)
    await expect(page.getByText('Dirección en Squarespace')).toHaveCount(0)
  })

  test('la vista de edición pasa axe entera (A-21)', async () => {
    const id = await docId(page, 'quest-guides', seedGuide.slug)
    await page.goto(`/admin/collections/quest-guides/${id}`)
    await expect(page.locator('#field-slug')).toBeVisible()

    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })
})

test('el inicio de sesión del panel lleva la marca y pasa axe', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.getByText('Este es el panel de Torrente Arcano')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
})
