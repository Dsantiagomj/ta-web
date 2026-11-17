import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { indexChecklists } from './seed/checklists-index.ts'
import { E2E_PANEL_USER_4 } from './seed/guides.ts'

// El Ocre, una checklist de almas, como queda en dev tras importarlo: la ficha publicada sigue
// En preparación (a Squarespace) y la vista previa del panel enseña el borrador de almas. Tres
// almas en dos etapas: Mob Lasponja (jefe, en el Castillo de Arena), Pikopi y Arakna Maja, con
// un nombre largo que la tarjeta corta. Las etapas (o las regiones) van al lado y se ve una.

const ocre = indexChecklists.legacy
const souls = indexChecklists.souls
const ARAKNA = souls.monsters[2].name

// Su propia cuenta: cada inicio de sesión reescribe las sesiones de la cuenta, y otra spec que
// entre a la vez con la misma puede borrar la suya (seed/guides.ts).
async function preview(page: Page, hash = '') {
  const login = await page.request.post('/api/users/login', { data: E2E_PANEL_USER_4 })
  expect(login.ok()).toBe(true)
  await page.goto(`/vista-previa?slug=${ocre.slug}`)
  await expect(page).toHaveURL(new RegExp(`/${ocre.slug}(#.*)?$`))
  // Un enlace con lo elegido se abre de cero, como lo abre quien lo recibe: ir a la dirección
  // con otro # desde la misma página no recarga, y el router de Next, que aún no ha arrancado,
  // la cambiaría por la suya.
  if (hash) {
    await page.goto('about:blank')
    await page.goto(`/${ocre.slug}${hash}`)
  }
  // La isla está lista cuando suelta las casillas.
  await expect(page.locator('[data-sl-own]').first()).toBeEnabled()
}

// Cada alma sale en las dos vistas (por etapa y por región): se mira la que se ve.
const soul = (page: Page, name: string) =>
  page.locator('[data-sl-panel]:visible .sl-soul:visible', { hasText: name })
const visibleNames = (page: Page) =>
  page.locator('[data-sl-panel]:visible .sl-soul:visible .sl-soul__n').allTextContents()
const panel = (page: Page) => page.locator('[data-sl-panel]:visible')
const typeButton = (page: Page, name: RegExp) =>
  page.getByRole('group', { name: 'Tipo de alma' }).getByRole('button', { name })
// Exacto: «Otras etapas» (anterior y siguiente) también contiene «etapas».
const nav = (page: Page, name: 'Etapas' | 'Regiones') =>
  page.getByRole('navigation', { name, exact: true })
const stageButton = (page: Page, name: RegExp) => nav(page, 'Etapas').getByRole('button', { name })
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      // Sin los bucles infinitos del ambiente (DESIGN.md, Ambience), que nunca acaban.
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .every((a) => a.playState !== 'running'),
  )
const hash = (page: Page) => page.evaluate(() => decodeURIComponent(location.hash))

