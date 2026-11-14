import { expect, test, type Page } from '@playwright/test'

import { formatDefects, lintLayout, type LayoutDefect } from './layout-lint.ts'
import { seedAchievement } from './seed/achievements.ts'
import { indexChecklists } from './seed/checklists-index.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { E2E_PANEL_USER_5, seedGuide } from './seed/guides.ts'

// La revisión de la maquetación (AGENTS.md, Workflow): cada tipo de página pública a 390, 768,
// 1024 y 1440px, sin desbordes, sin textos de una palabra por línea, sin cajas que se pisen y
// sin texto recortado (layout-lint.ts). En las checklists de pasos se abre cada paso, con
// Prerrequisitos y Objetos; en el Ocre, la página de almas.
//
// En local, sobre la base sembrada, con las vistas previas del Silvestre y del Ocre. Con
// SMOKE_BASE_URL, contra un despliegue: busca lo publicado por la API de Payload y solo lee.
// Allí las vistas previas necesitan una cuenta del panel (LAYOUT_LINT_PANEL_EMAIL y
// LAYOUT_LINT_PANEL_PASSWORD); LAYOUT_LINT_PATHS añade rutas separadas por comas.

const WIDTHS = [390, 768, 1024, 1440] as const
const remote = Boolean(process.env.SMOKE_BASE_URL?.trim())

const panelAccount = remote
  ? process.env.LAYOUT_LINT_PANEL_EMAIL && process.env.LAYOUT_LINT_PANEL_PASSWORD
    ? {
        email: process.env.LAYOUT_LINT_PANEL_EMAIL,
        password: process.env.LAYOUT_LINT_PANEL_PASSWORD,
      }
    : null
  : E2E_PANEL_USER_5

test.describe.configure({ mode: 'parallel' })

test.use({ reducedMotion: 'reduce' })

type Checklist = { slug: string; kind: 'steps' | 'souls' }

/** El slug del primero publicado de una colección, por la API pública de Payload. */
async function firstPublished(page: Page, collection: string, where: string) {
  const response = await page.request.get(
    `/api/${collection}?${where}&limit=1&depth=0&select[slug]=true`,
  )
  expect(response.ok(), `/api/${collection}`).toBe(true)
  const { docs } = (await response.json()) as { docs: { slug: string }[] }
  expect(docs.length, `algo publicado en ${collection}`).toBeGreaterThan(0)
  return `/${docs[0]!.slug}`
}

async function publishedChecklists(page: Page): Promise<Checklist[]> {
  if (!remote) return [{ slug: seedChecklists.nebuloso.slug, kind: 'steps' }]
  const response = await page.request.get(
    '/api/checklists?where[state][equals]=published&limit=100&depth=0&select[slug]=true&select[kind]=true',
  )
  expect(response.ok()).toBe(true)
  const { docs } = (await response.json()) as { docs: Checklist[] }
  return docs.map(({ slug, kind }) => ({ slug, kind: kind ?? 'steps' }))
}

/** Las que solo se ven en la vista previa del panel: borradores o fichas En preparación. */
async function previewChecklists(page: Page): Promise<Checklist[]> {
  if (!remote) {
    return [
      { slug: seedChecklists.silvestre.slug, kind: 'steps' },
      { slug: indexChecklists.legacy.slug, kind: 'souls' },
    ]
  }
  const response = await page.request.get(
    '/api/checklists?where[state][not_equals]=published&limit=100&depth=0&select[slug]=true&select[kind]=true',
  )
  expect(response.ok()).toBe(true)
  const { docs } = (await response.json()) as { docs: Checklist[] }
  return docs.map(({ slug, kind }) => ({ slug, kind: kind ?? 'steps' }))
}

const pages: { name: string; path: (page: Page) => Promise<string> }[] = [
  { name: 'la portada', path: async () => '/' },
  {
    name: 'una guía de misión',
    path: (page) =>
      remote
        ? firstPublished(page, 'quest-guides', 'where[_status][equals]=published')
        : Promise.resolve(`/${seedGuide.slug}`),
  },
  {
    name: 'una guía de Dofus',
    path: (page) =>
      remote
        ? firstPublished(page, 'dofus-guides', 'where[state][equals]=published')
        : Promise.resolve(`/${seedDofus.ocre.slug}`),
  },
  {
    name: 'una página de logro',
    path: (page) =>
      remote
        ? firstPublished(page, 'achievement-pages', 'where[state][equals]=published')
        : Promise.resolve(`/${seedAchievement.slug}`),
  },
  { name: 'los metalogros', path: async () => '/metalogros' },
  { name: 'el índice de checklists', path: async () => '/checklists' },
  { name: 'las guías de Dofus', path: async () => '/guias-dofus' },
  ...(process.env.LAYOUT_LINT_PATHS ?? '')
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => ({ name: path, path: async () => path })),
]

