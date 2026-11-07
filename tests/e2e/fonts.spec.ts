import { expect, test, type Page } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// Las fuentes de src/styles/fonts.ts: un solo archivo precargado, Montserrat, una fuente
// variable de la que salen todos los pesos, sin negritas sintetizadas.

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
  test(`${path} precarga solo el archivo de Montserrat`, async ({ page }) => {
    await page.goto(path)
    const preloads = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((links) => links.map((link) => new URL((link as HTMLLinkElement).href).pathname))
    const faces = await fontFaces(page)
    const preloaded = preloads.map((url) => faces.find((face) => face.url === url)?.family)

    expect(preloaded).toEqual(['Montserrat'])
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
