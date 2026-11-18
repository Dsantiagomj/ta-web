import { expect, test, type Page } from '@playwright/test'

import { LEGACY_SITE_ORIGIN } from '../../src/lib/site/legacy.ts'
import { seedDofus } from './seed/dofus-guides.ts'
import { seedGuide } from './seed/guides.ts'

// Un enlace a otra web (Discord, Twitch, Kick, YouTube, Ko-fi…) se abre en otra pestaña con
// rel="noopener" y avisa al lector de pantalla; uno del sitio se abre en la misma
// (DESIGN.md, Accessibility).

const NEW_TAB = ' (se abre en otra pestaña)'
const OWN_DOMAIN = new URL(LEGACY_SITE_ORIGIN).hostname.replace(/^www\./, '')
const PAGES = ['/', `/${seedGuide.slug}`, `/${seedDofus.ocre.slug}`, '/checklists']

interface LinkInfo {
  href: string
  where: string
  target: string | null
  rel: string | null
  name: string
}

/** Cada enlace de la página (la hoja del móvil incluida, aunque esté cerrada), con su sitio. */
async function links(page: Page): Promise<LinkInfo[]> {
  return page.locator('a[href]').evaluateAll((anchors) =>
    anchors.map((a) => ({
      href: (a as HTMLAnchorElement).href,
      where: a.closest('header, footer, main, dialog')?.tagName.toLowerCase() ?? 'body',
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      name: a.getAttribute('aria-label') ?? a.textContent ?? '',
    })),
  )
}

const isExternal = (href: string) => {
  const url = new URL(href)
  if (!['http:', 'https:'].includes(url.protocol)) return false
  return url.hostname !== OWN_DOMAIN && !url.hostname.endsWith(`.${OWN_DOMAIN}`)
}

/** Lo que tiene el propio servidor de la prueba (localhost) no es otra web. */
const isOwnServer = (href: string, page: Page) =>
  new URL(href).origin === new URL(page.url()).origin

for (const path of PAGES) {
  test(`${path}: los enlaces a otras webs se abren en otra pestaña y lo dicen`, async ({
    page,
  }) => {
    await page.goto(path)
    const all = await links(page)
    const external = all.filter((l) => !isOwnServer(l.href, page) && isExternal(l.href))
    // La cabecera (Ko-fi y la hoja del móvil) y el pie (Discord, Ko-fi y los canales) al menos.
    expect(external.length).toBeGreaterThanOrEqual(10)
    for (const link of external) {
      const what = `${link.where}: ${link.href}`
      expect(link.target, what).toBe('_blank')
      expect(link.rel?.split(/\s+/), what).toContain('noopener')
      expect(link.name.trim().endsWith(NEW_TAB.trim()), `${what} «${link.name}»`).toBe(true)
    }
    // Los del sitio, en la cabecera y el pie, siguen en la misma pestaña.
    for (const link of all.filter((l) => isOwnServer(l.href, page))) {
      if (link.where === 'main') continue
      expect(link.target, `${link.where}: ${link.href}`).toBeNull()
    }
  })
}

test('«Únete al Discord» de la portada abre otra pestaña y la portada sigue ahí', async ({
  page,
  context,
}) => {
  await context.route('https://discord.gg/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Discord</title>' }),
  )
  await page.goto('/')
  const join = page
    .getByRole('region', { name: 'Las guías son de Torre' })
    .getByRole('link', { name: /Discord/ })
  await expect(join).toHaveAccessibleName(/\(se abre en otra pestaña\)$/)
  const [popup] = await Promise.all([context.waitForEvent('page'), join.click()])
  await expect(popup).toHaveURL(/^https:\/\/discord\.gg\//)
  await expect(page).toHaveURL(/\/$/)
})
