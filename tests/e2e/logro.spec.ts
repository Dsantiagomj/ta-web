import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { seedAchievement as logro } from './seed/achievements.ts'
import { outsidePrerequisite, seedGuide } from './seed/guides.ts'

// La página pública de un logro (DESIGN.md, Achievement page), sobre el logro que siembra
// scripts/seed-e2e.ts con las misiones de las guías de prueba.

const url = `/${logro.slug}`

test.describe('página de logro', () => {
  test('pinta las migas y la cabecera, con la ficha al lado de las misiones en el escritorio', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
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

    // La cabecera: el icono, el título y el subtítulo; lo demás va en la ficha.
    const header = page.locator('header.lhead')
    await expect(header.getByRole('heading', { level: 1, name: logro.name })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toHaveText(logro.meta)
    await expect(header.getByRole('heading', { level: 2 })).toHaveCount(0)

    const rewards = page.getByRole('region', { name: 'Recompensas del logro' })
    const prerequisites = page.getByRole('region', { name: 'Prerrequisitos' })
    const needs = page.getByRole('region', { name: 'Necesitarás en total' })
    const quests = page.getByRole('region', { name: 'Las misiones, en orden' })
    await expect(rewards.getByText(`${logro.reward.xp} XP`)).toBeVisible()
    await expect(rewards.getByText(`${logro.reward.kamas} kamas`)).toBeVisible()
    // La previa de fuera del logro, sin guía: texto, no enlace.
    await expect(prerequisites.getByText(outsidePrerequisite.title)).toBeVisible()
    await expect(prerequisites.getByRole('link')).toHaveCount(0)
    await expect(needs.getByRole('list', { name: 'Objetos' })).toBeVisible()

    // La ficha, a la derecha de las misiones y a la altura de las migas: las misiones van
    // justo debajo del título, sin nada encima.
    const top = async (locator: typeof needs) => (await locator.boundingBox())!.y
    const beside = async () => {
      const sheet = (await page.locator('.lsheet').boundingBox())!
      const list = (await quests.boundingBox())!
      expect(sheet.x).toBeGreaterThanOrEqual(list.x + list.width)
      expect(Math.abs(sheet.y - (await top(crumbs)))).toBeLessThan(2)
      // Lo que sigue a la cabecera (la entrada de Torre, aquí; sin ella, las misiones).
      const body = page.locator('.logro__body')
      expect((await top(body)) - (await top(crumbs))).toBeLessThan(230)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      )
    }
    await beside()
    // En la columna, Prerrequisitos y Necesitarás en total primero; las recompensas, al final.
    const tops = await Promise.all([prerequisites, needs, rewards].map(top))
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    await page.setViewportSize({ width: 1024, height: 768 })
    await beside()

    // Abierta y quieta: pulsar su título no la pliega, y dice que está abierta.
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const part of [prerequisites, needs]) {
      await expect(part.locator('details')).toHaveAttribute('open', '')
      await part.locator('summary').click()
      await expect(part.locator('details')).toHaveAttribute('open', '')
      await expect(part.getByRole('list').first()).toBeVisible()
    }
  })

  test('en el móvil y la tableta: Prerrequisitos y Necesitarás en total plegados, las recompensas al final y a la vista', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    const header = page.locator('header.lhead')
    const rewards = page.getByRole('region', { name: 'Recompensas del logro' })
    const prerequisites = page.getByRole('region', { name: 'Prerrequisitos' })
    const needs = page.getByRole('region', { name: 'Necesitarás en total' })
    const quests = page.getByRole('region', { name: 'Las misiones, en orden' })
    const prerequisite = prerequisites.getByText(outsidePrerequisite.title)
    const items = needs.getByRole('list', { name: 'Objetos' })

    await expect(rewards.getByText(`${logro.reward.xp} XP`)).toBeVisible()
    await expect(prerequisites.getByRole('heading', { name: 'Prerrequisitos' })).toBeVisible()
    await expect(needs.getByRole('heading', { name: 'Necesitarás en total' })).toBeVisible()
    await expect(prerequisite).toBeHidden()
    await expect(items).toBeHidden()

    // Las recompensas en una fila (en la columna del escritorio, de 20rem, se parten).
    const rows = rewards.locator('.lsheet__rew > li')
    const [xp, kamas] = [(await rows.nth(0).boundingBox())!, (await rows.nth(1).boundingBox())!]
    expect(Math.abs(xp.y - kamas.y)).toBeLessThan(1)

    // De arriba abajo: la cabecera, las dos filas, las recompensas, la entrada de Torre y
    // las misiones.
    const y = async (locator: typeof needs) => (await locator.boundingBox())!.y
    const heading = quests.getByRole('heading', { level: 2 })
    const order = [header, prerequisites, needs, rewards, page.getByText(logro.intro), heading]
    const tops = await Promise.all(order.map(y))
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    expect((await y(page.locator('.logro__body'))) - (await y(crumbs))).toBeLessThan(470)

    // Una fila se abre y se cierra al pulsarla, con su chevron.
    await prerequisites.locator('summary').click()
    await expect(prerequisite).toBeVisible()
    await prerequisites.locator('summary').click()
    await expect(prerequisite).toBeHidden()

    // Abierta, Necesitarás en total va en una columna, sin scroll horizontal.
    await needs.locator('summary').click()
    await expect(items).toBeVisible()
    const stacked = await needs
      .locator('.lneeds__g')
      .evaluateAll((groups) => groups.map((g) => Math.round(g.getBoundingClientRect().y)))
    expect(stacked).toEqual([...stacked].sort((a, b) => a - b))
    expect(new Set(stacked).size).toBe(3)
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      )
    }

    // En la tableta, igual de plegada; abierta, una lista larga (los diez combates) se
    // reparte en dos columnas que se leen de arriba abajo.
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(url)
    await expect(items).toBeHidden()
    await needs.locator('summary').click()
    const tasks = needs.getByRole('list', { name: 'Combates y mazmorras' }).getByRole('listitem')
    await expect(tasks.first()).toBeVisible()
    const boxes = await tasks.evaluateAll((rows) =>
      rows.map((row) => {
        const box = row.getBoundingClientRect()
        return { left: Math.round(box.left), top: Math.round(box.top) }
      }),
    )
    expect(new Set(boxes.map((box) => box.left)).size).toBe(2)
    expect(boxes[1]!.top).toBeGreaterThan(boxes[0]!.top)
    expect(boxes.at(-1)!.left).toBeGreaterThan(boxes[0]!.left)
  })

  test('la ficha sin JavaScript: abierta en el escritorio, plegable en el móvil', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás en total' })
    const items = needs.getByRole('list', { name: 'Objetos' })
    await expect(items).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(items).toBeHidden()
    await needs.locator('summary').click()
    await expect(items).toBeVisible()
    await context.close()
  })

  test('las filas plegables se abren con movimiento, y sin él con movimiento reducido', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const duration = () =>
      page
        .getByRole('region', { name: 'Necesitarás en total' })
        .locator('details')
        .evaluate((details) => getComputedStyle(details, '::details-content').transitionDuration)
    await page.goto(url)
    expect(await duration()).not.toMatch(/^0s(, 0s)*$/)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await duration()).toMatch(/^0s(, 0s)*$/)
  })

  test('Necesitarás en total: Objetos, Combates y mazmorras, y Otros en una línea debajo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás en total' })
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
    await expect(group('Otros').locator('.well')).toHaveCount(0)

    // Las listas una debajo de otra en la columna de la ficha; cada fila con su hueco a la
    // altura de la primera línea del texto, el texto de todas en el mismo sitio y las filas
    // a la misma distancia.
    const layout = await needs.locator('.lneeds__g').evaluateAll((groups) =>
      groups.map((g) => {
        const rows = [...g.querySelectorAll('li')]
        return {
          top: Math.round(g.getBoundingClientRect().top),
          bottom: Math.round(g.getBoundingClientRect().bottom),
          gaps: rows
            .slice(1)
            .map((row, i) =>
              Math.round(row.getBoundingClientRect().top - rows[i]!.getBoundingClientRect().bottom),
            ),
          rows: rows.map((row) => {
            const text = row.querySelector('.lneeds__t')!
            const range = document.createRange()
            range.selectNodeContents(text)
            const first = [...range.getClientRects()].find((r) => r.width > 0)!
            const well = row.querySelector('.well')?.getBoundingClientRect()
            return {
              textLeft: Math.round(text.getBoundingClientRect().x - row.getBoundingClientRect().x),
              wellOffset: well
                ? Math.abs(first.top + first.height / 2 - (well.top + well.height / 2))
                : null,
            }
          }),
        }
      }),
    )
    const [objetos, tareas, otros] = layout as [
      (typeof layout)[0],
      (typeof layout)[0],
      (typeof layout)[0],
    ]
    expect(objetos.bottom).toBeLessThanOrEqual(tareas.top)
    expect(tareas.bottom).toBeLessThanOrEqual(otros.top)
    const icons = [...objetos.rows, ...tareas.rows]
    for (const row of icons) expect(row.wellOffset).toBeLessThan(2)
    expect(new Set(icons.map((row) => row.textLeft)).size).toBe(1)
    expect(new Set([...objetos.gaps, ...tareas.gaps]).size).toBe(1)

    // Otros es una sola línea de prosa: «Otros» y, a su lado, las notas una detrás de otra.
    const line = await needs.locator('.lneeds__g--others').evaluate((g) => {
      const heading = g.querySelector('h3')!.getBoundingClientRect()
      const notes = [...g.querySelectorAll('li')]
      const first = notes[0]!.getClientRects()[0]!
      return {
        sameLine: Math.abs(first.top + first.height / 2 - (heading.top + heading.height / 2)) < 4,
        after: first.left > heading.right,
        inline: notes.every((li) => getComputedStyle(li).display === 'inline'),
      }
    })
    expect(line).toEqual({ sameLine: true, after: true, inline: true })
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

  test('sin la lista del metalogro; Cuenta para y el anterior y el siguiente, en la columna de las misiones', async ({
    page,
  }) => {
    await page.goto(url)
    // La ficha del lado no es un complemento de la página: es del logro.
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

    // Centrada: el mismo margen a cada lado en el escritorio. Cuenta para y la navegación,
    // en la columna de las misiones, no bajo la ficha.
    await page.setViewportSize({ width: 1440, height: 900 })
    const box = (await article.boundingBox())!
    expect(Math.abs(box.x - (1440 - box.x - box.width))).toBeLessThan(24)
    const quests = (await page
      .getByRole('region', { name: 'Las misiones, en orden' })
      .boundingBox())!
    for (const part of [article.locator('section.lcuenta'), nav]) {
      const { x, width } = (await part.boundingBox())!
      expect(Math.abs(x - quests.x)).toBeLessThan(1)
      expect(Math.abs(width - quests.width)).toBeLessThan(1)
    }
  })

  // Opción D de Torre: cada misión, cada fila de Necesitarás y cada tarjeta lleva uno de los
  // ocho tonos en orden (--v); el número de la misión es un rombo lleno con la tinta de los tonos.
  test('las misiones en rombos de su tono y las tarjetas de anterior y siguiente con su borde', async ({
    page,
  }) => {
    await page.goto(url)
    const rgb = (hex: string) =>
      `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(', ')})`
    const token = (name: string) =>
      page.evaluate(
        (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
        name,
      )
    const numbers = page.locator('.lq__n')
    for (const [at, n] of [
      [0, 1],
      [1, 2],
    ] as const) {
      const diamond = await numbers.nth(at).evaluate((el) => {
        const s = getComputedStyle(el, '::before')
        return { fill: s.backgroundColor, rotate: s.rotate, ink: getComputedStyle(el).color }
      })
      expect(diamond).toEqual({
        fill: rgb(await token(`--color-hue-${n}`)),
        rotate: '45deg',
        ink: rgb(await token('--color-on-hue')),
      })
    }
    // Los títulos de la ficha, cada uno en el tono de su parte.
    const sheet = page.locator('.lsheet')
    for (const [name, n] of [
      ['Prerrequisitos', 5],
      ['Necesitarás en total', 1],
      ['Recompensas del logro', 2],
    ] as const) {
      await expect(sheet.getByRole('heading', { name, exact: true })).toHaveCSS(
        'color',
        rgb(await token(`--color-hue-${n}`)),
      )
    }
    const cards = page.locator('.lnav__card')
    await expect(cards.first()).toHaveCSS('border-top-width', '2px')
    await expect(cards.first()).toHaveCSS('border-top-color', rgb(await token('--color-hue-1')))
  })

  test('la prosa de Torre: la entrada antes de las misiones y el cierre con su vídeo en fachada', async ({
    page,
  }) => {
    // Nada de YouTube hasta pulsar: ni iframe, ni script, ni la miniatura de i.ytimg.com.
    const external: string[] = []
    page.on('request', (request) => {
      if (/youtube|ytimg/.test(new URL(request.url()).hostname)) external.push(request.url())
    })
    await page.route(/youtube-nocookie\.com/, (route) => route.abort())
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url)

    const intro = page.getByText(logro.intro)
    const before = page.getByText(logro.outro.before)
    const after = page.getByText(logro.outro.after)
    await expect(intro).toBeVisible()
    await expect(before).toBeVisible()
    const quests = page.getByRole('region', { name: 'Las misiones, en orden' })
    const header = page.locator('header.lhead')
    const y = async (locator: typeof intro) => (await locator.boundingBox())!.y
    // La cabecera, la entrada, las misiones, el cierre: el vídeo entre sus dos párrafos. La
    // ficha va al lado.
    const head = (await header.boundingBox())!
    expect(await y(intro)).toBeGreaterThanOrEqual(head.y + head.height)
    expect(await y(intro)).toBeLessThan(await y(quests))
    expect(await y(quests)).toBeLessThan(await y(before))

    const video = page.getByRole('link', { name: `Ver el vídeo: ${logro.video.title}` })
    await expect(video).toHaveAttribute('href', logro.video.url)
    expect(await y(before)).toBeLessThan(await y(video))
    expect(await y(video)).toBeLessThan(await y(after))
    // La portada es nuestra (Media) y se carga cuando se acerca.
    const poster = video.locator('img')
    await expect(poster).toHaveAttribute('src', /\/api\/media\/file\//)
    await expect(poster).toHaveAttribute('loading', 'lazy')
    await expect(page.locator('figcaption', { hasText: logro.video.title })).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)
    await poster.scrollIntoViewIfNeeded()
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
    expect(external).toEqual([])

    // Al pulsar, el reproductor de youtube-nocookie.com, con el título del vídeo.
    await video.click()
    const player = page.locator('iframe')
    await expect(player).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/ovPAxnBdKYQ/,
    )
    await expect(player).toHaveAttribute('title', logro.video.title)
  })

  test('una mazmorra elegida a mano en la guía lleva el jefe de esa mazmorra', async ({ page }) => {
    await page.goto(url)
    const tasks = page
      .getByRole('region', { name: 'Necesitarás en total' })
      .getByRole('list', { name: 'Combates y mazmorras' })
      .getByRole('listitem')
    // «Mazmorra Kodámade» no casa sola con ninguna mazmorra de la semilla: Torre eligió la
    // Casa de los Espíritus, y la fila lleva la imagen de su jefe, no el icono genérico.
    const picked = tasks.filter({ hasText: 'Mazmorra Kodámade' }).locator('img')
    await expect(picked).toHaveAttribute('src', /\/api\/media\/file\//)
    // Sin elección y sin una mazmorra que case sola, el icono genérico.
    await expect(tasks.filter({ hasText: 'Mazmorra de Grunob' }).locator('img')).toHaveAttribute(
      'src',
      '/img/game/jefes/crunchidor.webp',
    )
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