const viewport = (width: number) => ({ width, height: width < 768 ? 844 : 900 })

/** Lo que llega después de pintar (detalles, fuentes, la isla) y el fin de los fundidos. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  )
}

async function open(page: Page, path: string) {
  const response = await page.goto(path)
  expect(response?.status(), path).toBeLessThan(400)
  // La isla de la checklist suelta sus controles cuando ya manda.
  for (const ready of ['[data-ck-more]', '[data-sl-own]']) {
    if (await page.locator(ready).count()) await expect(page.locator(ready).first()).toBeEnabled()
  }
  await settle(page)
}

const label = (where: string, defects: LayoutDefect[]) =>
  defects.map((defect) => ({ ...defect, where: `${where}: ${defect.where}` }))

/** Una checklist de pasos: la página, cada paso abierto y las pestañas. */
async function lintSteps(page: Page, path: string): Promise<LayoutDefect[]> {
  await open(page, path)
  const found = label(path, await lintLayout(page))
  const steps = await page
    .locator('.ck-rows [data-pick]')
    .evaluateAll((links) => links.map((link) => Number((link as HTMLElement).dataset.pick)))
  const sheet = page.locator('[data-ck-sheet]')
  for (const n of steps) {
    await page.locator(`.ck-rows [data-pick="${n}"]`).click()
    await expect(page.locator(`#paso-${n}`)).toBeVisible()
    await settle(page)
    found.push(...label(`${path} paso ${n}`, await lintLayout(page, `#paso-${n}`)))
    if (await sheet.evaluate((dialog: HTMLDialogElement) => dialog.open)) {
      await page.keyboard.press('Escape')
      await expect(sheet).not.toBeVisible()
    }
  }
  for (const tab of ['pre', 'obj']) {
    const link = page.locator(`[data-tab="${tab}"]`)
    if (!(await link.count())) continue
    await link.click()
    await expect(page.locator(`#ck-p-${tab}`)).toBeVisible()
    await settle(page)
    found.push(...label(`${path} pestaña ${tab}`, await lintLayout(page)))
  }
  return found
}

async function lintChecklist(page: Page, { slug, kind }: Checklist) {
  if (kind === 'steps') return lintSteps(page, `/${slug}`)
  await open(page, `/${slug}`)
  return label(`/${slug}`, await lintLayout(page))
}

test.describe('maquetación', () => {
  for (const width of WIDTHS) {
    for (const target of pages) {
      test(`${target.name} a ${width}px`, async ({ page }) => {
        await page.setViewportSize(viewport(width))
        const path = await target.path(page)
        await open(page, path)
        const defects = await lintLayout(page)
        expect(defects, formatDefects(defects)).toEqual([])
      })
    }

    test(`las checklists publicadas a ${width}px`, async ({ page }) => {
      test.slow()
      await page.setViewportSize(viewport(width))
      const defects: LayoutDefect[] = []
      for (const checklist of await publishedChecklists(page)) {
        defects.push(...(await lintChecklist(page, checklist)))
      }
      expect(defects, formatDefects(defects)).toEqual([])
    })
  }

  // Un solo test con todas las anchuras: cada inicio de sesión reescribe las sesiones de la
  // cuenta, y dos a la vez se las borrarían entre sí. La vista previa no abre el documento en
  // el panel, así que no deja bloqueos que soltar.
  test('las checklists de la vista previa del panel', async ({ page }) => {
    test.skip(!panelAccount, 'Contra un despliegue, la vista previa necesita una cuenta del panel')
    test.slow()
    const login = await page.request.post('/api/users/login', { data: panelAccount })
    expect(login.ok()).toBe(true)
    const defects: LayoutDefect[] = []
    for (const checklist of await previewChecklists(page)) {
      for (const width of WIDTHS) {
        await page.setViewportSize(viewport(width))
        await page.goto(`/vista-previa?slug=${checklist.slug}`)
        await expect(page).toHaveURL(new RegExp(`/${checklist.slug}`))
        defects.push(...label(`${width}px`, await lintChecklist(page, checklist)))
      }
    }
    expect(defects, formatDefects(defects)).toEqual([])
  })
})
