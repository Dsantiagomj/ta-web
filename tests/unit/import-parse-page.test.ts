import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { parsePage, type PageBlock } from '../../scripts/import/squarespace/parse-page'

function fixture(slug: string): string {
  return readFileSync(path.join(__dirname, '../fixtures/squarespace', `${slug}.html`), 'utf8')
}

/** Un resumen legible de cada bloque, para comparar el orden. */
function outline(blocks: PageBlock[]): string[] {
  return blocks.map((block) => {
    if (block.type === 'text') return `text: ${block.elements[0]?.text.slice(0, 30) ?? ''}`
    if (block.type === 'image') return `image: ${block.url.split('/').pop()}`
    if (block.type === 'video') return `video: ${block.url}`
    return `unknown: ${block.sqspType}`
  })
}

/** Una página mínima con bloques en las posiciones dadas (fila/columna de escritorio). */
function page(blocks: { id: string; area: string; inner: string; type?: string }[]): string {
  const css = blocks
    .map(
      ({ id, area }) =>
        `.fe-block-${id} { grid-area: 1/2/2/10; }\n` +
        `@media (min-width: 768px) { .fe-block-${id} { grid-area: ${area}; } }`,
    )
    .join('\n')
  const html = blocks
    .map(
      ({ id, inner, type = 'text' }) =>
        `<div class="fe-block fe-block-${id}"><div class="sqs-block" data-sqsp-block="${type}">` +
        `<div class="sqs-block-content">${inner}</div></div></div>`,
    )
    .join('')
  return `<article><div data-fluid-engine="true"><style>${css}</style><div class="fluid-engine">${html}</div></div></article>`
}

const text = (html: string) =>
  `<div class="sqs-html-content" data-sqsp-text-block-content>${html}</div>`

describe('lectura de una página de Squarespace', () => {
  it('toma el título de la página del contexto de Squarespace', () => {
    expect(parsePage(fixture('intoxicacion-profunda')).title).toBe('Intoxicación profunda')
    expect(parsePage(fixture('operacion-envenenamiento')).title).toBe('Operación «envenenamiento»')
  })

  it('sin contexto de Squarespace no hay título', () => {
    expect(parsePage(page([])).title).toBeNull()
  })

  it('ordena los bloques por fila y columna de escritorio, no por el orden del HTML', () => {
    expect(outline(parsePage(fixture('intoxicacion-profunda')).blocks)).toEqual([
      'text: INTOXICACIÓN PROFUNDA',
      'text: Prerrequisitos:',
      'text: Necesitarás:',
      'text: Recompensas:',
      'text: Habla con el Capitán Grog [22,',
      'image: Captura+de+pantalla+2025-03-25+203347.png',
      'text: Para más información sobre cóm',
      'text: Una vez tengas los 10 ron mari',
      'image: Captura+de+pantalla+2025-03-25+205111.png',
      'text: Y aquí se termina la misión. E',
      'text: Si no te queda claro, ¡también',
      'video: https://www.youtube.com/watch?v=VaY3tyYTq4A',
    ])
  })

  it('pone primero la columna de la izquierda cuando dos bloques comparten fila', () => {
    const html = page([
      { id: 'b', area: '3/14/5/26', inner: text('<p>derecha</p>') },
      { id: 'a', area: '3/2/5/14', inner: text('<p>izquierda</p>') },
      { id: 'c', area: '1/2/3/26', inner: text('<p>arriba</p>') },
    ])
    expect(outline(parsePage(html).blocks)).toEqual([
      'text: arriba',
      'text: izquierda',
      'text: derecha',
    ])
  })

  it('separa el texto en sus elementos de primer nivel, con su HTML y su texto', () => {
    const [prerequisites] = parsePage(fixture('el-cazador-cazado')).blocks.filter(
      (block) => block.type === 'text' && block.elements[0]?.text === 'Prerrequisitos:',
    )
    expect(prerequisites).toMatchObject({
      type: 'text',
      elements: [
        { tag: 'p', text: 'Prerrequisitos:' },
        { tag: 'ul', text: 'Seis pies bajo tierra.' },
      ],
    })
    if (prerequisites?.type !== 'text') throw new Error('Falta el bloque de prerrequisitos')
    expect(prerequisites.elements[1]?.html).toMatch(/^<ul[^>]*><li>/)
  })

  it('lee la URL original y el texto alternativo de cada imagen', () => {
    const images = parsePage(fixture('intoxicacion-profunda')).blocks.filter(
      (block) => block.type === 'image',
    )
    expect(images[0]).toEqual({
      type: 'image',
      url: 'https://images.squarespace-cdn.com/content/v1/67976884fd6bbb4c207d8c51/30660734-09ae-48b5-b145-693e4fa04e2a/Captura+de+pantalla+2025-03-25+203347.png',
      alt: 'Pantalla de diálogo en un juego con personajes en un entorno de fantasía, mostrando opciones de respuesta del jugador.',
    })
  })

  it('deja vacío el texto alternativo cuando la imagen no lo tiene', () => {
    const [image] = parsePage(fixture('operacion-envenenamiento')).blocks.filter(
      (block) => block.type === 'image',
    )
    expect(image).toMatchObject({ type: 'image', alt: '' })
  })

  it('marca como desconocidos los bloques que no son texto, imagen ni vídeo', () => {
    const html = page([
      { id: 'a', area: '1/2/2/10', type: 'button', inner: '<a href="/x">Botón</a>' },
      { id: 'b', area: '2/2/3/10', type: 'embed', inner: '<div>sin iframe</div>' },
    ])
    expect(parsePage(html).blocks).toEqual([
      { type: 'unknown', sqspType: 'button' },
      { type: 'unknown', sqspType: 'embed' },
    ])
  })
})
