import { expect, test, type Page } from '@playwright/test'

import { seedGuide } from './seed/guides.ts'

// Las fuentes de src/styles/fonts.ts: solo dos archivos precargados y una sola familia por
// tipografía, para que cada peso use su propio archivo y nunca una negrita sintetizada.

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
  test(`${path} precarga solo Nunito 400 y Fredoka 600`, async ({ page }) => {
    await page.goto(path)
    const preloads = await page
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((links) => links.map((link) => new URL((link as HTMLLinkElement).href).pathname))
    const faces = await fontFaces(page)
    const preloaded = preloads
      .map((url) => faces.find((face) => face.url === url))
      .map((face) => face && `${face.family} ${face.weight}`)

    expect(preloaded.sort()).toEqual(['Fredoka 600', 'Nunito 400'])
  })
}

test('cada peso de Nunito sale de su propio archivo, en una sola familia', async ({ page }) => {
  await page.goto(`/${seedGuide.slug}`)
  const faces = await fontFaces(page)
  const weightsOf = (family: string) =>
    [...new Set(faces.filter((face) => face.family === family).map((face) => face.weight))].sort()
  expect(weightsOf('Nunito')).toEqual(['400', '500', '600', '700', '800'])
  expect(weightsOf('Fredoka')).toEqual(['500', '600'])
  // Los estilos nombran la familia entera, no la de una instancia.
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(body).toMatch(/^"?Nunito"?,/)

  // La guía usa 700 (las negritas de la prosa) y 800 (las cantidades del resumen): el
  // navegador carga esos archivos en vez de sintetizar la negrita del 400.
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter((face) => face.family.replaceAll('"', '') === 'Nunito' && face.status === 'loaded')
      .map((face) => face.weight),
  )
  expect(loaded).toEqual(expect.arrayContaining(['400', '700', '800']))
})
