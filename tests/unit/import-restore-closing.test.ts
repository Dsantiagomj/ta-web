import { describe, expect, it } from 'vitest'

import { restoreAll, restoreClosing } from '../../scripts/import/restore-closings'
import { parsePage } from '../../scripts/import/squarespace/parse-page'
import { closingParagraphs } from '../../scripts/import/squarespace/to-quest-guide'

// La frase de cierre que el importador quitaba («Aquí termina la misión.»): se lee de la
// página de Squarespace y se devuelve al principio del final de la guía ya importada.

type Node = Record<string, unknown>
const text = (value: string, format = 0): Node => ({
  type: 'text',
  text: value,
  format,
  version: 1,
})
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', version: 1, children })
const richText = (id: string, ...children: Node[]) => ({
  id,
  blockType: 'richText',
  content: { root: { type: 'root', version: 1, children } },
})
const step = (id: string) => ({
  id,
  blockType: 'step',
  body: [richText(`${id}-t`, paragraph(text('Un paso.')))],
})

// Una página de Squarespace con un bloque de texto por párrafo, como las de verdad.
const page = (...paragraphs: string[]) =>
  parsePage(
    '<script>Static.SQUARESPACE_CONTEXT = {"collection":{"title":"Prueba","id":"x"}};</script>' +
      '<article><div data-fluid-engine="true"><style>' +
      paragraphs
        .map(
          (_, i) =>
            `@media (min-width: 768px) { .fe-block-b${i} { grid-area: ${i + 1}/2/${i + 2}/26; } }`,
        )
        .join('\n') +
      '</style>' +
      paragraphs
        .map(
          (html, i) =>
            `<div class="fe-block fe-block-b${i}"><div class="sqs-block" data-sqsp-block="text">` +
            `<div class="sqs-html-content" data-sqsp-text-block-content>${html}</div></div></div>`,
        )
        .join('') +
      '</div></article>',
  )

describe('closingParagraphs', () => {
  it('el párrafo que empieza por la frase de cierre, y esa frase', () => {
    const found = closingParagraphs(
      page('<p>Un paso.</p>', '<p>Aquí termina la misión. Espero haberte ayudado.</p>'),
    )
    expect(found).toMatchObject([
      {
        sentence: 'Aquí termina la misión.',
        html: '<p>Aquí termina la misión. Espero haberte ayudado.</p>',
      },
    ])
  })

  it('sin frase de cierre, ninguno', () => {
    expect(closingParagraphs(page('<p>Espero haberte ayudado.</p>'))).toEqual([])
  })

  it('todos los párrafos de cierre, en su orden (Leyenda del otoño tiene dos)', () => {
    const found = closingParagraphs(
      page(
        '<p>Aquí termina la misión y por ende, el logro. Espero que te haya ayudado.</p>',
        '<p>Aquí termina la misión. Espero que te haya ayudado.</p>',
      ),
    )
    expect(found.map((closing) => closing.sentence)).toEqual([
      'Aquí termina la misión y por ende, el logro.',
      'Aquí termina la misión.',
    ])
  })
})

describe('restoreClosing', () => {
  const full = paragraph(text('Aquí termina la misión. Espero haberte ayudado.'))

  it('cambia el párrafo recortado por el entero, al principio del final', () => {
    const body = [step('s'), richText('z', paragraph(text('Espero haberte ayudado.')))]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: full })
    expect(result.status).toBe('restored')
    expect(result.body).toEqual([step('s'), richText('z', full)])
  })

  it('si el párrafo era solo la frase, lo añade como texto propio detrás del último paso', () => {
    const alone = paragraph(text('Aquí termina la misión.'))
    const body = [step('s'), richText('z', paragraph(text('Mira el vídeo.')))]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: alone })
    expect(result.status).toBe('inserted')
    expect(result.body).toEqual([
      step('s'),
      { blockType: 'richText', content: { root: { type: 'root', version: 1, children: [alone] } } },
      richText('z', paragraph(text('Mira el vídeo.'))),
    ])
  })

  it('ya restaurada: no cambia nada', () => {
    const body = [step('s'), richText('z', full)]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: full })
    expect(result).toMatchObject({ status: 'present', body })
  })

  it('sin el párrafo recortado en el final (lo cambió Torre): no toca nada y dice por qué', () => {
    const body = [step('s'), richText('z', paragraph(text('Otro cierre distinto.')))]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: full })
    expect(result).toEqual({ status: 'notFound', reason: 'sin el párrafo recortado', body })
  })

  it('dos cierres con la misma frase: el primero entero no tapa al segundo recortado', () => {
    const first = paragraph(text('Aquí termina la misión. Espero haberte ayudado.'))
    const second = paragraph(text('Aquí termina la misión. Nos vemos en la próxima.'))
    const body = [step('s'), richText('z', first, paragraph(text('Nos vemos en la próxima.')))]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: second })
    expect(result.status).toBe('restored')
    expect(result.body).toEqual([step('s'), richText('z', first, second)])
  })

  it('un segundo cierre se restaura aunque el primero empiece por la misma frase', () => {
    // Leyenda del otoño: el primero ya está entero; del segundo quedó el resto, sin su frase.
    const first = paragraph(
      text('Aquí termina la misión y por ende, el logro. Espero que te haya ayudado.'),
    )
    const second = paragraph(text('Aquí termina la misión. Espero que te haya ayudado de nuevo.'))
    const body = [
      step('s'),
      richText('z', first, paragraph(text('Espero que te haya ayudado de nuevo.'))),
    ]
    const result = restoreClosing(body, { sentence: 'Aquí termina la misión.', paragraph: second })
    expect(result.status).toBe('restored')
    expect(result.body).toEqual([step('s'), richText('z', first, second)])
  })
})

describe('restoreAll', () => {
  const closing = (line: string) => ({
    sentence: line.split('.')[0]! + '.',
    paragraph: paragraph(text(line)),
  })

  it('varios cierres que eran solo la frase quedan en su orden, uno tras otro', () => {
    const body = [step('s'), richText('z', paragraph(text('Mira el vídeo.')))]
    const result = restoreAll(body, [
      closing('Aquí termina la misión.'),
      closing('Aquí se termina la misión.'),
    ])
    const texts = result.body.flatMap((block) =>
      block.blockType === 'richText'
        ? (
            block.content as { root: { children: { children: { text: string }[] }[] } }
          ).root.children.map((node) => node.children[0]!.text)
        : [],
    )
    expect(texts).toEqual([
      'Aquí termina la misión.',
      'Aquí se termina la misión.',
      'Mira el vídeo.',
    ])
    expect(result.statuses).toEqual([{ status: 'inserted' }, { status: 'inserted' }])
  })

  it('dice cómo quedó cada párrafo, y por qué no se encontró', () => {
    const result = restoreAll(
      [richText('z', paragraph(text('Otro final.')))],
      [
        closing('Aquí termina la misión.'),
        closing('Aquí termina la misión. Espero haberte ayudado.'),
      ],
    )
    expect(result.statuses).toEqual([
      { status: 'notFound', reason: 'sin paso detrás del que ponerlo' },
      { status: 'notFound', reason: 'sin el párrafo recortado' },
    ])
    expect(result.changed).toBe(false)
  })
})