test.describe('el Ocre en la vista previa', () => {
  test('sin sesión, la ficha En preparación sigue llevando a Squarespace', async ({ request }) => {
    const response = await request.get(`/${ocre.slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(ocre.legacyHref)
  })

  test('una etapa a la vez: su título, lo que se tiene, el anillo y sus almas', async ({
    page,
  }) => {
    await preview(page)
    await expect(page.getByRole('heading', { level: 1, name: ocre.name })).toBeVisible()
    await expect(page.getByText(souls.intro)).toBeVisible()
    await expect(panel(page)).toHaveCount(1)
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Etapa 1 · Jefes')
    await expect(panel(page).locator('[data-sl-sum]')).toHaveText('0 de 1 almas')
    await expect(panel(page).locator('[data-sl-ring]')).toHaveText('0 %')
    expect(await visibleNames(page)).toEqual(['Mob Lasponja'])
    // El jefe al nivel de su mazmorra (25), no al de su grado más alto; primero, dónde se lucha.
    await expect(soul(page, 'Mob Lasponja')).toContainText('Castillo de Arena · Nv. 20')
    await expect(stageButton(page, /Etapa 1/)).toHaveAttribute('aria-current', 'true')
    await expect(stageButton(page, /Etapa 1/)).toContainText('0/1')
    await expect(stageButton(page, /Etapa 2/)).toContainText('0/2')
    // Sin etiqueta de jefe o archi: el tipo solo filtra.
    await expect(panel(page).locator('.sl-soul')).not.toContainText(/\b(Jefe|Archi)\b/)
  })

  test('anterior y siguiente, y la etapa elegida en la dirección, que sobrevive a recargar', async ({
    page,
  }) => {
    await preview(page)
    const pager = page.getByRole('navigation', { name: 'Otras etapas' })
    await expect(pager.getByRole('button', { name: /Anterior/ })).toBeHidden()
    await pager.getByRole('button', { name: /Siguiente.*Etapa 2 · Archis/ }).click()
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Etapa 2 · Archis')
    expect(await visibleNames(page)).toEqual(['Pikopi', ARAKNA])
    await expect(pager.getByRole('button', { name: /Siguiente/ })).toBeHidden()
    expect(await hash(page)).toBe('#etapa=2')
    await page.reload()
    await expect(page.locator('[data-sl-own]').first()).toBeEnabled()
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Etapa 2 · Archis')
    await pager.getByRole('button', { name: /Anterior.*Etapa 1 · Jefes/ }).click()
    expect(await visibleNames(page)).toEqual(['Mob Lasponja'])
  })

  test('el tipo cambia la lista de etapas y lo que cuenta cada una', async ({ page }) => {
    await preview(page)
    await typeButton(page, /^Archis/).click()
    await expect(nav(page, 'Etapas').getByRole('button')).toHaveText([/Etapa 2.*0\/2/])
    // La etapa elegida ya no se ve: se pasa a la primera que queda.
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Etapa 2 · Archis')
    expect(await hash(page)).toBe('#etapa=2&tipo=archis')
    await typeButton(page, /^Todas/).click()
    await expect(nav(page, 'Etapas').getByRole('button')).toHaveCount(2)
  })

  test('por región, agrupada por mazmorra y subzona, y un enlace directo', async ({ page }) => {
    await preview(page, '#region=Astrub')
    await expect(page.getByRole('button', { name: 'Por región' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(nav(page, 'Regiones').getByRole('button')).toHaveText([
      /Astrub.*0\/2/,
      /Amakna.*0\/1/,
    ])
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Astrub')
    await expect(panel(page).locator('.sl-sub:visible .sl-sh')).toHaveText([
      'Castillo de Arena 0/1',
      'Playa de Arena 0/1',
    ])
    await typeButton(page, /^Archis/).click()
    await expect(panel(page).locator('.sl-sub:visible .sl-sh')).toHaveText(['Playa de Arena 0/1'])
    await expect(panel(page).locator('[data-sl-sum]')).toHaveText('0 de 1 almas')
    expect(await hash(page)).toBe('#region=Astrub&tipo=archis')

    await nav(page, 'Regiones')
      .getByRole('button', { name: /Amakna/ })
      .click()
    expect(await visibleNames(page)).toEqual(['Pikopi'])
    expect(await hash(page)).toBe('#region=Amakna&tipo=archis')
  })

  test('marcar un alma cuenta en el porcentaje, en su etapa y en el anillo, y se guarda', async ({
    page,
  }) => {
    await preview(page, '#etapa=2')
    await soul(page, 'Pikopi').locator('label').click()
    await expect(page.locator('[data-sl-pct]')).toHaveText('33,3 %')
    await expect(page.locator('[data-sl-done]')).toHaveText('1')
    await expect(panel(page).locator('[data-sl-sum]')).toHaveText('1 de 2 almas')
    await expect(panel(page).locator('[data-sl-ring]')).toHaveText('50 %')
    await expect(stageButton(page, /Etapa 2/)).toContainText('1/2')
    await page.reload()
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).toBeChecked()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress')!))
    expect(Object.keys(stored.souls)).toEqual(['991602'])
  })

  test('el botón de copiar copia el nombre y no marca el alma', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await preview(page, '#etapa=2')
    await soul(page, 'Pikopi').getByRole('button', { name: 'Copiar «Pikopi»' }).click()
    await expect(page.locator('[data-ck-toast]')).toHaveText('Copiado: Pikopi')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Pikopi')
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).not.toBeChecked()
    // Tocar la tarjeta, en cambio, la marca.
    await soul(page, 'Pikopi').locator('.sl-soul__n').click()
    await expect(soul(page, 'Pikopi').locator('[data-sl-own]')).toBeChecked()
  })

  test('el buscador busca en todas las almas y las enseña bajo su etapa', async ({ page }) => {
    await preview(page)
    const search = page.getByRole('searchbox')
    await expect(search).toHaveAttribute('placeholder', 'Alma, mazmorra, zona, región o nivel')
    await search.fill('arena')
    // Encima de las etapas que coinciden, en la columna del panel: la lista sigue arriba.
    const results = page.locator('[data-sl-results]:visible')
    await expect(results).toContainText('Resultados de «arena»')
    await expect(results).toContainText('2 almas')
    const [side, header] = [
      (await nav(page, 'Etapas').boundingBox())!,
      (await results.boundingBox())!,
    ]
    expect(side.y).toBeLessThanOrEqual(header.y + 1)
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText([
      'Etapa 1 · Jefes',
      'Etapa 2 · Archis',
    ])
    expect(await visibleNames(page)).toEqual(['Mob Lasponja', ARAKNA])
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
    await search.fill('')
    await expect(page.locator('[data-sl-results]:visible')).toHaveCount(0)
    await expect(panel(page)).toHaveCount(1)
  })

  test('«Ocultar las que tengo» las quita con su animación y dice si la etapa está completa', async ({
    page,
  }) => {
    await preview(page, '#etapa=2')
    await soul(page, ARAKNA).locator('label').click()
    await page.getByRole('checkbox', { name: 'Ocultar las que tengo' }).check()
    // Se va con una animación (opacidad y escala), no de golpe.
    await expect(page.locator('[data-sl-panel]:visible .sl-soul[data-leave]')).toHaveCount(1)
    await expect.poll(() => visibleNames(page)).toEqual(['Pikopi'])
    // Marcar con la casilla puesta: el alma se queda un momento y se va.
    await soul(page, 'Pikopi').locator('label').click()
    await expect.poll(() => visibleNames(page)).toEqual([])
    await expect(page.locator('[data-sl-empty]:visible')).toHaveText(
      'Ya tienes todas las almas de la etapa 2.',
    )
  })

  test('en el escritorio las etapas van al lado de la etapa elegida', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await preview(page)
    const [side, main] = [
      (await nav(page, 'Etapas').boundingBox())!,
      (await panel(page).boundingBox())!,
    ]
    expect(side.x + side.width).toBeLessThanOrEqual(main.x)
    await expect(nav(page, 'Etapas').getByRole('heading', { name: 'Etapas' })).toBeVisible()
  })

  test('en el móvil las etapas son una fila encima de la etapa, sin desbordar la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await preview(page)
    const chips = nav(page, 'Etapas').getByRole('button')
    await expect(chips).toHaveCount(2)
    const tops = await chips.evaluateAll((all) => all.map((el) => el.getBoundingClientRect().top))
    expect(new Set(tops).size).toBe(1)
    const row = (await nav(page, 'Etapas').boundingBox())!
    const main = (await panel(page).boundingBox())!
    expect(row.y + row.height).toBeLessThanOrEqual(main.y)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    // Con 18 etapas la fila se desliza: el texto para lectores de pantalla de cada botón tiene
    // que quedarse dentro de la fila, o ensancha la página (aquí, con dos, aún cabe todo).
    const escaped = await page
      .locator('.sl-nav .sr-only')
      .evaluateAll(
        (all) =>
          all.filter((el) => !el.closest('.sl-nav')!.contains((el as HTMLElement).offsetParent))
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
    test(`a ${width}px las tarjetas miden lo mismo, copiar y marcar van en las esquinas`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await preview(page, '#etapa=2')
      const cards = page.locator('[data-sl-panel]:visible .sl-soul__b')
      const heights = await cards.evaluateAll((all) =>
        all.map((el) => (el as HTMLElement).offsetHeight),
      )
      expect(new Set(heights).size).toBe(1)
      // Copiar arriba a la izquierda y la casilla arriba a la derecha, dentro de la tarjeta.
      const corners = await page.locator('[data-sl-panel]:visible .sl-soul').evaluateAll((all) =>
        all.map((li) => {
          const card = li.querySelector('.sl-soul__b')!.getBoundingClientRect()
          const copy = li.querySelector('.sl-soul__copy')!.getBoundingClientRect()
          const box = li.querySelector('.sl-soul__chk')!.getBoundingClientRect()
          const half = card.left + card.width / 2
          return (
            copy.left >= card.left &&
            copy.right < half &&
            box.left > half &&
            box.right <= card.right &&
            copy.top < card.top + card.height / 4 &&
            box.top < card.top + card.height / 4
          )
        }),
      )
      expect(corners.every(Boolean)).toBe(true)
      // La imagen, grande: más de la mitad del ancho que queda de texto en una fila de antes.
      const image = await soul(page, 'Pikopi')
        .locator('.sl-soul__img')
        .evaluate((el) => el.getBoundingClientRect().width)
      expect(image).toBeGreaterThanOrEqual(80)
      const name = soul(page, ARAKNA).locator('.sl-soul__n')
      const lines = await name.evaluate((el) => {
        const { lineHeight } = getComputedStyle(el)
        return el.clientHeight / parseFloat(lineHeight)
      })
      expect(Math.round(lines)).toBe(2)
      // Entero en la casilla y al pasar el ratón.
      await expect(soul(page, ARAKNA).locator('[data-sl-own]')).toHaveAttribute(
        'aria-label',
        `${ARAKNA}, Playa de Arena · Nv. 13`,
      )
      await expect(name).toHaveAttribute('title', ARAKNA)
    })
  }

  test('cambiar de etapa se anima; marcar anima el alma sin mover nada y completar la celebra', async ({
    page,
  }) => {
    await preview(page, '#etapa=2')
    await stageButton(page, /Etapa 1/).click()
    await expect(panel(page)).toHaveAttribute('data-enter', 'prev')
    await settled(page)
    await expect(panel(page)).not.toHaveAttribute('data-enter')
    const layout = () =>
      page
        .locator('[data-sl-panel]:visible .sl-soul, [data-sl-panel]:visible .sl-ph')
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
    await expect(panel(page)).toHaveAttribute('data-complete', '')
    await expect(stageButton(page, /Etapa 1/)).toHaveAttribute('data-complete', '')
    await settled(page)
    await expect(soul(page, 'Mob Lasponja')).not.toHaveAttribute('data-just')
    await expect(panel(page)).not.toHaveAttribute('data-cheer')
    expect(await layout()).toEqual(before)
  })

  test('con todas lo celebra; al cambiar de vista nada destella a destiempo', async ({ page }) => {
    await preview(page)
    await soul(page, 'Mob Lasponja').locator('label').click()
    await stageButton(page, /Etapa 2/).click()
    for (const name of ['Pikopi', ARAKNA]) await soul(page, name).locator('label').click()
    await expect(page.locator('[data-ck-toast]')).toHaveText('¡Tienes todas las almas!')
    await settled(page)
    await page.getByRole('button', { name: 'Por región' }).click()
    await expect(page.locator('[data-sl-view="region"] [data-just]')).toHaveCount(0)
    await expect(page.locator('[data-sl-view="region"] [data-cheer]')).toHaveCount(0)
  })

  test('con movimiento reducido no se anima nada', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await preview(page)
    await stageButton(page, /Etapa 2/).click()
    await stageButton(page, /Etapa 1/).click()
    await soul(page, 'Mob Lasponja').locator('label').click()
    await page.getByRole('checkbox', { name: 'Ocultar las que tengo' }).check()
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a.effect?.getComputedTiming().duration as number) > 1).length,
    )
    expect(running).toBe(0)
    await expect(page.locator('[data-ck-toast]')).toHaveText('¡Etapa 1 completa!')
    await expect(page.locator('[data-sl-empty]:visible')).toHaveText(
      'Ya tienes todas las almas de la etapa 1.',
    )
  })

  test('las almas de la checklist antigua («cosecha:done») se traen una vez', async ({ page }) => {
    await preview(page, '#etapa=2')
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
    await preview(page, '#etapa=2')
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
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}, por etapa, por región y buscando`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await preview(page)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const axe = async (where: string) => {
        // Arriba, en reposo: lo que un clic dejó bajo la cabecera fija no cuenta como tapado.
        await page.evaluate(() => window.scrollTo(0, 0))
        await settled(page)
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(
          results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
          where,
        ).toEqual([])
      }
      await stageButton(page, /Etapa 2/).click()
      await soul(page, 'Pikopi').locator('label').click()
      await axe('por etapa')
      await page.getByRole('button', { name: 'Por región' }).click()
      await axe('por región')
      await page.getByRole('searchbox').fill('arena')
      await axe('buscando')
    })
  }
})

test('a 390px la fila de etapas llega al borde de la ventana, sin cortarse en el relleno', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await preview(page)
  const [row, win] = await page
    .locator('.sl-nav__l:visible')
    .evaluate((list) => [
      list.getBoundingClientRect().right,
      list.closest('.ck-win')!.getBoundingClientRect().right,
    ])
  // Hasta el borde de la ventana (su filete de 1px), no 0,75rem antes.
  expect(win - row).toBeLessThanOrEqual(1.5)
})
