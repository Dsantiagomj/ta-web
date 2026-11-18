import { describe, expect, it } from 'vitest'

import { BLOCKERS } from '../../scripts/legacy-links/blockers'
import {
  buildUrlMap,
  classifyOldUrl,
  parseSitemap,
  type SiteIndex,
  urlMapCounts,
  urlMapMarkdown,
  urlMapSummary,
} from '../../scripts/legacy-links/url-map'

// pnpm urls:map (backlog B-08): cada URL del sitemap de Squarespace y lo que este sitio hará
// con ella tras el cambio de dominio: servirla con el mismo slug, redirigirla, darle 410,
// dejarla aplazada o, si falta, quién o qué la desbloquea.

describe('parseSitemap', () => {
  it('las rutas de las URL de la web de Torre, sin repetir y sin las imágenes', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.torrentearcano.com/home</loc>
          <image:image><image:loc>https://images.squarespace-cdn.com/x.png</image:loc></image:image>
        </url>
        <url><loc>https://www.torrentearcano.com/Feca-1</loc></url>
        <url><loc>https://www.torrentearcano.com/home</loc></url>
        <url><loc>https://otra-web.com/nada</loc></url>
        <url><loc> https://www.torrentearcano.com/con-espacios&amp;cosas </loc></url>
      </urlset>`
    expect(parseSitemap(xml)).toEqual({
      pages: ['/home', '/Feca-1', '/con-espacios&cosas'],
      sitemaps: [],
    })
  })

  it('un índice de sitemaps da los sitemaps que hay que leer después', () => {
    const xml = `<sitemapindex>
        <sitemap><loc>https://www.torrentearcano.com/sitemap-pages.xml</loc></sitemap>
      </sitemapindex>`
    expect(parseSitemap(xml)).toEqual({
      pages: [],
      sitemaps: ['https://www.torrentearcano.com/sitemap-pages.xml'],
    })
  })
})

const site: SiteIndex = {
  documents: new Map([
    ['la-larga-marcha', { collection: 'achievement-pages', preparing: false }],
    ['aprendizaje-escudero', { collection: 'quest-guides', preparing: false }],
    ['dofus-ocre', { collection: 'dofus-guides', preparing: true }],
    ['aviso-legal', { collection: 'pages', preparing: true }],
  ]),
  slugMoves: new Map([['nombre-viejo', 'aprendizaje-escudero']]),
}

describe('classifyOldUrl', () => {
  it('lo que sirve el mismo slug: una página, una ruta propia, o lo En preparación', () => {
    expect(classifyOldUrl('/aprendizaje-escudero', site)).toEqual({
      kind: 'served',
      collection: 'quest-guides',
      preparing: false,
    })
    expect(classifyOldUrl('/La-Larga-Marcha/', site)).toMatchObject({
      kind: 'served',
      collection: 'achievement-pages',
    })
    expect(classifyOldUrl('/metalogros', site)).toEqual({
      kind: 'served',
      collection: 'route',
      preparing: false,
    })
    expect(classifyOldUrl('/', site)).toMatchObject({ kind: 'served', collection: 'route' })
    expect(classifyOldUrl('/dofus-ocre', site)).toEqual({
      kind: 'served',
      collection: 'dofus-guides',
      preparing: true,
      blocker: 'dofus-guides',
    })
  })

  it('la tabla de redirecciones va primero, con su sección; un slug cambiado da 308', () => {
    expect(classifyOldUrl('/home', site)).toEqual({
      kind: 'redirect',
      to: '/',
      status: 301,
      section: 'hubs',
    })
    expect(classifyOldUrl('/metalogro-misiones-principales', site)).toEqual({
      kind: 'redirect',
      to: '/metalogros#misiones-de-mundo',
      status: 301,
      section: 'metalogros',
    })
    expect(classifyOldUrl('/no-hay-cosa-mas-sana-que-una-manzana', site)).toMatchObject({
      kind: 'redirect',
      status: 307,
      section: 'stubs',
    })
    expect(classifyOldUrl('/nombre-viejo', site)).toEqual({
      kind: 'redirect',
      to: '/aprendizaje-escudero',
      status: 308,
      section: 'redirects',
    })
  })

  it('410 con su sección', () => {
    expect(classifyOldUrl('/subscribe', site)).toEqual({ kind: 'gone', section: 'hubs' })
    expect(classifyOldUrl('/frambuesa', site)).toEqual({ kind: 'gone', section: 'stubs' })
  })

  it('las clases, las mazmorras y las herramientas sin página aquí quedan aplazadas', () => {
    expect(classifyOldUrl('/clases-1', site)).toEqual({ kind: 'deferred', blocker: 'classes' })
    expect(classifyOldUrl('/pikabeto', site)).toEqual({ kind: 'deferred', blocker: 'dungeons' })
    expect(classifyOldUrl('/team-builder', site)).toEqual({ kind: 'deferred', blocker: 'tools' })
  })

  it('una clase con su página publicada se sirve, no se aplaza', () => {
    const withClass: SiteIndex = {
      ...site,
      documents: new Map([['feca-1', { collection: 'class-pages', preparing: false }]]),
    }
    expect(classifyOldUrl('/feca-1', withClass)).toMatchObject({ kind: 'served' })
  })

  it('lo que falta dice quién o qué lo desbloquea, y el porqué si hay nota', () => {
    expect(classifyOldUrl('/metalogro-krosmoz', site)).toEqual({ kind: 'missing', blocker: 'S-08' })
    expect(classifyOldUrl('/formacion-de-primer-ao', site)).toEqual({
      kind: 'missing',
      blocker: 'stub',
    })
  })

  it('una guía que Torre escribió en Squarespace después de la importación espera el delta', () => {
    // Un esbozo que llenó (FILLED_STUBS) y una página nueva del sitemap.
    for (const path of ['/se-busca-darma', '/corazon-de-piedra', '/hablar-con-volkaragnar']) {
      expect(classifyOldUrl(path, site)).toEqual({ kind: 'missing', blocker: 'delta-import' })
    }
  })
})

describe('el mapa', () => {
  const rows = buildUrlMap(
    [
      '/aprendizaje-escudero',
      '/dofus-ocre',
      '/home',
      '/subscribe',
      '/clases-1',
      '/metalogro-krosmoz',
      '/hablar-con-volkaragnar',
    ],
    site,
  )

  it('cuenta cada destino; lo En preparación se sirve pero también está por resolver', () => {
    expect(urlMapCounts(rows)).toEqual({
      total: 7,
      served: 2,
      preparing: 1,
      redirect: 1,
      gone: 1,
      deferred: 1,
      missing: 2,
    })
  })

  it('el resumen de la consola, en español', () => {
    const lines = urlMapSummary(rows)
    expect(lines[0]).toBe(
      'URL de Squarespace: 7. Mismo slug: 2 (1 En preparación). Redirección: 1. 410: 1. Aplazadas: 1. Faltan: 2.',
    )
    expect(lines).toContain(`  ${BLOCKERS.classes.es}: 1`)
    expect(lines).toContain(`  ${BLOCKERS['dofus-guides'].es}: 1`)
  })

  it('el documento, en inglés: resumen, lo pendiente por bloqueo y cada URL', () => {
    const md = urlMapMarkdown(rows, {
      generated: '2026-11-18',
      source: 'dev',
      sitemap: 'https://www.torrentearcano.com/sitemap.xml',
    })
    expect(md).toMatch(/^# Old URL to new page map\n/)
    expect(md).toContain('pnpm urls:map')
    expect(md).toContain('| Served by the same slug | 2 |')
    expect(md).toContain(`### ${BLOCKERS.classes.en} (1)`)
    expect(md).toContain('| `/clases-1` | Deferred |')
    expect(md).toContain('| `/dofus-ocre` | Served, «En preparación» |')
    expect(md).toContain(`### ${BLOCKERS['delta-import'].en} (1)`)
    expect(md).toContain('| `/hablar-con-volkaragnar` | Missing |')
    expect(md).toContain('| `/home` | `/` | 301 | `hubs` |')
    expect(md).toContain('| `/subscribe` | `hubs` |')
    expect(md).toContain('`/aprendizaje-escudero`')
    expect(md.endsWith('\n')).toBe(true)
  })
})
