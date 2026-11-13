import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'

// El progreso de la checklist, guardado en el navegador (ta-web:progress) sobre el Nebuloso que
// siembra scripts/seed-e2e.ts: el paso 1 lleva «Seis pies bajo tierra», que también lleva la
// checklist del Dofus de los Hielos; el 2 para en el segundo objetivo de «Sangre fría», que
// pide terminada la del paso 1; el 3 cierra el 2.

const neb = seedChecklists.nebuloso
const url = `/${neb.slug}`
const KEY = 'ta-web:progress'

const step = (page: Page, n: number) => page.locator(`#paso-${n}`)
const quest = (page: Page, n: number, name: string) =>
  step(page, n).locator('.ck-q', { has: page.locator('.ck-q__t', { hasText: name }) })
const questButton = (page: Page, n: number, name: string) =>
  quest(page, n, name).locator('[data-q-hit]')
const pct = (page: Page) => page.locator('[data-ck-pct]')
const stepBox = (page: Page, n: number) => page.getByRole('checkbox', { name: `Paso ${n} hecho` })
const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY)

// El paso abierto entra con un fundido: axe mide el contraste cuando ya ha terminado.
const settled = (page: Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))
}

test.describe('progreso de una checklist', () => {
  test('marcar una misión la da por hecha, completa su paso y sobrevive a recargar', async ({
    page,
  }) => {
    await page.goto(url)
    await expect(pct(page)).toHaveText('0 %')
    const button = questButton(page, 1, seedGuide.title)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    // Su única misión hecha: el paso queda hecho solo
    await expect(stepBox(page, 1)).toBeChecked()
    await expect(pct(page)).not.toHaveText('0 %')
    const saved = await stored(page)
    expect(saved.v).toBe(1)
    expect(saved.quests['1976'].o).toBe('done')

    await page.reload()
    await expect(stepBox(page, 1)).toBeChecked()
    await expect(questButton(page, 1, seedGuide.title)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('1/3 pasos')).toBeVisible()
  })

  test('«Completar paso» marca el paso y abre el siguiente; desmarcarlo lo deja como estaba', async ({
    page,
  }) => {
    await page.goto(url)
    await step(page, 1).getByRole('button', { name: 'Completar paso 1' }).click()
    await expect(stepBox(page, 1)).toBeChecked()
    await expect(step(page, 2)).toBeVisible()
    await page.locator('.ck-row[data-n="1"] a').click()
    await step(page, 1).getByRole('button', { name: 'Desmarcar paso 1' }).click()
    await expect(stepBox(page, 1)).not.toBeChecked()
    expect((await stored(page)).quests['1976']).toBeUndefined()
  })

  test('el «detente aquí» deja su misión en la parada y la termina el paso que lo cierra', async ({
    page,
  }) => {
    await page.goto(`${url}#paso-2`)
    await stepBox(page, 2).check()
    const sangre = quest(page, 2, neb.stopQuest.name)
    // En el paso que para, hecha; guardada en el objetivo de la parada
    await expect(sangre).toHaveAttribute('data-state', 'done')
    expect((await stored(page)).quests[String(neb.stopQuest.dofusId)].o).toBe(
      neb.stopQuest.stopObjective,
    )
    await stepBox(page, 3).check()
    expect((await stored(page)).quests[String(neb.stopQuest.dofusId)].o).toBe('done')
    await page.locator('.ck-row[data-n="2"] a').click()
    await expect(sangre.locator('[data-ck-lock]')).toHaveText('Hecha en el paso 3')
    await expect(sangre.locator('[data-q-hit]')).toBeDisabled()
  })

  test('la misión que pide terminada otra hecha sale hecha y dice cuál', async ({ page }) => {
    await page.goto(url)
    // El 3 cierra el 2 y termina «Sangre fría», que pide la del paso 1
    await stepBox(page, 3).check()
    const giver = quest(page, 1, seedGuide.title)
    await expect(giver).toHaveAttribute('data-state', 'done')
    await expect(giver.locator('[data-ck-lock]')).toHaveText(`La pide “${neb.stopQuest.name}”`)
    await expect(giver.locator('[data-q-hit]')).toBeDisabled()
  })

  test('lo hecho en otra checklist sale hecho y bloqueado, y cuenta en el porcentaje', async ({
    page,
  }) => {
    await page.goto(`/${seedChecklists.hielos.slug}`)
    await questButton(page, 1, seedGuide.title).click()
    await expect(stepBox(page, 1)).toBeChecked()

    await page.goto(url)
    const giver = quest(page, 1, seedGuide.title)
    await expect(giver.locator('[data-ck-lock]')).toHaveText(
      `Hecha en la checklist del ${seedChecklists.hielos.name}`,
    )
    await expect(giver.locator('[data-q-hit]')).toHaveAttribute('aria-pressed', 'true')
    await expect(giver.locator('[data-q-hit]')).toBeDisabled()
    await expect(pct(page)).not.toHaveText('0 %')
  })

  test('los filtros Pendientes y Hechos', async ({ page }) => {
    await page.goto(url)
    await stepBox(page, 1).check()
    const rows = page.locator('.ck-row:not([hidden])')
    await page.getByRole('button', { name: /^Hechos/ }).click()
    await expect(rows).toHaveCount(1)
    await page.getByRole('button', { name: /^Pendientes/ }).click()
    await expect(rows).toHaveCount(2)
    await page.getByRole('button', { name: /^Todos/ }).click()
    await expect(rows).toHaveCount(3)
  })

  test('los prerrequisitos se marcan, cuentan en su pestaña y se guardan', async ({ page }) => {
    await page.goto(url)
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    const panel = page.getByRole('tabpanel', { name: /Prerrequisitos/ })
    await panel.getByRole('checkbox', { name: neb.prerequisites[0]!.rows[0]!.text }).check()
    await expect(page.getByRole('tab', { name: /Prerrequisitos/ }).locator('.ck-badge')).toHaveText(
      '1',
    )
    await panel.getByRole('button', { name: 'Marcar todo' }).click()
    await expect(page.getByRole('tab', { name: /Prerrequisitos/ }).locator('.ck-badge')).toHaveText(
      '✓',
    )
    await page.reload()
    await page.getByRole('tab', { name: /Prerrequisitos/ }).click()
    await expect(panel.getByRole('checkbox').first()).toBeChecked()
  })

  test('Objetos: lo conseguido se marca y lo de los pasos hechos pasa a «Ya utilizados»', async ({
    page,
  }) => {
    await page.goto(url)
    await step(page, 1)
      .getByRole('checkbox', { name: `Ya tengo ${neb.labels.kama}` })
      .check()
    await page.getByRole('tab', { name: /Objetos/ }).click()
    const panel = page.getByRole('tabpanel', { name: /Objetos/ })
    const kama = panel.locator('.ck-slot', { hasText: neb.labels.kama })
    await expect(kama.getByRole('checkbox')).toBeChecked()
    const soon = panel.locator('[data-ck-group="soon"]')
    await expect(soon.getByRole('heading', { name: /Tus próximos pasos/ })).toBeVisible()
    const ojo = seedDofus.ocre.needsItems[1]!.name
    await expect(soon.locator('.ck-slot', { hasText: ojo })).toBeVisible()

    // Hecho el paso 2, lo que solo pedía él está gastado
    await page.getByRole('tab', { name: 'Diario' }).click()
    await stepBox(page, 2).check()
    await page.getByRole('tab', { name: /Objetos/ }).click()
    await expect(panel.locator('[data-ck-group="used"]')).toBeHidden()
    await panel.getByText('Solo pasos pendientes').click()
    const used = panel.locator('[data-ck-group="used"]')
    await expect(used.locator('.ck-slot', { hasText: ojo })).toBeVisible()
  })

  test('la copia de seguridad se descarga y se restaura; reiniciar pide confirmación', async ({
    page,
  }) => {
    await page.goto(url)
    await stepBox(page, 1).check()
    const before = await pct(page).textContent()

    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Copia de seguridad' }).click()
    const dialog = page.getByRole('dialog', { name: 'Copia de seguridad' })
    await expect(dialog.getByText('Aún no has descargado ninguna copia.')).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Descargar copia' }).click(),
    ])
    const file = await download.path()
    const backup = JSON.parse(readFileSync(file, 'utf8'))
    expect(backup).toMatchObject({ app: 'ta-web', kind: 'checklist-progress', v: 1 })
    await expect(dialog.getByText('Tu última copia es de hoy.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Cerrar' }).click()

    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Reiniciar el progreso' }).click()
    const reset = page.getByRole('dialog', { name: 'Reiniciar el progreso' })
    await reset.getByRole('button', { name: 'Cancelar' }).click()
    await expect(stepBox(page, 1)).toBeChecked()
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Reiniciar el progreso' }).click()
    await reset.getByRole('button', { name: 'Reiniciar', exact: true }).click()
    await expect(stepBox(page, 1)).not.toBeChecked()
    await expect(pct(page)).toHaveText('0 %')

    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Copia de seguridad' }).click()
    await dialog.locator('[data-ck-restore]').setInputFiles(file)
    await expect(page.getByRole('status').filter({ hasText: 'Copia restaurada.' })).toBeVisible()
    await expect(stepBox(page, 1)).toBeChecked()
    await expect(pct(page)).toHaveText(before ?? '')
  })

  test('un archivo que no es una copia no cambia nada', async ({ page }) => {
    await page.goto(url)
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Copia de seguridad' }).click()
    await page.locator('[data-ck-restore]').setInputFiles({
      name: 'otra.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hola":1}'),
    })
    await expect(
      page.getByRole('status').filter({ hasText: 'Ese archivo no es una copia' }),
    ).toBeVisible()
  })

  test('si el navegador no deja guardar, la checklist sigue funcionando', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError')
      }
    })
    await page.goto(url)
    await stepBox(page, 1).check()
    await expect(stepBox(page, 1)).toBeChecked()
    await expect(page.getByRole('status').filter({ hasText: 'no deja guardar' })).toBeVisible()
  })

  test('sin JavaScript no sale nada del progreso', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(url)
    await expect(page.locator('.ck-strip')).toBeHidden()
    await expect(page.locator('[data-step-check]').first()).toBeHidden()
    await expect(page.locator('[data-q-hit]').first()).toBeHidden()
    await context.close()
  })

  test('cerrar el reinicio sin elegir (Escape o un clic fuera) después de reiniciar no vuelve a borrar', async ({
    page,
  }) => {
    await page.goto(url)
    const reset = page.getByRole('dialog', { name: 'Reiniciar el progreso' })
    const open = async () => {
      await page.getByRole('button', { name: 'Más opciones' }).click()
      await page.getByRole('button', { name: 'Reiniciar el progreso' }).click()
      await expect(reset).toBeVisible()
    }
    /** Cierra el diálogo y espera a su evento «close», que llega después, en otra tarea. */
    const closeBy = async (action: () => Promise<void>) => {
      const closed = page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            document
              .querySelector('[data-ck-dialog="reset"]')!
              .addEventListener('close', () => setTimeout(resolve), { once: true }),
          ),
      )
      await action()
      await closed
    }
    await open()
    await closeBy(() => reset.getByRole('button', { name: 'Reiniciar', exact: true }).click())
    await stepBox(page, 1).check()
    await open()
    await closeBy(() => page.mouse.click(5, 5))
    await expect(stepBox(page, 1)).toBeChecked()
    await open()
    await closeBy(() => page.keyboard.press('Escape'))
    await expect(stepBox(page, 1)).toBeChecked()
  })

  test('una copia con el progreso roto no borra nada y lo dice', async ({ page }) => {
    await page.goto(url)
    await stepBox(page, 1).check()
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Copia de seguridad' }).click()
    await page.locator('[data-ck-restore]').setInputFiles({
      name: 'rota.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'ta-web', kind: 'checklist-progress', v: 1 })),
    })
    await expect(page.locator('[data-ck-toast]')).toHaveText(/no es una copia/)
    // El aviso sale por encima del diálogo abierto, donde se ve y se anuncia
    await expect(page.locator('dialog[open] [data-ck-toast]')).toHaveCount(1)
    await expect(stepBox(page, 1)).toBeChecked()
    expect((await stored(page)).steps).not.toEqual({})
  })

  test('desmarcar en Necesitarás un objeto marcado entero lo deja sin marcar en ese paso', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return
      const owned = { 'x:kama': 1 }
      localStorage.setItem(
        key,
        JSON.stringify({ v: 1, quests: {}, steps: {}, prereqs: {}, owned, migrated: {} }),
      )
    }, KEY)
    await page.goto(url)
    const kama = step(page, 1).getByRole('checkbox', { name: `Ya tengo ${neb.labels.kama}` })
    await expect(kama).toBeChecked()
    await kama.uncheck()
    await expect(kama).not.toBeChecked()
    await page.reload()
    await expect(kama).not.toBeChecked()
  })

  test('«Completar paso» con el filtro Hechos abre el siguiente con su fila a la vista', async ({
    page,
  }) => {
    await page.goto(`${url}#paso-2`)
    await page.getByRole('button', { name: /^Hechos/ }).click()
    await step(page, 2).getByRole('button', { name: 'Completar paso 2' }).click()
    await expect(step(page, 3)).toBeVisible()
    const row = page.locator('.ck-row[data-n="3"]')
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute('aria-current', 'true')
  })

  test('pasa axe con progreso, con el menú y con la copia de seguridad abierta', async ({
    page,
  }) => {
    await page.goto(url)
    await stepBox(page, 2).check()
    await settled(page)
    expect(await axe(page)).toEqual([])
    await page.getByRole('button', { name: 'Más opciones' }).click()
    expect(await axe(page)).toEqual([])
    await page.getByRole('button', { name: 'Copia de seguridad' }).click()
    await settled(page)
    expect(await axe(page)).toEqual([])
  })
})
