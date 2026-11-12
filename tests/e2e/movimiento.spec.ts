import { expect, test, type Locator, type Page } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// El movimiento del sitio (DESIGN.md, Motion): entre páginas, una transición de vista con la
// cabecera quieta; dentro de la página, lo que se abre y se cierra lo hace con una transición
// de opacidad y transform, en los dos sentidos. Con movimiento reducido, nada se mueve.

const guide = `/${seedGuide.slug}`

type Reveal = { transition: boolean; types: string[]; header: string }

/** Anota cada página que se muestra: si llegó con transición de vista, sus tipos y el nombre de la cabecera. */
async function recordReveals(page: Page) {
  await page.addInitScript(() => {
    // sessionStorage sobrevive a la navegación de la pestaña; si el navegador lo bloquea,
    // la prueba no puede saber qué pasó y lo dice.
    const store = (reveal: Reveal) => {
      try {
        const list = JSON.parse(sessionStorage.getItem('reveals') ?? '[]') as Reveal[]
        sessionStorage.setItem('reveals', JSON.stringify([...list, reveal]))
      } catch {
        document.documentElement.dataset.revealsBroken = 'sin sessionStorage'
      }
    }
    addEventListener('pagereveal', (event) => {
      const transition = (event as Event & { viewTransition: ViewTransition | null }).viewTransition
      const header = document.querySelector('[data-site-header]')
      store({
        transition: Boolean(transition),
        types: transition ? [...(transition.types ?? [])] : [],
        header: header ? getComputedStyle(header).viewTransitionName : '',
      })
    })
  })
}

const reveals = (page: Page) =>
  page.evaluate(() => {
    // Si alguna página no pudo guardar lo que vio, la lista estaría incompleta: falla aquí.
    if (document.documentElement.dataset.revealsBroken) {
      throw new Error('Sin sessionStorage: una página no pudo anotar si llegó con transición')
    }
    try {
      return JSON.parse(sessionStorage.getItem('reveals') ?? '[]') as Reveal[]
    } catch {
      throw new Error('Sin sessionStorage: no se pueden leer las páginas mostradas')
    }
  })

/**
 * Cierra un diálogo abierto y mira cómo queda en el primer fotograma de su salida: sigue
 * pintado (la transición de display lo mantiene), pero ya no recibe clics.
 */
const whileLeaving = (dialog: Locator) =>
  dialog.evaluate((node) => {
    const open = getComputedStyle(node).pointerEvents
    ;(node as HTMLDialogElement).close()
    const style = getComputedStyle(node)
    return { open, display: style.display, leaving: style.pointerEvents }
  })

/** Las transiciones CSS que arrancan dentro de un elemento: «clase:propiedad». */
async function watchTransitions(target: Locator) {
  await target.evaluate((node) => {
    const seen: string[] = []
    ;(node as HTMLElement & { seen?: string[] }).seen = seen
    node.addEventListener('transitionrun', (event) => {
      const el = event.target as Element
      const { propertyName } = event as TransitionEvent
      seen.push(`${el.classList[0] ?? el.tagName.toLowerCase()}:${propertyName}`)
    })
  })
}

const transitions = (target: Locator) =>
  target.evaluate((node) => (node as HTMLElement & { seen?: string[] }).seen ?? [])

