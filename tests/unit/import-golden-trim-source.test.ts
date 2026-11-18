import { describe, expect, it } from 'vitest'

import { trimSource } from '../../scripts/import/golden/trim-source'
import { parsePage } from '../../scripts/import/squarespace/parse-page'

// Las páginas de oro se guardan recortadas a lo que leen los conversores: el <title>, la
// descripción, el título de la colección del JSON de contexto y los <article> enteros. La
// cabecera, los scripts y el pie de Squarespace (dos tercios de la página) se van.

const article = `<article class="page-regions"><section><div class="fluid-engine" data-fluid-engine>
<style>@media (min-width: 768px) { .fe-block-b { grid-area: 1/1/2/2; } .fe-block-a { grid-area: 2/1/3/2; } }</style>
<div class="fe-block fe-block-a"><div data-sqsp-block="text"><div data-sqsp-text-block-content><p>Segundo</p></div></div></div>
<div class="fe-block fe-block-b"><div data-sqsp-block="text"><div data-sqsp-text-block-content><h2>PRIMERO</h2></div></div></div>
</div></section></article>`

const page = `<!doctype html><html lang="es-ES"><head>
<meta charset="utf-8">
<title>EL CAZADOR CAZADO &mdash; Torrente Arcano</title>
<meta name="description" content="Una guía &quot;corta&quot;.">
<link rel="stylesheet" href="https://static1.squarespace.com/site.css">
<script>window.analytics = {"collection":{"id":"no-es-el-titulo"}};</script>
<script>Static.SQUARESPACE_CONTEXT = {"website":{"id":"1"},"collection":{"title":"El \\"cazador\\" cazado","id":"6a"}};</script>
<style>body { color: red }</style>
</head><body><header><nav>Menú</nav></header><main>${article}</main>
<footer><p>Pie</p></footer><script src="https://static1.squarespace.com/site-bundle.js"></script></body></html>`

describe('trimSource', () => {
  it('guarda el título, la descripción, el título de la colección y el article tal cual', () => {
    const trimmed = trimSource(page)
    expect(trimmed).toContain('<title>EL CAZADOR CAZADO &mdash; Torrente Arcano</title>')
    expect(trimmed).toContain('<meta name="description" content="Una guía &quot;corta&quot;.">')
    expect(trimmed).toContain(
      '<script>Static.SQUARESPACE_CONTEXT = {"collection":{"title":"El \\"cazador\\" cazado"}};</script>',
    )
    expect(trimmed).toContain(article)
  })

  it('guarda todos los article, en su orden', () => {
    const two = page.replace('</main>', '<article><p>Otro</p></article></main>')
    const trimmed = trimSource(two)
    expect(trimmed.indexOf(article)).toBeLessThan(trimmed.indexOf('<article><p>Otro</p></article>'))
  })

  it('quita la cabecera, los scripts, los estilos y el pie de fuera del article', () => {
    const trimmed = trimSource(page)
    for (const gone of ['Menú', 'Pie', 'site.css', 'site-bundle.js', 'color: red', 'analytics']) {
      expect(trimmed).not.toContain(gone)
    }
    expect(trimmed.length).toBeLessThan(page.length)
  })

  it('los conversores leen lo mismo de la página recortada que de la entera', () => {
    expect(parsePage(trimSource(page))).toEqual(parsePage(page))
    expect(parsePage(trimSource(page)).title).toBe('El "cazador" cazado')
  })

  it('quita del article los atributos de Squarespace que ningún conversor lee', () => {
    const image =
      '<div class="fe-block fe-block-c"><div data-sqsp-block="image" data-block-css="[&quot;a.css&quot;]" ' +
      'data-block-scripts="[&quot;b.js&quot;]" data-current-styles="{}" data-breakpoints="[]">' +
      '<img data-src="https://images.squarespace-cdn.com/x.png" data-image="https://images.squarespace-cdn.com/x.png" ' +
      'srcset="https://images.squarespace-cdn.com/x.png?format=100w 100w" sizes="100vw" alt="Mapa"></div></div>'
    const withImage = page.replace(
      '</div></section></article>',
      `${image}</div></section></article>`,
    )
    const trimmed = trimSource(withImage)
    for (const gone of [
      'data-block-css',
      'data-block-scripts',
      'data-current-styles',
      'data-breakpoints',
      'srcset',
      'sizes=',
    ]) {
      expect(trimmed).not.toContain(gone)
    }
    expect(trimmed).toContain('data-image="https://images.squarespace-cdn.com/x.png"')
    expect(parsePage(trimmed)).toEqual(parsePage(withImage))
  })

  it('una página sin descripción ni contexto se recorta sin ellos', () => {
    const bare = `<html><head><title>X</title></head><body>${article}</body></html>`
    const trimmed = trimSource(bare)
    expect(trimmed).not.toContain('description')
    expect(trimmed).not.toContain('SQUARESPACE_CONTEXT')
    expect(parsePage(trimmed)).toEqual(parsePage(bare))
  })

  it('falla si la página no tiene ningún article: no hay nada que guardar', () => {
    expect(() => trimSource('<html><head><title>X</title></head><body></body></html>')).toThrow(
      /article/,
    )
  })

  it('recortar dos veces da lo mismo que una', () => {
    expect(trimSource(trimSource(page))).toBe(trimSource(page))
  })
})
