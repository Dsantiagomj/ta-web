import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { MODES } from '../../src/lib/theme/theme.ts'
import { expectNeedsColumns } from './needs-layout.ts'
import { seedAchievement as logro } from './seed/achievements.ts'
import { seedDofus as dofus } from './seed/dofus-guides.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// Las guías de Dofus (DESIGN.md, Dofus guides index y Dofus guide page), sobre las que siembra
// scripts/seed-e2e.ts: el Dofus Ocre completo, el Dofawa sin logros y el Jyfus En preparación.
// Todo lo que se ve sale de la colección dofus-guides y de su índice.

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('índice de las guías de Dofus', () => {
  test('pinta el título, la entradilla de Torre y una tarjeta por Dofus, en su orden', async ({
    page,
  }) => {
    const response = await page.goto('/guias-dofus')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Guías de Dofus' })).toBeVisible()
    await expect(page.getByText(dofus.index.intro)).toBeVisible()
    // Ninguna cifra en el título ni en la entradilla.
    await expect(page.locator('.dg-hero')).not.toContainText(/\d+ (guías|Dofus)/)

    const cards = page.locator('[data-dofus-grid] > li')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0)).toContainText(dofus.dofawa.name)
    await expect(cards.nth(2).getByRole('link')).toHaveAttribute('href', `/${dofus.ocre.slug}`)
    await expect(cards.nth(2)).toContainText(dofus.ocre.meta)
    await expect(cards.nth(2)).toContainText(dofus.ocre.tag)
    // Un Dofus En preparación se ve apagado y sin enlace.
    await expect(cards.nth(1).getByRole('link')).toHaveCount(0)
    await expect(cards.nth(1).locator('[aria-disabled="true"]')).toContainText('En preparación')
    // La etiqueta es una píldora pequeña, no texto suelto del tamaño del nombre.
    const tag = cards.nth(1).getByText('En preparación', { exact: true })
    // 22px y 11px a la raíz de 16px; en el escritorio (1280px), la raíz es el 110 %.
    expect((await tag.boundingBox())!.height).toBeCloseTo(22 * 1.1, 0)
    await expect(tag).toHaveCSS('font-size', '12.1px')
  })

  test('el filtro y la búsqueda dejan solo los que encajan y lo dicen', async ({ page }) => {
    await page.goto('/guias-dofus')
    const cards = page.locator('[data-dofus-grid] > li:visible')
    const status = page.getByRole('status')
    await expect(status).toHaveText('')

    await page.getByRole('button', { name: 'Primordiales' }).click()
    await expect(page.getByRole('button', { name: 'Primordiales' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(dofus.ocre.name)
    await expect(status).toHaveText('1 encontrado')

    await page.getByRole('button', { name: 'Todos' }).click()
    await page.getByRole('searchbox', { name: 'Buscar un Dofus por su nombre' }).fill('DOFAWA')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(dofus.dofawa.name)

    await page.getByRole('searchbox').fill('zurcarak')
    await expect(cards).toHaveCount(0)
    await expect(status).toHaveText('Ningún Dofus se llama «zurcarak».')
  })

  test('los antetítulos del índice, de /checklists y de la portada van en el acento y Lexend', async ({
    page,
  }) => {
    for (const [path, selector] of [
      ['/guias-dofus', '.dg-eyebrow'],
      ['/checklists', '.ck-eyebrow'],
      ['/', '.hero__eyebrow'],
    ]) {
      await page.goto(path)
      const look = await page.locator(selector).evaluate((el) => {
        const probe = document.createElement('i')
        probe.style.color = 'var(--color-accent)'
        el.append(probe)
        const accent = getComputedStyle(probe).color
        probe.remove()
        const s = getComputedStyle(el)
        return {
          accent: s.color === accent,
          family: s.fontFamily.split(',')[0].replaceAll('"', ''),
        }
      })
      expect(look, path).toEqual({ accent: true, family: 'Lexend' })
    }
  })

  test('el filtro elegido va sobre el relleno de los botones, con su tinta', async ({ page }) => {
    await page.goto('/guias-dofus')
    const all = page.getByRole('button', { name: 'Todos' })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    const look = await page.locator('.dg-seg').evaluate((seg) => {
      const probe = document.createElement('i')
      seg.append(probe)
      const token = (name: string) => {
        probe.style.color = `var(${name})`
        return getComputedStyle(probe).color
      }
      const out = {
        btn: token('--color-btn'),
        ink: token('--color-btn-ink'),
        indicator: getComputedStyle(seg.querySelector('.dg-seg__ind')!).backgroundColor,
        shadow: getComputedStyle(seg.querySelector('.dg-seg__ind')!).boxShadow,
        pressed: getComputedStyle(seg.querySelector('[aria-pressed="true"]')!).color,
        family: getComputedStyle(seg.querySelector('.dg-pill')!).fontFamily.split(',')[0],
      }
      probe.remove()
      return out
    })
    expect(look.indicator).toBe(look.btn)
    expect(look.pressed).toBe(look.ink)
    expect(look.shadow).toBe('none')
    expect(look.family.replaceAll('"', '')).toBe('Lexend')
  })

  test('sin JavaScript se ven todas las tarjetas y no sale el buscador', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/guias-dofus')
    await expect(page.locator('[data-dofus-grid] > li')).toHaveCount(3)
    await expect(page.locator('.dg-tools')).toBeHidden()
    await context.close()
  })

  // La tarjeta en 3D (DESIGN.md, Dofus guides components): con el ratón se inclina hacia él y el
  // brillo del color de su Dofus lo sigue, como los carteles de /checklists. Solo las publicadas.
  test.describe('con el ratón', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('la tarjeta publicada se inclina hacia el puntero, con su brillo, y vuelve al salir', async ({
      page,
    }) => {
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      const foil = card.locator('.dcard__foil')
      await expect(foil).toHaveCSS('opacity', '0')
      const box = (await card.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await expect(card).toHaveClass(/is-tilted/)
      await expect(card).toHaveAttribute('style', /perspective\(800px\) rotateY\(\d/)
      await expect(foil).toHaveCSS('opacity', '1')
      expect(await axe(page)).toEqual([])
      await page.mouse.move(0, 0)
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(foil).toHaveCSS('opacity', '0')
    })

    test('la «En preparación» no se inclina ni lleva brillo', async ({ page }) => {
      await page.goto('/guias-dofus')
      const off = page.locator('.dcard--off', { hasText: dofus.jyfus.name })
      await expect(off).not.toHaveAttribute('data-tilt')
      await expect(off.locator('.dcard__foil')).toHaveCount(0)
      const box = (await off.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(off).not.toHaveClass(/is-tilted/)
      await expect(off).toHaveCSS('transform', 'none')
    })

    test('con movimiento reducido no se inclina', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      const box = (await card.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1)
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2)
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(card).toHaveCSS('transform', 'none')
      await expect(card.locator('.dcard__foil')).toHaveCSS('opacity', '0')
    })
  })

  test('con el dedo no se inclina', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true })
    try {
      const page = await context.newPage()
      await page.goto('/guias-dofus')
      const card = page.getByRole('link', { name: new RegExp(dofus.ocre.name) })
      await expect(card).toHaveAttribute('data-tilt')
      const box = (await card.boundingBox())!
      for (const pointerType of ['touch', 'pen']) {
        await card.dispatchEvent('pointermove', {
          pointerType,
          clientX: box.x + box.width * 0.9,
          clientY: box.y + box.height * 0.1,
        })
      }
      await expect(card).not.toHaveClass(/is-tilted/)
      await expect(card).toHaveCSS('transform', 'none')
    } finally {
      await context.close()
    }
  })

  // El LCP (DESIGN.md, Performance budgets): con un `filter` en el huevo, Chrome lo contaba como un
  // recuadro mayor que el que se ve. Su halo es un degradado detrás, sin `filter`.
  test('el huevo de una tarjeta cuenta para el LCP por lo que se ve', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
    })
    try {
      const page = await context.newPage()
      await page.addInitScript(() => {
        const w = window as unknown as { lcp: { element: Element; size: number }[] }
        w.lcp = []
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as LargestContentfulPaint[]) {
            if (entry.element) w.lcp.push({ element: entry.element, size: entry.size })
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      })
      await page.goto('/guias-dofus', { waitUntil: 'networkidle' })
      const eggs = page.locator('a.dcard .dcard__art img')
      for (const egg of await eggs.all()) await expect(egg).toHaveCSS('filter', 'none')
      const eggSizes = await page.evaluate(() => {
        const w = window as unknown as { lcp: { element: Element; size: number }[] }
        return w.lcp
          .filter(({ element }) => element.matches('.dcard__art img'))
          .map(({ element, size }) => {
            const box = element.getBoundingClientRect()
            return { size, drawn: box.width * box.height }
          })
      })
      for (const { size, drawn } of eggSizes) expect(size).toBeLessThanOrEqual(drawn * 1.05)
    } finally {
      await context.close()
    }
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto('/guias-dofus')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await axe(page)).toEqual([])
    })
  }
})

