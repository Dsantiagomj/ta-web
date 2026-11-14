import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { indexChecklists } from './seed/checklists-index.ts'
import { E2E_PANEL_USER_4 } from './seed/guides.ts'

// El Ocre, una checklist de almas, como queda en dev tras importarlo: la ficha publicada sigue
// En preparación (a Squarespace) y la vista previa del panel enseña el borrador de almas. Tres
// almas en dos etapas: Mob Lasponja (jefe, en el Castillo de Arena), Pikopi y Arakna Maja, con
// un nombre largo que la tarjeta corta.

const ocre = indexChecklists.legacy
const souls = indexChecklists.souls
const ARAKNA = souls.monsters[2].name

// Su propia cuenta: cada inicio de sesión reescribe las sesiones de la cuenta, y otra spec que
// entre a la vez con la misma puede borrar la suya (seed/guides.ts).
async function preview(page: Page) {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER_4 })
  expect(login.ok()).toBe(true)
  await page.goto(`/vista-previa?slug=${ocre.slug}`)
  await expect(page).toHaveURL(new RegExp(`/${ocre.slug}$`))
  // La isla está lista cuando suelta las casillas.
  await expect(page.locator('[data-sl-own]').first()).toBeEnabled()
}

// Cada alma sale en las dos vistas (por etapa y por región): se mira la que se ve.
const soul = (page: Page, name: string) =>
  page.locator('[data-sl-view]:visible .sl-soul', { hasText: name })
const visibleNames = (page: Page) =>
  page.locator('[data-sl-view]:visible .sl-soul:visible .sl-soul__n').allTextContents()
const typeButton = (page: Page, name: RegExp) =>
  page.getByRole('group', { name: 'Tipo de alma' }).getByRole('button', { name })
const stageButton = (page: Page, name: RegExp) =>
  page.getByRole('navigation', { name: 'Etapas' }).getByRole('button', { name })
const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

