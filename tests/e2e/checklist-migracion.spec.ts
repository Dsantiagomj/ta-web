import { expect, test, type Page } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// La migración del progreso de silvestre-checklist, con claves antiguas sembradas en
// localStorage antes de cargar la página, en los formatos de la app antigua.

const neb = seedChecklists.nebuloso
const url = `/${neb.slug}`

const classic = (steps: number[]) =>
  JSON.stringify({
    checked: [1, 2, 3].map((n) => steps.includes(n)),
    filter: 'all',
    sortMode: 'guide',
    prerequisitesOpen: false,
    darkMode: true,
  })

const OLD = {
  'nebuloso:done': JSON.stringify({ 1: true }),
  'nebuloso:guide': '1',
  'nebuloso:questModel': '2',
  'nebuloso:prereqs': JSON.stringify({ l1: true }),
  'nebuloso:owned': JSON.stringify({ 'x:kama#1': true }),
  dofus_nebuloso_clean_v1: classic([2]),
}

/** Escribe las claves antiguas antes de que cargue la página, solo si aún no están. */
async function seedOld(page: Page, keys: Record<string, string>) {
  await page.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      if (localStorage.getItem(key) == null) localStorage.setItem(key, value)
    }
  }, keys)
}

const stepBox = (page: Page, n: number) => page.getByRole('checkbox', { name: `Paso ${n} hecho` })
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ta-web:progress') ?? 'null'))

test.describe('migración del progreso de silvestre-checklist', () => {
  test('trae los pasos, el clásico, los prerrequisitos y lo conseguido, una sola vez', async ({
    page,
  }) => {
    await seedOld(page, OLD)
    await page.goto(url)
    await expect(stepBox(page, 1)).toBeChecked()
    // El clásico sin traer suma el paso 2
    await expect(stepBox(page, 2)).toBeChecked()
    await expect(stepBox(page, 3)).not.toBeChecked()
    await expect(
      page.locator('#paso-1').getByRole('checkbox', { name: `Ya tengo ${neb.labels.kama}` }),
    ).toBeChecked()
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    await expect(
      page.getByRole('checkbox', { name: neb.prerequisites[0]!.rows[0]!.text }),
    ).toBeChecked()

    const saved = await stored(page)
    expect(Object.keys(saved.migrated)).toEqual(['nebuloso'])
    // Las claves antiguas siguen ahí, tal cual
    const old = await page.evaluate(
      (keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
      Object.keys(OLD),
    )
    expect(old).toEqual(OLD)

    // Ya migrada: lo que se desmarca aquí sigue desmarcado al recargar
    await page.getByRole('tab', { name: 'Diario' }).click()
    await stepBox(page, 1).uncheck()
    await page.reload()
    await expect(stepBox(page, 2)).toBeChecked()
    await expect(stepBox(page, 1)).not.toBeChecked()
  })

  test('lo hecho en otra checklist antigua (dofus-checklists:shared) sale hecho allí', async ({
    page,
  }) => {
    await seedOld(page, {
      'dofus-checklists:shared': JSON.stringify({
        hielos: { name: 'Dofus de los Hielos', quests: [1976], owned: [] },
      }),
    })
    await page.goto(url)
    const giver = page
      .locator('#paso-1 .ck-q')
      .filter({ has: page.locator('.ck-q__t', { hasText: seedGuide.title }) })
    await expect(giver.locator('[data-ck-lock]')).toHaveText(
      `Hecha en la checklist del ${seedChecklists.hielos.name}`,
    )
  })

  test('sin claves antiguas, la migración no se descarga', async ({ page }) => {
    const scripts = async (seed: Record<string, string>) => {
      const context = await page.context().browser()!.newContext()
      const tab = await context.newPage()
      await tab.addInitScript((s) => {
        for (const [key, value] of Object.entries(s)) localStorage.setItem(key, value)
      }, seed)
      const urls: string[] = []
      tab.on('request', (request) => {
        if (request.resourceType() === 'script') urls.push(request.url())
      })
      await tab.goto(url)
      await expect(tab.getByRole('checkbox', { name: 'Paso 1 hecho' })).toBeVisible()
      await tab.waitForLoadState('networkidle')
      await context.close()
      return urls
    }
    const without = await scripts({})
    const withOld = await scripts(OLD)
    expect(withOld.filter((script) => !without.includes(script))).toHaveLength(1)
  })
})