test.describe('página de una guía de Dofus', () => {
  const url = `/${dofus.ocre.slug}`

  test('las migas, la cabecera con el huevo y Prerrequisitos, la checklist y la intro', async ({
    page,
  }) => {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)
    const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' })
    await expect(crumbs.getByRole('link', { name: 'Guías de Dofus' })).toHaveAttribute(
      'href',
      '/guias-dofus',
    )
    const header = page.locator('header.dg-head')
    await expect(header.getByRole('heading', { level: 1, name: dofus.ocre.name })).toBeVisible()
    await expect(header.locator('.qhead__meta')).toContainText(dofus.ocre.meta)
    await expect(header.locator('.qhead__meta')).toContainText(dofus.ocre.tag)
    await expect(header.getByRole('heading', { name: 'Prerrequisitos' })).toBeVisible()
    await expect(header.getByText(dofus.ocre.prerequisite)).toBeVisible()
    // La checklist de su Dofus publicada en la web (la semilla del Nebuloso apunta a esta
    // guía), no la de Squarespace que guarda la guía.
    await expect(
      page.getByRole('link', { name: new RegExp(dofus.ocre.checklist.name) }),
    ).toHaveAttribute('href', `/${seedChecklists.nebuloso.slug}`)
    await expect(page.getByText(dofus.ocre.intro)).toBeVisible()
  })

  test('Necesitarás: el objeto copia su nombre para buscarlo en el juego', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    await expect(needs.getByText(dofus.ocre.needsNote)).toBeVisible()
    const [item] = dofus.ocre.needsItems
    await needs.getByRole('button', { name: `Copiar ${item!.name}` }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(item!.name)
  })

  test('Necesitarás: los objetos en columnas y la nota de Torre después, aunque vaya en medio', async ({
    page,
  }) => {
    await page.goto(url)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    await expect(needs.locator('.needs__items > li')).toHaveCount(dofus.ocre.needsItems.length)
    await expect(needs.locator('.needs__notes')).toContainText(dofus.ocre.needsNote)
    await expectNeedsColumns(page, needs)
    // Una nota de dos párrafos los pone uno debajo del otro, no lado a lado.
    const first = await needs.getByText(dofus.ocre.needsNote, { exact: true }).boundingBox()
    const second = await needs.getByText(dofus.ocre.needsNoteMore, { exact: true }).boundingBox()
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1)
    expect(Math.abs(second!.x - first!.x)).toBeLessThan(2)
  })

  test('el logro trae las misiones como las escribe Torre; la suelta lleva su nota', async ({
    page,
  }) => {
    await page.goto(url)
    const parts = page.getByRole('region', { name: 'El logro' })
    await expect(parts.getByRole('link', { name: logro.name, exact: true })).toHaveAttribute(
      'href',
      `/${logro.slug}`,
    )
    // Las misiones del logro son las de Torre, con su texto, no las de la página de logro.
    const { torreQuests } = dofus.ocre
    const achievementQuests = parts.getByRole('list').first()
    await expect(achievementQuests.getByRole('listitem')).toHaveCount(3)
    await expect(achievementQuests.getByRole('link', { name: torreQuests.own })).toHaveAttribute(
      'href',
      `/${seedGuide.prerequisite.slug}`,
    )
    // Una fila con dos guías: cada trozo de su texto enlaza la suya.
    const [first, second] = torreQuests.pair
    const pair = achievementQuests.getByRole('listitem').nth(1)
    await expect(pair).toContainText(torreQuests.pair.join(' - '))
    await expect(pair.getByRole('link', { name: first! })).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
    await expect(pair.getByRole('link', { name: second! })).toHaveAttribute(
      'href',
      `/${seedGuide.prerequisite.slug}`,
    )
    const noGuide = achievementQuests.getByRole('listitem').nth(2)
    await expect(noGuide).toContainText(torreQuests.noGuide)
    await expect(noGuide).toContainText('Sin guía todavía')
    await expect(noGuide.getByRole('link')).toHaveCount(0)
    // La página de logro tiene «El cazador cazado»: no sale, sale el texto de Torre.
    await expect(parts.getByText('El cazador cazado', { exact: true })).toHaveCount(0)

    await expect(parts.getByRole('heading', { name: dofus.ocre.looseTitle })).toBeVisible()
    await expect(parts.getByText(dofus.ocre.looseNote)).toBeVisible()
    await expect(parts.getByRole('link', { name: seedGuide.title }).first()).toHaveAttribute(
      'href',
      `/${seedGuide.slug}`,
    )
    // Lo que Torre enlaza que no es una misión queda en su lista, sin número de misión.
    const linkRow = parts
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: dofus.ocre.looseLink.title }) })
    await expect(linkRow.getByRole('link')).toHaveAttribute('href', dofus.ocre.looseLink.link)
    await expect(linkRow).toContainText(dofus.ocre.looseLink.note)
    await expect(linkRow).not.toContainText(/Misión \d/)
  })

  test('una sola columna, sin lista lateral, con el Dofus anterior', async ({ page }) => {
    await page.goto(url)
    await expect(page.getByRole('complementary')).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Guías de Dofus' })
    await expect(nav.getByRole('link', { name: /Dofus anterior/ })).toHaveAttribute(
      'href',
      `/${dofus.dofawa.slug}`,
    )
  })

  test('el paso a paso (como la Piñata de pino): prosa, captura, paso y cierre', async ({
    page,
  }) => {
    await page.goto(`/${dofus.dofawa.slug}`)
    const body = page.getByRole('region', { name: 'Paso a paso' })
    await expect(body.getByText(dofus.dofawa.bodyIntro)).toBeVisible()
    await expect(body.getByRole('img', { name: dofus.dofawa.bodyImageAlt })).toBeVisible()
    await expect(body.getByText(/habla con Goblepino/)).toBeVisible()
    // Las coordenadas, como en las guías de misión: un chip que se copia.
    await expect(body.locator('.coord').first()).toContainText(/38,\s*-80/)
    await expect(body.getByText(dofus.dofawa.bodyOutro)).toBeVisible()
  })

  test('Necesitarás: cada mazmorra lleva el jefe que nombra, o el icono de mazmorra', async ({
    page,
  }) => {
    await page.goto(`/${dofus.dofawa.slug}`)
    const needs = page.getByRole('region', { name: 'Necesitarás' })
    const [kumijo, generic] = dofus.dofawa.needsDungeons
    const row = (text: string) => needs.locator('.needs__notes > li').filter({ hasText: text })
    // La nota de Torre, tal cual; a su lado, el jefe de la Casa de los Espíritus.
    await expect(row(kumijo!)).toHaveText(kumijo!)
    const boss = row(kumijo!).locator('.well img')
    await expect(boss).toHaveAttribute('src', /\/api\/media\/file\//)
    await boss.scrollIntoViewIfNeeded()
    await expect
      .poll(() => boss.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0)
    // La que no nombra una sola mazmorra: el icono de mazmorra.
    await expect(row(generic!).locator('.well img')).toHaveAttribute(
      'src',
      '/img/game/jefes/crunchidor.webp',
    )
    // Un combate no es una mazmorra: sin hueco.
    await expect(row(dofus.dofawa.needsCombat).locator('.well')).toHaveCount(0)
    // El hueco va a la altura de la primera línea de la nota.
    const slot = await row(kumijo!).locator('.well').boundingBox()
    // La nota de una línea: su párrafo, sin el relleno que la baja.
    const line = await row(kumijo!).locator('.dg-note__t > *').first().boundingBox()
    expect(Math.abs(slot!.y + slot!.height / 2 - (line!.y + line!.height / 2))).toBeLessThan(2)
  })

  test('un Dofus En preparación no tiene página', async ({ page }) => {
    const response = await page.goto(`/${dofus.jyfus.slug}`)
    expect(response?.status()).toBe(404)
  })

  for (const mode of MODES) {
    test(`pasa axe (WCAG 2.2 AA) en Arcano ${mode}`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: 'ta-mode', value: mode, url: baseURL! }])
      await page.goto(url)
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await axe(page)).toEqual([])
    })
  }
})

test('el menú de Dofus lleva al índice y a cada guía publicada, desde la colección', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Dofus' }).click()
  const panel = page.locator('#menu-dofus')
  await expect(panel.getByRole('link', { name: 'Ver todas las guías de Dofus' })).toHaveAttribute(
    'href',
    '/guias-dofus',
  )
  await expect(panel.getByRole('link', { name: dofus.ocre.name })).toHaveAttribute(
    'href',
    `/${dofus.ocre.slug}`,
  )
  await expect(panel.getByRole('link', { name: dofus.jyfus.name })).toHaveCount(0)
})
