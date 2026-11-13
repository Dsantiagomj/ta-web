import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'
import { seedGuide } from './seed/guides.ts'

// La página pública de un logro (DESIGN.md, Achievement page), sobre el logro que siembra
// scripts/seed-e2e.ts con las misiones de las guías de prueba.

const url = `/${logro.slug}`

test.describe('página de logro', () => {
  test('pinta las migas y la cabecera: Prerrequisitos y Recompensas, sin Necesitarás', async ({
    page,
  }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)

    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Metalogros' })).toHaveAttribute(
      'href',
      '/metalogros',
    )
    await expect(crumbs.getByRole('link', { name: logro.group.name })).toHaveAttribute(
      'href',
      '/metalogros#astrub',
    )
    // La página actual no está en las migas, sí en el JSON-LD.
    await expect(crumbs.getByText(logro.name)).toHaveCount(0)
    const jsonLd = JSON.parse((await crumbs.locator('script').textContent()) ?? '{}')
    expect(jsonLd.itemListElement.at(-1)).toMatchObject({ position: 3, name: logro.name })

    const header = page.locator('header.lhead')
    await expect(header.getByRole('heading', { level: 1, name: logro.name })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toHaveText(logro.meta)
    await expect(header.getByRole('heading', { name: 'Necesitarás en total' })).toHaveCount(0)
    await expect(header.getByRole('heading', { name: 'Recompensas del logro' })).toBeVisible()
    await expect(header.getByText(`${logro.reward.xp} XP`)).toBeVisible()
    // Las recompensas en una fila, a todo el ancho de la banda aunque vayan solas.
    await page.setViewportSize({ width: 1440, height: 900 })
    const rows = header.locator('.qhead__rew > li')
    const [xp, kamas] = [(await rows.nth(0).boundingBox())!, (await rows.nth(1).boundingBox())!]
    expect(Math.abs(xp.y - kamas.y)).toBeLessThan(1)
  })

  test('Necesitarás en total: su zona, con Objetos, Combates y mazmorras, y Otros', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás en total' })
    // Bajo la cabecera, antes de las misiones.
    const header = (await page.locator('header.lhead').boundingBox())!
    expect((await needs.boundingBox())!.y).toBeGreaterThanOrEqual(header.y + header.height)
    const group = (name: string) => needs.getByRole('list', { name })
    await expect(needs.getByRole('heading', { level: 3 })).toHaveText([
      'Objetos',
      'Combates y mazmorras',
      'Otros',
    ])
    // Los objetos que enlazan las guías y el que nombra una nota, con su icono y su nombre
    // que se copia.
    for (const { name, quantity } of seedGuide.needsItems) {
      await expect(group('Objetos')).toContainText(`${quantity} × ${name}`)
      await expect(group('Objetos').getByRole('button', { name: `Copiar ${name}` })).toBeVisible()
    }
    await expect(group('Objetos')).toContainText('1 × Pico de tofu')
    await expect(group('Objetos').getByRole('listitem').last().locator('.well img')).toHaveCount(1)
    const tasks = group('Combates y mazmorras').getByRole('listitem')
    await expect(tasks).toHaveText([
      '1 × Combate (solo)',
      '1 × Mazmorra Kumijo',
      'Mazmorras nivel 200',
    ])
    await expect(tasks.nth(0).locator('img')).toHaveAttribute('src', '/img/game/combate.webp')
    // La mazmorra casada con su jefe, importado a Media; la que no nombra ninguna, el icono
    // genérico de mazmorra.
    await expect(tasks.nth(1).locator('img')).toHaveAttribute('src', /\/api\/media\/file\//)
    expect(
      await tasks
        .nth(1)
        .locator('img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0)
    await expect(tasks.nth(2).locator('img')).toHaveAttribute(
      'src',
      '/img/game/jefes/crunchidor.webp',
    )
    // Lo que no es objeto ni combate sale tal cual: nada de lo que Torre escribe se pierde.
    const others = group('Otros').getByRole('listitem')
    await expect(others).toHaveText([
      'Hechizo Captura de almas',
      /^12 × Delicia de los kitsus \(un consumible/,
    ])

    // Cada fila: el hueco a la altura de la primera línea del texto; sin hueco (Otros), el
    // texto empieza en el borde del grupo, sin dejar el sitio del hueco vacío. Una línea que
    // no cabe sigue debajo de la cantidad. Las filas, a la misma distancia.
    const layout = () =>
      needs.locator('.lneeds__g').evaluateAll((groups) =>
        groups.map((g) => {
          const style = getComputedStyle(g)
          const left =
            g.getBoundingClientRect().x +
            parseFloat(style.paddingLeft) +
            parseFloat(style.borderLeftWidth)
          const rows = [...g.querySelectorAll('li')]
          return {
            width: g.getBoundingClientRect().width,
            gaps: rows
              .slice(1)
              .map((row, i) =>
                Math.round(
                  row.getBoundingClientRect().top - rows[i]!.getBoundingClientRect().bottom,
                ),
              ),
            rows: rows.map((row) => {
              const text = row.querySelector('.lneeds__t')!
              const range = document.createRange()
              range.selectNodeContents(text)
              const lines = [...range.getClientRects()].filter((r) => r.width > 0)
              const well = row.querySelector('.well')?.getBoundingClientRect()
              const first = lines[0]!
              // El borde izquierdo de cada línea: el más a la izquierda de sus trozos.
              const starts = new Map<number, number>()
              for (const r of lines) {
                const top = Math.round(r.top)
                starts.set(top, Math.min(starts.get(top) ?? Infinity, Math.round(r.left)))
              }
              return {
                textLeft: Math.round(text.getBoundingClientRect().x - left) + 0,
                wellOffset: well
                  ? Math.abs(first.top + first.height / 2 - (well.top + well.height / 2))
                  : null,
                lineLefts: new Set(starts.values()).size,
                lines: starts.size,
              }
            }),
          }
        }),
      )
    const [objetos, tareas, otros] = await layout()
    for (const row of [...objetos!.rows, ...tareas!.rows]) {
      expect(row.wellOffset).toBeLessThan(2)
    }
    expect(new Set([...objetos!.rows, ...tareas!.rows].map((row) => row.textLeft)).size).toBe(1)
    expect(otros!.rows.map((row) => row.textLeft)).toEqual([0, 0])
    await expect(group('Otros').locator('.well')).toHaveCount(0)
    const delicia = otros!.rows[1]!
    expect(delicia.lines).toBeGreaterThan(1)
    // Las líneas de la nota empiezan todas en el mismo sitio: el de «12 ×».
    expect(delicia.lineLefts).toBe(1)
    const gaps = [objetos!, tareas!, otros!].flatMap((g) => g.gaps)
    expect(new Set(gaps).size).toBe(1)

    // En el escritorio, los tres grupos en una fila, cada uno con el ancho que pide: Otros,
    // con la nota larga, más ancho que Objetos, y cada título en una línea.
    const oneRow = async () => {
      const tops = await needs
        .locator('.lneeds__g')
        .evaluateAll((groups) => groups.map((g) => Math.round(g.getBoundingClientRect().y)))
      expect(new Set(tops).size).toBe(1)
      const headings = await needs
        .locator('.lneeds__k')
        .evaluateAll((hs) =>
          hs.map(
            (h) => h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight),
          ),
        )
      for (const lines of headings) expect(lines).toBeLessThan(1.5)
    }
    await oneRow()
    expect(otros!.width).toBeGreaterThan(objetos!.width)

    // A 1024 px, también en una fila.
    await page.setViewportSize({ width: 1024, height: 900 })
    await oneRow()

    // En el móvil, uno debajo de otro y sin scroll horizontal.
    await page.setViewportSize({ width: 390, height: 844 })
    const stacked = await needs
      .locator('.lneeds__g')
      .evaluateAll((groups) => groups.map((g) => Math.round(g.getBoundingClientRect().y)))
    expect(stacked).toEqual([...stacked].sort((a, b) => a - b))
    expect(new Set(stacked).size).toBe(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    for (const row of (await layout()).flatMap((g) => g.rows)) {
      if (row.wellOffset !== null) expect(row.wellOffset).toBeLessThan(2)
    }
  })

  test('las misiones en orden: las de guía publicada abren la guía; la del borrador, no', async ({
    page,
  }) => {
    await page.goto(url)
    const cards = page.getByRole('region', { name: 'Las misiones, en orden' }).getByRole('listitem')
    await expect(cards).toHaveCount(3)
    // Numeradas: el número en su círculo; el nivel sin «Misión 1 - ».
    await expect(cards.locator('.lq__n')).toHaveText(['1', '2', '3'])
    for (const [index, quest] of logro.quests.entries()) {
      const card = cards.nth(index)
      await expect(card.getByText(quest.kicker)).toBeVisible()
      if (quest.href) {
        await expect(card.getByRole('link', { name: quest.title })).toHaveAttribute(
          'href',
          quest.href,
        )
      } else {
        await expect(card.getByText(quest.title)).toBeVisible()
        await expect(card.getByRole('link')).toHaveCount(0)
      }
    }
    // Toda la fila abre la guía: también el número en su círculo y la línea que los une.
    // El clic va a la fila, en el centro del círculo y sobre la línea, como el del ratón.
    const spots = await cards.nth(1).evaluate((row) => {
      const box = row.getBoundingClientRect()
      const circle = row.querySelector('.lq__n')!.getBoundingClientRect()
      const x = circle.x + circle.width / 2 - box.x
      return [
        { x, y: circle.y + circle.height / 2 - box.y },
        { x, y: (circle.y - box.y) / 2 },
      ]
    })
    for (const position of spots) {
      await cards.nth(1).click({ position })
      await expect(page).toHaveURL(/\/seis-pies-bajo-tierra$/)
      await page.goBack()
    }
  })

  test('una sola columna: sin la lista lateral del metalogro; Cuenta para y el anterior y el siguiente en ella', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(page.getByRole('complementary')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: `Metalogro ${logro.group.name}` })).toHaveCount(
      0,
    )

    const article = page.locator('#contenido article')
    await expect(article.getByRole('heading', { name: 'Cuenta para' })).toBeVisible()
    await expect(article.getByText(logro.countsFor.name)).toBeVisible()

    const nav = article.getByRole('navigation', { name: `Logros de ${logro.group.name}` })
    await expect(nav.getByRole('link', { name: new RegExp(logro.previous.name) })).toHaveAttribute(
      'href',
      `/${logro.previous.slug}`,
    )
    const off = nav.locator('[aria-disabled="true"]')
    await expect(off).toContainText(logro.next.name)
    await expect(off).toContainText('En preparación')

    // Centrada: el mismo margen a cada lado en el escritorio.
    await page.setViewportSize({ width: 1440, height: 900 })
    const box = (await article.boundingBox())!
    expect(Math.abs(box.x - (1440 - box.x - box.width))).toBeLessThan(24)
  })

  test('un logro En preparación no tiene página', async ({ page }) => {
    const response = await page.goto(`/${logro.next.slug}`)
    expect(response?.status()).toBe(404)
  })

  test('en el móvil, las migas son solo el padre directo como enlace de vuelta', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Metalogros' })).toBeHidden()
    const back = crumbs.getByRole('link', { name: logro.group.name })
    await expect(back).toBeVisible()
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
