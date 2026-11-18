import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

import { seedAchievement } from './seed/achievements.ts'
import { seedChecklists } from './seed/checklists.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'
import { seedPages } from './seed/pages.ts'

// Lo que se ve al compartir un enlace y lo que leen los buscadores (backlog S-19, DESIGN.md,
// Share card; AGENTS.md, SEO): og:image con su tamaño y texto, la tarjeta de summary_large_image,
// la imagen que responde y se guarda, el Article en JSON-LD y «Actualizado el» (D-03).

const PAGES = [
  { name: 'la guía de misión', path: `/${seedGuide.slug}`, article: true, type: 'image/jpeg' },
  { name: 'el logro', path: `/${seedAchievement.slug}`, article: true },
  { name: 'la guía de Dofus', path: `/${seedDofus.ocre.slug}`, article: true },
  { name: 'la página suelta', path: `/${seedPages.emote.slug}`, article: true },
  { name: 'la checklist', path: `/${seedChecklists.nebuloso.slug}`, article: false },
]

const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute('content')

/** El JSON-LD de la página que no es de las migas. */
async function article(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  return blocks.map((text) => JSON.parse(text)).find((data) => data['@type'] === 'Article')
}

test.describe('al compartir', () => {
  for (const { name, path, article: hasArticle, type } of PAGES) {
    test(`${name}: og:image es su tarjeta, de 1200 × 630, y responde una imagen ligera`, async ({
      page,
      request,
      baseURL,
    }) => {
      await page.goto(path)
      const image = await meta(page, 'og:image')
      expect(image).toMatch(new RegExp(`^${baseURL}${path}/og\\?v=[0-9a-z]+$`))
      expect(await meta(page, 'og:image:width')).toBe('1200')
      expect(await meta(page, 'og:image:height')).toBe('630')
      expect(await meta(page, 'og:image:alt')).toMatch(/\. Torrente Arcano$/)
      expect(await meta(page, 'twitter:card')).toBe('summary_large_image')
      expect(await meta(page, 'twitter:image')).toBe(image)

      const response = await request.get(image!)
      expect(response.status()).toBe(200)
      const contentType = response.headers()['content-type']
      expect(contentType).toMatch(/^image\/(png|jpeg)$/)
      if (type) expect(contentType).toBe(type)
      const body = await response.body()
      expect(body.length).toBeLessThanOrEqual(200 * 1024)
      const { width, height } = await sharp(body).metadata()
      expect([width, height]).toEqual([1200, 630])

      const data = await article(page)
      if (!hasArticle) {
        expect(data).toBeUndefined()
        return
      }
      expect(data).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Article',
        inLanguage: 'es',
        image: [image],
        author: { '@type': 'Person', name: 'Torre' },
        publisher: { '@type': 'Organization', name: 'Torrente Arcano' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseURL}${path}` },
      })
      expect(data.headline).toBeTruthy()
      expect(data.description).toBeTruthy()
      expect(Date.parse(data.datePublished)).not.toBeNaN()
      expect(Date.parse(data.dateModified)).toBeGreaterThanOrEqual(Date.parse(data.datePublished))
      expect((await request.get(data.publisher.logo.url)).status()).toBe(200)
    })
  }

  test('la tarjeta se guarda: la segunda petición sale de la caché', async ({ page, request }) => {
    await page.goto(`/${seedGuide.slug}`)
    const image = (await meta(page, 'og:image'))!
    await request.get(image)
    const again = await request.get(image)
    expect(again.headers()['x-nextjs-cache']).toBe('HIT')
    expect(again.headers()['cache-control']).toMatch(/s-maxage=\d+/)
  })

  test('la portada: la tarjeta de la marca, sin imagen de Torre', async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto('/')
    const image = await meta(page, 'og:image')
    expect(image).toBe(`${baseURL}/og`)
    expect(await meta(page, 'twitter:card')).toBe('summary_large_image')
    const response = await request.get(image!)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
  })

  test('la portada dice qué sitio es y cómo se busca en él (WebSite y SearchAction)', async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto('/')
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    const site = blocks.map((text) => JSON.parse(text)).find((data) => data['@type'] === 'WebSite')
    expect(site).toMatchObject({
      url: `${baseURL}/`,
      inLanguage: 'es',
      potentialAction: {
        '@type': 'SearchAction',
        target: { urlTemplate: `${baseURL}/buscar?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    })
    // La plantilla lleva a una página de resultados que responde.
    const search = site.potentialAction.target.urlTemplate.replace('{search_term_string}', 'tierra')
    expect((await request.get(search)).status()).toBe(200)
  })

  test('una dirección sin página no tiene tarjeta', async ({ request }) => {
    expect((await request.get('/no-existe-esta-guia/og')).status()).toBe(404)
  })
})

test.describe('«Actualizado el»', () => {
  test('la guía dice cuándo la cambió Torre, con <time datetime>', async ({ page }) => {
    await page.goto(`/${seedGuide.slug}`)
    const line = page.locator('.qhead .qhead__updated')
    await expect(line).toHaveText(seedGuide.updated)
    await expect(line.locator('time')).toHaveAttribute('datetime', '2026-11-15')
    // El JSON-LD dice la misma fecha.
    expect((await article(page)).dateModified).toBe(seedGuide.contentUpdatedAt)
  })

  for (const { name, path } of PAGES.slice(1)) {
    test(`${name} también la dice en su cabecera`, async ({ page }) => {
      await page.goto(path)
      const line = page.locator('header :is(.qhead__updated, .ck-head__updated)')
      await expect(line).toHaveText(/^Actualizado el \d{1,2} de [a-z]+ de \d{4}$/)
      await expect(line.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
    })
  }
})