/** Espera a que acaben las transiciones CSS en curso, como haría quien mira la pantalla. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )

async function ready(page: Page, url: string) {
  await page.goto(url)
  await expect(page.locator('[data-site-header][data-ready]')).toHaveCount(1)
}

test.describe('entre páginas', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('un enlace abre la página siguiente con una transición de vista y la cabecera quieta', async ({
    page,
  }) => {
    await recordReveals(page)
    await ready(page, guide)
    await page.getByRole('button', { name: 'Misiones', exact: true }).click()
    await page
      .locator('#menu-misiones')
      .getByRole('link', { name: /Ver todo/ })
      .click()
    await expect(page).toHaveURL(/\/metalogros$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const last = (await reveals(page)).at(-1)!
    expect(last.transition).toBe(true)
    expect(last.types).toContain('pagina')
    expect(last.header).toBe('site-hdr')
  })

  test('el logo también navega con transición, sin la navegación del cliente de Next', async ({
    page,
  }) => {
    await recordReveals(page)
    await ready(page, guide)
    await page.getByRole('banner').getByRole('link', { name: 'Torrente Arcano' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const all = await reveals(page)
    // Dos páginas cargadas de verdad: la guía y la portada, que llega con transición.
    expect(all).toHaveLength(2)
    expect(all[1].transition).toBe(true)
  })

  test('fuera de la transición, la cabecera no lleva nombre: el cambio de modo la revela con la página', async ({
    page,
  }) => {
    await ready(page, guide)
    const name = await page
      .locator('[data-site-header]')
      .evaluate((node) => getComputedStyle(node).viewTransitionName)
    expect(name).toBe('none')
  })
})

test.describe('entre páginas con movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('la página siguiente llega sin transición', async ({ page }) => {
    await recordReveals(page)
    await ready(page, guide)
    await page.getByRole('banner').getByRole('link', { name: 'Torrente Arcano' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect((await reveals(page)).at(-1)!.transition).toBe(false)
  })
})

test.describe('cabecera', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('un panel entra y sale con opacidad y transform, también al cambiar de panel', async ({
    page,
  }) => {
    await ready(page, guide)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await watchTransitions(nav)
    const dofus = nav.getByRole('button', { name: 'Dofus', exact: true })
    await dofus.click()
    await expect(page.locator('#menu-dofus')).toBeVisible()
    await settle(page)
    // Abrir Misiones cierra Dofus: los dos se mueven a la vez.
    await nav.getByRole('button', { name: 'Misiones', exact: true }).click()
    await expect(page.locator('#menu-dofus')).toBeHidden()
    await settle(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('#menu-misiones')).toBeHidden()

    const seen = await transitions(nav)
    expect(seen.filter((t) => t === 'panel:opacity').length).toBeGreaterThanOrEqual(4)
    expect(seen).toContain('panel:transform')
    expect(seen).toContain('panel:display')
  })

  test('los botones y enlaces cambian de color con transición', async ({ page }) => {
    await ready(page, guide)
    const button = page.getByRole('button', { name: 'Dofus', exact: true })
    const link = page.getByRole('contentinfo').getByRole('link').first()
    for (const target of [button, link]) {
      const property = await target.evaluate((node) => getComputedStyle(node).transitionProperty)
      expect(property).toMatch(/color/)
    }
  })

  test('la búsqueda se abre y se cierra con transición, y sus resultados aparecen suaves', async ({
    page,
  }) => {
    await ready(page, guide)
    const dialog = page.locator('dialog.sdlg')
    await watchTransitions(dialog)
    await page.keyboard.press('Control+k')
    await expect(dialog).toBeVisible()
    await page.keyboard.type(seedGuide.title.slice(0, 6))
    await expect(dialog.locator('.sdlg__list a').first()).toBeVisible()
    await settle(page)
    // Desde un resultado: en el campo, Esc primero lo vacía.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    const seen = await transitions(dialog)
    expect(seen).toContain('sdlg:opacity')
    expect(seen).toContain('sdlg:overlay')
    expect(seen.some((t) => t.endsWith(':opacity') && !t.startsWith('sdlg:'))).toBe(true)
  })

  test('mientras la búsqueda sale, no recibe clics', async ({ page }) => {
    await ready(page, guide)
    const dialog = page.locator('dialog.sdlg')
    await page.keyboard.press('Control+k')
    await expect(dialog).toBeVisible()
    await settle(page)
    const state = await whileLeaving(dialog)
    expect(state.open).toBe('auto')
    expect(state.display).not.toBe('none')
    expect(state.leaving).toBe('none')
  })
})

test.describe('menú del móvil', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' })

  test('el menú baja y sube, y cada sección se abre con transición', async ({ page }) => {
    await ready(page, guide)
    const sheet = page.locator('#site-sheet')
    await watchTransitions(sheet)
    await page.getByRole('button', { name: 'Menú' }).click()
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /Dofus y checklists/ }).click()
    await expect(sheet.getByRole('link', { name: 'Dofus Ocre' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    const seen = await transitions(sheet)
    expect(seen).toContain('sheet:transform')
    expect(seen).toContain('sheet:overlay')
    expect(seen).toContain('stile__p:opacity')
  })

  test('mientras el menú sube, no recibe clics', async ({ page }) => {
    await ready(page, guide)
    const sheet = page.locator('#site-sheet')
    await page.getByRole('button', { name: 'Menú' }).click()
    await expect(sheet).toBeVisible()
    await settle(page)
    const state = await whileLeaving(sheet)
    expect(state.open).toBe('auto')
    expect(state.display).not.toBe('none')
    expect(state.leaving).toBe('none')
  })
})

test.describe('guía', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('la imagen a pantalla completa se cierra con transición', async ({ page }) => {
    await page.goto(guide)
    await page
      .getByRole('link', { name: /^Ver imagen a pantalla completa/ })
      .first()
      .click()
    const viewer = page.locator('dialog.viewer')
    await expect(viewer).toBeVisible()
    await settle(page)
    await watchTransitions(viewer)
    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    const seen = await transitions(viewer)
    expect(seen).toContain('viewer:overlay')
    expect(seen).toContain('viewer__figure:opacity')
  })

  test('el reproductor del vídeo aparece con un fundido', async ({ page }) => {
    await page.goto(guide)
    const frame = page.locator('.video__frame').first()
    await watchTransitions(frame)
    await page.getByRole('link', { name: `Ver el vídeo: ${seedGuide.video.title}` }).click()
    await expect(frame.locator('iframe')).toHaveCount(1)
    // El enlace (portada o insignia) sigue debajo, inerte: el reproductor se funde sobre él,
    // no sobre el vacío.
    await expect(frame.locator('.video__badge')).toBeVisible()
    await expect(frame.locator('.video__link')).toHaveJSProperty('inert', true)
    await expect.poll(() => transitions(frame)).toContain('video__player:opacity')
  })
})

test.describe('portada', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('el panel de resultados de la búsqueda entra y sale con transición', async ({ page }) => {
    await page.goto('/')
    const field = page.getByRole('combobox', { name: '¿Qué misión estás haciendo?' })
    const panel = page.locator('.cbx')
    await watchTransitions(panel)
    await field.fill('es')
    await expect(panel).toBeVisible()
    await settle(page)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    const seen = await transitions(panel)
    expect(seen.filter((t) => t === 'cbx:opacity').length).toBeGreaterThanOrEqual(2)
    expect(seen).toContain('cbx:display')
  })
})

test.describe('índice de metalogros', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  async function spyTransitions(page: Page) {
    await page.addInitScript(() => {
      const w = window as unknown as { vt: string[][] }
      w.vt = []
      const start = document.startViewTransition?.bind(document)
      if (!start) return
      document.startViewTransition = ((
        arg: ViewTransitionUpdateCallback | { types?: string[] },
      ) => {
        w.vt.push(typeof arg === 'function' ? [] : [...(arg.types ?? [])])
        return start(arg as never)
      }) as typeof document.startViewTransition
    })
  }

  test('abrir y cerrar una zona mueve las fichas con una transición de vista', async ({ page }) => {
    await spyTransitions(page)
    await page.goto('/metalogros')
    const tile = page.locator('button.vd-tile[data-zone="astrub"]')
    await tile.click()
    await expect(tile).toHaveAttribute('aria-expanded', 'true')
    await tile.click()
    await expect(tile).toHaveAttribute('aria-expanded', 'false')
    const calls = await page.evaluate(() => (window as unknown as { vt: string[][] }).vt)
    expect(calls).toEqual([['metalogros'], ['metalogros']])
  })
})

test.describe('índice de metalogros con movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('la zona se abre sin transición de vista', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { vt: number }
      w.vt = 0
      const start = document.startViewTransition?.bind(document)
      if (!start) return
      document.startViewTransition = ((arg: never) => {
        w.vt += 1
        return start(arg)
      }) as typeof document.startViewTransition
    })
    await page.goto('/metalogros')
    const tile = page.locator('button.vd-tile[data-zone="astrub"]')
    await tile.click()
    await expect(tile).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => (window as unknown as { vt: number }).vt)).toBe(0)
  })
})
