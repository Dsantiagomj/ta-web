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
    // Los diez de Ocre de ámbar: los de la guía previa y los de la sembrada, en ese orden.
    const tasks = group('Combates y mazmorras').getByRole('listitem')
    await expect(tasks).toHaveText([
      '6 × Combates solitarios',
      '1 × Mazmorra de Grunob',
      '2 × Combate realizable en grupo',
      '1 × Combate de oleadas realizable en grupo',
      '1 × Mazmorra Kodámade',
      '1 × Combate táctico solitario',
      '1 × Combate solitario',
      '1 × Combate (solo)',
      '1 × Mazmorra Kumijo',
      'Mazmorras nivel 200',
    ])
    const task = (label: string) => tasks.filter({ hasText: label })
    await expect(task('Combate (solo)').locator('img')).toHaveAttribute(
      'src',
      '/img/game/combate.webp',
    )
    // La mazmorra casada con su jefe, importado a Media; la que no nombra ninguna, el icono
    // genérico de mazmorra.
    await expect(task('Mazmorra Kumijo').locator('img')).toHaveAttribute(
      'src',
      /\/api\/media\/file\//,
    )
    expect(
      await task('Mazmorra Kumijo')
        .locator('img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0)
    await expect(task('Mazmorras nivel 200').locator('img')).toHaveAttribute(
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
            top: Math.round(g.getBoundingClientRect().top),
            bottom: Math.round(g.getBoundingClientRect().bottom),
            // Entre filas seguidas de una misma columna.
            gaps: rows
              .slice(1)
              .filter(
                (row, i) =>
                  row.getBoundingClientRect().left === rows[i]!.getBoundingClientRect().left,
              )
              .map((row) => {
                const previous = rows[rows.indexOf(row) - 1]!
                return Math.round(
                  row.getBoundingClientRect().top - previous.getBoundingClientRect().bottom,
                )
              }),
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
              const box = row.getBoundingClientRect()
              return {
                label: text.textContent!.replace(/\s+/g, ' ').trim(),
                top: Math.round(box.top),
                left: Math.round(box.left),
                right: Math.round(box.right),
                // Desde el borde de su columna: el de la fila, que en Otros es el del grupo.
                textLeft: Math.round(text.getBoundingClientRect().x - box.x) + 0,
                groupLeft: Math.round(box.x - left) + 0,
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
    expect(otros!.rows[0]!.groupLeft).toBe(0)
    await expect(group('Otros').locator('.well')).toHaveCount(0)
    const delicia = otros!.rows[1]!
    expect(delicia.lines).toBeGreaterThan(1)
    // Las líneas de la nota empiezan todas en el mismo sitio: el de «12 ×».
    expect(delicia.lineLefts).toBe(1)
    const gaps = [objetos!, tareas!, otros!].flatMap((g) => g.gaps)
    expect(new Set(gaps).size).toBe(1)

    // Los grupos, cada título en una línea; y las etiquetas cortas, también.
    const headingsOnOneLine = async () => {
      const headings = await needs
        .locator('.lneeds__k')
        .evaluateAll((hs) =>
          hs.map(
            (h) => h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight),
          ),
        )
      for (const lines of headings) expect(lines).toBeLessThan(1.5)
    }
    const shortLabelsOnOneLine = (rows: { label: string; lines: number }[]) => {
      for (const label of ['6 × Combates solitarios', '1 × Mazmorra de Grunob']) {
        expect(rows.find((row) => row.label === label)?.lines, label).toBe(1)
      }
    }
    // Los combates en dos columnas que se leen de arriba abajo: el sexto arriba de la
    // segunda, a la altura del primero.
    const tasksInColumns = (rows: { top: number; left: number; right: number }[], n: number) => {
      const [first, sixth, fifth] = [rows[0]!, rows[5]!, rows[4]!]
      if (n === 2) {
        expect(Math.abs(sixth.top - first.top)).toBeLessThan(2)
        expect(sixth.left).toBeGreaterThan(first.right)
        expect(new Set(rows.map((row) => row.left)).size).toBe(2)
      } else {
        expect(sixth.top).toBeGreaterThan(fifth.top)
        expect(new Set(rows.map((row) => row.left)).size).toBe(1)
      }
    }
    // La zona sale de la columna de lectura al ancho del sitio: los bordes de la cabecera.
    const wideZone = async (wide: boolean) => {
      const zone = (await needs.boundingBox())!
      const column = (await page.locator('section.lq').boundingBox())!
      const header = await page.locator('.site-hdr__in').evaluate((el) => {
        const box = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return {
          x: box.x + parseFloat(style.paddingLeft),
          width: box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        }
      })
      expect(Math.abs(zone.x - header.x)).toBeLessThan(1)
      expect(Math.abs(zone.width - header.width)).toBeLessThan(1)
      if (wide) expect(zone.width).toBeGreaterThan(column.width + 100)
      else expect(Math.abs(zone.width - column.width)).toBeLessThan(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      )
    }

    // A 1440 px: Objetos y los combates, en dos columnas, lado a lado, y Otros debajo de
    // los dos, en su propia fila. Ningún grupo mucho más alto que otro.
    await wideZone(true)
    await headingsOnOneLine()
    shortLabelsOnOneLine(tareas!.rows)
    tasksInColumns(tareas!.rows, 2)
    expect(Math.abs(objetos!.top - tareas!.top)).toBeLessThan(1)
    expect(otros!.top).toBeGreaterThanOrEqual(tareas!.bottom)
    expect(tareas!.bottom - tareas!.top).toBeLessThan(450)

    // A 1280 px, igual.
    await page.setViewportSize({ width: 1280, height: 900 })
    await wideZone(true)
    const [, tareas1280] = await layout()
    shortLabelsOnOneLine(tareas1280!.rows)
    tasksInColumns(tareas1280!.rows, 2)

    // A 1920 px, los tres grupos en una fila, los combates aún en dos columnas.
    await page.setViewportSize({ width: 1920, height: 900 })
    await wideZone(true)
    await headingsOnOneLine()
    const wide = await layout()
    expect(new Set(wide.map((g) => g.top)).size).toBe(1)
    shortLabelsOnOneLine(wide[1]!.rows)
    tasksInColumns(wide[1]!.rows, 2)

    // A 1024 px, la columna ya llena la ventana: los tres grupos en una fila, cada uno con
    // el ancho que pide (Otros, con la nota larga, más ancho que Objetos), y los combates
    // en una sola columna.
    await page.setViewportSize({ width: 1024, height: 900 })
    await wideZone(false)
    await headingsOnOneLine()
    const narrow = await layout()
    expect(new Set(narrow.map((g) => g.top)).size).toBe(1)
    expect(narrow[2]!.width).toBeGreaterThan(narrow[0]!.width)
    tasksInColumns(narrow[1]!.rows, 1)

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

  test('Necesitarás en total: el nombre que se copia no mueve nada al cargar la isla', async ({
    browser,
    baseURL,
  }) => {
    // Sin JavaScript el icono de copiar no se pinta, pero su sitio ya está: cuando la isla
    // convierte el nombre en botón, las filas de objetos miden lo mismo.
    const boxes = async (javaScriptEnabled: boolean) => {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        viewport: { width: 1440, height: 900 },
      })
      const page = await context.newPage()
      await page.goto(url)
      const list = page.getByRole('list', { name: 'Objetos' })
      if (javaScriptEnabled) {
        await expect(list.locator('.copyname[role="button"]').first()).toBeVisible()
      }
      const sizes = await list.locator('.lneeds__t').evaluateAll((spans) =>
        spans.map((span) => {
          const box = span.getBoundingClientRect()
          return [Math.round(box.width), Math.round(box.height)]
        }),
      )
      await context.close()
      return sizes
    }
    expect(await boxes(true)).toEqual(await boxes(false))
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