test.describe('el Ocre en la vista previa', () => {
  test('sin sesión, la ficha En preparación sigue llevando a Squarespace', async ({ request }) => {
    const response = await request.get(`/${ocre.slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(ocre.legacyHref)
  })

  test('las almas por etapa, con su nivel y dónde se luchan, y el aviso de Torre', async ({
    page,
  }) => {
    await preview(page)
    await expect(page.getByRole('heading', { level: 1, name: ocre.name })).toBeVisible()
    await expect(page.getByText(souls.intro)).toBeVisible()
    const stage = page.locator('[data-sl-view="stage"] .sl-gh')
    await expect(stage).toHaveText(['Etapa 1 · Jefes 0/1', 'Etapa 2 · Archis 0/2'])
    // El jefe al nivel de su mazmorra (25), no al de su grado más alto.
    await expect(soul(page, 'Mob Lasponja')).toContainText('Nv. 20 · Castillo de Arena')
    await expect(soul(page, 'Pikopi')).toContainText('Nv. 55 · Bosque de Amakna')
    // Sin etiqueta de jefe o archi: el tipo solo filtra.
    await expect(page.locator('.sl-tag')).toHaveCount(0)
  })

  test('marcar un alma cuenta en el porcentaje y en su grupo, y se guarda', async ({ page }) => {
    await preview(page)
    await soul(page, 'Pikopi').locator('label').click()
    await expect(page.locator('[data-sl-pct]')).toHaveText('33,3 %')
    await expect(page.locator('[data-sl-done]')).toHaveText('1')
    await expect(page.locator('[data-sl-view="stage"] .sl-gh').nth(1)).toHaveText(
      'Etapa 2 · Archis 1/2',
    )
    await page.reload()
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).toBeChecked()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(Object.keys(stored.souls)).toEqual(['991602'])
  })

  test('por región, el tipo, el buscador y ocultar las que se tienen', async ({ page }) => {
    await preview(page)
    await page.getByRole('button', { name: 'Por región' }).click()
    await expect(page.locator('[data-sl-view="region"] .sl-gh')).toHaveText([
      'Astrub 0/2',
      'Amakna 0/1',
    ])
    await expect(page.locator('[data-sl-view="stage"]')).toBeHidden()

    await typeButton(page, /^Jefes/).click()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja'])
    await typeButton(page, /^Todas/).click()

    await page.getByRole('searchbox').fill('arakna')
    expect(await visibleNames(page)).toEqual([ARAKNA])
    await page.getByRole('searchbox').fill('')

    await soul(page, ARAKNA).locator('label').click()
    await page.getByRole('checkbox', { name: 'Ocultar las que tengo' }).check()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja', 'Pikopi'])
  })

  test('busca por alma, mazmorra, zona, región o nivel, también un rango', async ({ page }) => {
    await preview(page)
    const search = page.getByRole('searchbox')
    await expect(search).toHaveAttribute('placeholder', 'Alma, mazmorra, zona, región o nivel')
    for (const [text, names] of [
      ['55', ['Pikopi']],
      ['nv. 20', ['Mob Lasponja']],
      ['10-25', ['Mob Lasponja', ARAKNA]],
      ['castillo', ['Mob Lasponja']],
      ['playa de arena', ['Mob Lasponja', ARAKNA]],
      ['AMAKNA', ['Pikopi']],
      ['tejedora', [ARAKNA]],
    ] as const) {
      await search.fill(text)
      expect(await visibleNames(page), text).toEqual(names)
    }
  })

  test('el panel de las etapas filtra la lista y «Todas» la devuelve; al lado en el escritorio', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await preview(page)
    const panel = page.getByRole('navigation', { name: 'Etapas' })
    const list = page.locator('.sl-staged__list')
    const [panelBox, listBox] = [(await panel.boundingBox())!, (await list.boundingBox())!]
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(listBox.x)
    await expect(stageButton(page, /Etapa 2/)).toContainText('0/2')

    await stageButton(page, /Etapa 2/).click()
    await expect(stageButton(page, /Etapa 2/)).toHaveAttribute('aria-pressed', 'true')
    expect(await visibleNames(page)).toEqual(['Pikopi', ARAKNA])
    await stageButton(page, /^Todas/).click()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja', 'Pikopi', ARAKNA])
  })

  test('en el móvil las etapas son una fila encima de la lista, sin desbordar la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await preview(page)
    const chips = page.getByRole('navigation', { name: 'Etapas' }).getByRole('button')
    await expect(chips).toHaveCount(3)
    const tops = await chips.evaluateAll((all) => all.map((el) => el.getBoundingClientRect().top))
    expect(new Set(tops).size).toBe(1)
    const panel = (await page.getByRole('navigation', { name: 'Etapas' }).boundingBox())!
    const list = (await page.locator('.sl-staged__list').boundingBox())!
    expect(panel.y + panel.height).toBeLessThanOrEqual(list.y)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    // Con 18 etapas la fila se desliza: el texto para lectores de pantalla de cada botón tiene
    // que quedarse dentro de la fila, o ensancha la página (aquí, con dos, aún cabe todo).
    const escaped = await page
      .locator('.sl-stages .sr-only')
      .evaluateAll(
        (all) =>
          all.filter((el) => !el.closest('.sl-stages')!.contains((el as HTMLElement).offsetParent))
            .length,
      )
    expect(escaped).toBe(0)
  })

  for (const width of [360, 390, 1024]) {
    test(`a ${width}px la ayuda del buscador se lee entera`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await preview(page)
      const fits = await page.getByRole('searchbox').evaluate((input: HTMLInputElement) => {
        const style = getComputedStyle(input, '::placeholder')
        const box = getComputedStyle(input)
        const context = document.createElement('canvas').getContext('2d')!
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        // Chrome guarda sitio para la cruz de borrar del campo de búsqueda aunque esté vacío.
        const clear = 16
        const room =
          input.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight) - clear
        return context.measureText(input.placeholder).width <= room
      })
      expect(fits).toBe(true)
    })
  }

  for (const width of [390, 768, 1024, 1440]) {
    test(`a ${width}px todas las tarjetas miden lo mismo y el nombre largo se corta en dos líneas`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await preview(page)
      const cards = page.locator('[data-sl-view="stage"] .sl-soul__b')
      const heights = await cards.evaluateAll((all) =>
        all.map((el) => (el as HTMLElement).offsetHeight),
      )
      expect(new Set(heights).size).toBe(1)
      // La casilla va encima de la tarjeta, sin ocupar sitio: cada fila mide lo que su tarjeta.
      const gaps = await page
        .locator('[data-sl-view="stage"] .sl-soul')
        .evaluateAll((all) =>
          all.map(
            (li) =>
              (li as HTMLElement).offsetHeight -
              li.querySelector<HTMLElement>('.sl-soul__b')!.offsetHeight,
          ),
        )
      expect(new Set(gaps)).toEqual(new Set([0]))
      const name = soul(page, ARAKNA).locator('.sl-soul__n')
      const lines = await name.evaluate((el) => {
        const { lineHeight } = getComputedStyle(el)
        return { shown: el.clientHeight / parseFloat(lineHeight), full: el.scrollHeight }
      })
      expect(Math.round(lines.shown)).toBe(2)
      // Entero en la casilla y al pasar el ratón.
      await expect(soul(page, ARAKNA).locator('[data-sl-own]')).toHaveAttribute(
        'aria-label',
        `${ARAKNA}, Nv. 13 · Playa de Arena`,
      )
      await expect(name).toHaveAttribute('title', ARAKNA)
      // Ningún texto de la tarjeta queda en una columna de una palabra por línea.
      const narrow = await page
        .locator('[data-sl-view="stage"] .sl-soul__x')
        .evaluateAll((all) => all.filter((el) => el.getBoundingClientRect().width < 120).length)
      expect(narrow).toBe(0)
    })
  }

  test('marcar anima el alma sin mover nada, y completar una etapa la celebra', async ({
    page,
  }) => {
    await preview(page)
    const layout = () =>
      page
        .locator('[data-sl-view="stage"] .sl-soul, [data-sl-view="stage"] .sl-gh')
        .evaluateAll((all) =>
          all.map((el) => [(el as HTMLElement).offsetTop, (el as HTMLElement).offsetLeft]),
        )
    const before = await layout()
    await soul(page, 'Mob Lasponja').locator('label').click()
    await expect(soul(page, 'Mob Lasponja')).toHaveAttribute('data-just', 'on')
    // Es la última de la etapa 1: también suelta chispas.
    await expect(soul(page, 'Mob Lasponja')).toHaveAttribute('data-cheer', '')
    expect(await layout()).toEqual(before)
    await expect(page.locator('[data-ck-toast]')).toHaveText('¡Etapa 1 completa!')
    const group = page.locator('[data-sl-view="stage"] [data-sl-group="1"]')
    await expect(group).toHaveAttribute('data-complete', '')
    await expect(stageButton(page, /Etapa 1/)).toHaveAttribute('data-complete', '')
    // Acabada la animación, la tarjeta y la etapa quedan quietas.
    await settled(page)
    await expect(soul(page, 'Mob Lasponja')).not.toHaveAttribute('data-just')
    await expect(group).not.toHaveAttribute('data-cheer')
    expect(await layout()).toEqual(before)
  })

  test('con todas, «Todas» lo celebra y acaba; al cambiar de vista nada destella a destiempo', async ({
    page,
  }) => {
    await preview(page)
    for (const name of ['Mob Lasponja', 'Pikopi', ARAKNA]) {
      await soul(page, name).locator('label').click()
    }
    await expect(page.locator('[data-ck-toast]')).toHaveText('¡Tienes todas las almas!')
    const all = stageButton(page, /^Todas/)
    await expect(all).toHaveAttribute('data-complete', '')
    // Su animación corre y, al acabar, quita el atributo; si no hubiera animación se quedaría.
    await settled(page)
    await expect(all).not.toHaveAttribute('data-cheer')
    await page.getByRole('button', { name: 'Por región' }).click()
    await expect(page.locator('[data-sl-view="region"] [data-just]')).toHaveCount(0)
    await expect(page.locator('[data-sl-view="region"] [data-cheer]')).toHaveCount(0)
  })

  test('con movimiento reducido no se anima nada', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await preview(page)
    await soul(page, 'Mob Lasponja').locator('label').click()
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a.effect?.getComputedTiming().duration as number) > 1).length,
    )
    expect(running).toBe(0)
    await expect(page.locator('[data-ck-toast]')).toHaveText('¡Etapa 1 completa!')
  })

  test('las almas de la checklist antigua («cosecha:done») se traen una vez', async ({ page }) => {
    await preview(page)
    await page.evaluate(() => localStorage.setItem('cosecha:done', JSON.stringify([991603, 7])))
    await page.reload()
    await expect(soul(page, ARAKNA).locator('[data-sl-own]')).toBeChecked()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(stored.souls).toHaveProperty('991603')
    // 7 no es de la checklist hoy, pero se guarda por si su monstruo llega después; no cuenta.
    expect(stored.souls).toHaveProperty('7')
    await expect(page.locator('[data-sl-done]')).toHaveText('1')
    expect(stored.migrated).toHaveProperty('cosecha')
    // La clave antigua se queda donde estaba.
    expect(await page.evaluate(() => localStorage.getItem('cosecha:done'))).not.toBeNull()
  })

  test('reiniciar quita las almas de esta checklist', async ({ page }) => {
    await preview(page)
    await soul(page, 'Pikopi').locator('label').click()
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Reiniciar el progreso' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reiniciar el progreso' })
    await expect(dialog).toContainText('Las almas que tienes')
    await dialog.getByRole('button', { name: 'Reiniciar' }).click()
    await expect(page.locator('[data-sl-done]')).toHaveText('0')
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).not.toBeChecked()
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await preview(page)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await soul(page, 'Pikopi').locator('label').click()
      await stageButton(page, /Etapa 2/).click()
      // Arriba, en reposo: lo que el clic dejó bajo la cabecera fija no cuenta como tapado.
      await page.evaluate(() => window.scrollTo(0, 0))
      await settled(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
