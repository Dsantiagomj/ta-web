import { expect, test, type Page } from '@playwright/test'

import { seedChecklists } from './seed/checklists.ts'
import { seedGuide } from './seed/guides.ts'

// Las fuentes de src/styles/fonts.ts: dos archivos precargados, Montserrat (el texto, una
// fuente variable de la que salen todos los pesos) y Rowdies (el h1), sin negritas
// sintetizadas. Lexend, la interfaz, llega cuando algo la usa.

/** Las @font-face de la página: URL del archivo, familia y peso. */
function fontFaces(page: Page) {
  return page.evaluate(() =>
    [...document.styleSheets].flatMap((sheet) =>
      [...sheet.cssRules].flatMap((rule) => {
        if (!(rule instanceof CSSFontFaceRule)) return []
        const style = rule.style
        const src = style.getPropertyValue('src').match(/url\("?([^")]+)"?\)/)?.[1]
        if (!src) return []
        return [
          {
            url: new URL(src, sheet.href ?? location.href).pathname,
            family: style.getPropertyValue('font-family').replaceAll('"', ''),
            weight: style.getPropertyValue('font-weight'),
          },
        ]
      }),
    ),
  )
}

for (const path of ['/', `/${seedGuide.slug}`]) {
  test(`${path} precarga solo los archivos de Montserrat y Rowdies`, async ({ page }) => {
    await page.goto(path)
    const preloads = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((links) => links.map((link) => new URL((link as HTMLLinkElement).href).pathname))
    const faces = await fontFaces(page)
    const preloaded = preloads.map((url) => faces.find((face) => face.url === url)?.family)

    expect(preloaded.sort()).toEqual(['Montserrat', 'Rowdies'])
  })
}

test('todos los pesos de Montserrat salen de su archivo, en una sola familia', async ({ page }) => {
  await page.goto(`/${seedGuide.slug}`)
  const faces = (await fontFaces(page)).filter((face) => face.family === 'Montserrat')
  expect([...new Set(faces.map((face) => face.weight))].sort()).toEqual([
    '400',
    '500',
    '600',
    '700',
    '800',
  ])
  // Es una fuente variable: todos los pesos usan los mismos archivos (uno por subconjunto
  // de caracteres; la página solo baja el latin).
  const filesOf = (weight: string) =>
    faces
      .filter((face) => face.weight === weight)
      .map((face) => face.url)
      .sort()
  for (const weight of ['500', '600', '700', '800']) expect(filesOf(weight)).toEqual(filesOf('400'))
  // Los estilos nombran la familia entera, no la de una instancia; Nunito y Fredoka ya no están.
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(body).toMatch(/^"?Montserrat"?,/)
  expect(await fontFaces(page)).not.toContainEqual(
    expect.objectContaining({ family: expect.stringMatching(/^(Nunito|Fredoka)$/) }),
  )

  // La guía usa 700 (el título y las negritas) y 800 (las cantidades): el navegador los
  // pinta con el archivo variable en vez de sintetizar la negrita del 400.
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter(
        (face) => face.family.replaceAll('"', '') === 'Montserrat' && face.status === 'loaded',
      )
      .map((face) => face.weight),
  )
  expect(loaded).toEqual(expect.arrayContaining(['400', '700', '800']))
})

test('el título de la guía es Rowdies 700 y los encabezados de sus partes, Lexend', async ({
  page,
}) => {
  await page.goto(`/${seedGuide.slug}`)
  await page.evaluate(() => document.fonts.ready)
  const font = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el)
        return { family: s.fontFamily.split(',')[0].replaceAll('"', ''), weight: s.fontWeight }
      })
  expect(await font('h1')).toEqual({ family: 'Rowdies', weight: '700' })
  expect(await font('.qhead__facts h2')).toEqual({ family: 'Lexend', weight: '700' })
  // Los dos con su archivo, sin una negrita sintetizada del 400.
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter((face) => face.status === 'loaded')
      .map((face) => `${face.family.replaceAll('"', '')} ${face.weight}`),
  )
  expect(loaded).toContain('Rowdies 700')
  expect(loaded.some((face) => face.startsWith('Lexend '))).toBe(true)
})

// Los títulos de tarjeta, los botones y los antetítulos van en Lexend y el título de la guía en
// Rowdies (DESIGN.md, Typography): no quedan en el Montserrat de antes de la opción D.
test('los títulos de las tarjetas, los botones y los antetítulos van en Lexend', async ({
  page,
}) => {
  const family = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"', ''))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  for (const selector of [
    '.tour__step h3',
    '.trio__t',
    '.join__t',
    '.ask__q',
    '.ft-h',
    '.ft-eyebrow',
  ]) {
    expect(await family(selector), selector).toBe('Lexend')
  }
  expect(await family('.spec__t'), '.spec__t').toBe('Rowdies')
  await page.locator('.np[aria-controls="menu-dofus"]').click()
  for (const selector of ['#menu-dofus .panel__h', '#menu-dofus .feat__t', '#menu-dofus .chk__t']) {
    expect(await family(selector), selector).toBe('Lexend')
  }
  await page.goto(`/${seedChecklists.nebuloso.slug}`)
  for (const selector of ['.ck-seg__b', '.ck-btn']) {
    expect(await family(selector), selector).toBe('Lexend')
  }
})
