import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { parsePage } from '../../scripts/import/squarespace/parse-page'
import {
  GUIDE_SLUGS,
  toQuestGuide,
  type GuideBlock,
} from '../../scripts/import/squarespace/to-quest-guide'

function fixture(slug: string): string {
  return readFileSync(path.join(__dirname, '../fixtures/squarespace', `${slug}.html`), 'utf8')
}

function guideFor(slug: string, questDofusIds: number[] = [1]) {
  return toQuestGuide(parsePage(fixture(slug)), { slug, questDofusIds })
}

/** Texto plano de un fragmento HTML, para comparar sin depender del marcado. */
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function types(body: GuideBlock[]): string[] {
  return body.map((block) => block.blockType)
}

function richTexts(body: GuideBlock[]): string[] {
  return body.flatMap((block) => (block.blockType === 'richText' ? [plain(block.html)] : []))
}

/** Una página mínima con un bloque de texto por cada fragmento, en ese orden. */
function pageWith(...fragments: string[]): string {
  const css = fragments
    .map(
      (_, index) =>
        `@media (min-width: 768px) { .fe-block-b${index} { grid-area: ${index + 1}/2/${index + 2}/26; } }`,
    )
    .join('\n')
  const blocks = fragments
    .map(
      (html, index) =>
        `<div class="fe-block fe-block-b${index}"><div class="sqs-block" data-sqsp-block="text">` +
        `<div class="sqs-html-content" data-sqsp-text-block-content>${html}</div></div></div>`,
    )
    .join('')
  return (
    '<script>Static.SQUARESPACE_CONTEXT = {"collection":{"title":"Prueba","id":"x"}};</script>' +
    `<article><div data-fluid-engine="true"><style>${css}</style>${blocks}</div></article>`
  )
}

describe('conversión de una página en guía de misión', () => {
  it('las cinco guías elegidas tienen slugs válidos', () => {
    expect(GUIDE_SLUGS).toHaveLength(5)
    for (const slug of GUIDE_SLUGS) {
      const { guide, oddities } = guideFor(slug)
      expect(guide.slug).toBe(slug)
      expect(oddities.join('\n')).not.toMatch(/slug/i)
    }
  })

  it('toma título, slug y URL original de la página', () => {
    const { guide } = guideFor('el-cazador-cazado')
    expect(guide).toMatchObject({
      title: 'El cazador cazado',
      slug: 'el-cazador-cazado',
      originalUrl: 'https://www.torrentearcano.com/el-cazador-cazado',
      questDofusIds: [1],
    })
  })

  it('rellena el resumen con prerrequisitos, lo que necesitas, recompensas y el PNJ de inicio', () => {
    const { guide, oddities } = guideFor('el-cazador-cazado')
    expect(guide.summary).toEqual({
      prerequisites: 'Seis pies bajo tierra.',
      needs: 'Literalmente nada xD.',
      rewards: '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
      startNpc: 'Kerubim Crepin',
      startX: 3,
      startY: -17,
    })
    expect(oddities).toEqual([])
  })

  it('una lista de prerrequisitos queda en una línea por elemento', () => {
    const { guide } = guideFor('entretanto-un-renacer')
    expect(guide.summary.prerequisites).toBe(
      [
        'Nivel mínimo 190.',
        'A la vuelta de un sueño perdido.',
        'Toma de conciencia.',
        'El fin… o el comienzo.',
        'Bajar a las cenizas.',
        'Poseer los 6 Dofus Primordiales.',
      ].join('\n'),
    )
  })

  it('quita del cuerpo el título, el resumen, la línea de inicio escueta y la frase de cierre', () => {
    const { guide } = guideFor('el-cazador-cazado')
    const prose = richTexts(guide.body).join('\n')
    expect(prose).not.toMatch(/EL CAZADOR CAZADO|Prerrequisitos|Necesitarás|Recompensas/)
    expect(prose).not.toContain('Habla con Kerubim Crepin')
    expect(prose).not.toContain('Aquí termina la misión')
    expect(types(guide.body)[0]).toBe('image')
  })

  it('una línea de inicio con más información se queda entera en el cuerpo', () => {
    const operation = guideFor('operacion-envenenamiento', []).guide
    expect(operation.summary).toMatchObject({ startNpc: 'Oto Mustam', startX: -25, startY: 33 })
    expect(richTexts(operation.body)[0]).toBe(
      'La misión empieza hablando con Oto Mustam [-25,33] una vez hayas terminado la misión anterior.',
    )

    const rebirth = guideFor('entretanto-un-renacer').guide
    expect(rebirth.summary).toMatchObject({ startNpc: 'Draconiros', startX: 21, startY: -33 })
    expect(richTexts(rebirth.body)[0]).toBe(
      'La misión empieza hablando con Draconiros [21,-33] en la clásica cueva de siempre, una vez hayas terminado los requisitos.',
    )
  })

  it('reconoce las etiquetas del resumen aunque vengan como encabezado', () => {
    const page = pageWith(
      '<h2>PRUEBA</h2>',
      '<h2>Prerrequisitos:</h2><ul><li>Misión A</li><li>Misión B</li></ul>',
      '<p>Habla con Oto Mustam [-25,33] para empezar la misión.</p>',
      '<p>Primer paso.</p>',
    )
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(guide.summary?.prerequisites).toBe('Misión A\nMisión B')
    expect(richTexts(guide.body)).toEqual(['Primer paso.'])
  })

  it('solo quita el primer encabezado, el que repite el título; los demás quedan en el cuerpo', () => {
    const page = pageWith('<h2>PRUEBA</h2>', '<h2>Antes de empezar</h2><p>Primer paso.</p>')
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(richTexts(guide.body)).toEqual(['Antes de empezar Primer paso.'])
  })

  it('un encabezado dentro del resumen es parte del resumen, aunque no haya título antes', () => {
    const page = pageWith('<p>Prerrequisitos:</p><h2>Nivel mínimo 70</h2>', '<p>Primer paso.</p>')
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(guide.summary?.prerequisites).toBe('Nivel mínimo 70')
    expect(richTexts(guide.body)).toEqual(['Primer paso.'])
  })

  it('quita el encabezado inicial numerado que repite el título, sin anotarlo', () => {
    const page = pageWith('<h2>29. PRUEBA</h2><p>Primer paso.</p>')
    const { guide, oddities } = toQuestGuide(parsePage(page), {
      slug: 'prueba',
      questDofusIds: [1],
    })
    expect(richTexts(guide.body)).toEqual(['Primer paso.'])
    expect(oddities.join('\n')).not.toMatch(/encabezado/i)
  })

  it('un encabezado inicial distinto del título se quita, pero queda anotado con su texto', () => {
    const page = pageWith('<h2>PRUEBA EN APUROS</h2><p>Primer paso.</p>')
    const { guide, oddities } = toQuestGuide(parsePage(page), {
      slug: 'prueba',
      questDofusIds: [1],
    })
    expect(richTexts(guide.body)).toEqual(['Primer paso.'])
    expect(oddities).toContainEqual(expect.stringContaining('PRUEBA EN APUROS'))
  })

  it('las frases de inicio y cierre solo se quitan de párrafos: listas y encabezados quedan enteros', () => {
    const page = pageWith(
      '<h2>PRUEBA</h2>',
      '<ul><li>Habla con Oto Mustam [1,2] para empezar la misión.</li><li>Segundo paso.</li></ul>',
      '<h3>Aquí termina la misión.</h3>',
    )
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(richTexts(guide.body)).toEqual([
      'Habla con Oto Mustam [1,2] para empezar la misión. Segundo paso. Aquí termina la misión.',
    ])
    expect(guide.summary?.startNpc ?? null).toBeNull()
  })

  it('una frase que empieza por Necesitarás sin dos puntos es prosa, no resumen', () => {
    const page = pageWith(
      '<h2>PRUEBA</h2>',
      '<p>Necesitarás: Caminar mapas.</p>',
      '<p>Necesitarás hablar con Oto Mustam antes.</p>',
    )
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(guide.summary?.needs).toBe('Caminar mapas.')
    expect(richTexts(guide.body)).toEqual(['Necesitarás hablar con Oto Mustam antes.'])
  })

  it('una etiqueta del resumen sin contenido cuenta como bloque que falta', () => {
    const page = pageWith('<h2>PRUEBA</h2>', '<p>Recompensas:</p>', '<p>Primer paso.</p>')
    const { guide, oddities } = toQuestGuide(parsePage(page), {
      slug: 'prueba',
      questDofusIds: [1],
    })
    expect(guide.summary?.rewards).toBeUndefined()
    expect(oddities).toContain('Falta el bloque Recompensas')
  })

  it('de un párrafo que empieza por la línea de inicio escueta quita solo esa frase', () => {
    const { guide } = guideFor('intoxicacion-profunda')
    expect(guide.summary).toMatchObject({ startNpc: 'Capitán Grog', startX: 22, startY: 22 })
    expect(richTexts(guide.body)[0]).toBe(
      'Simplemente te va a pedir entregarle 10 “ron marino” que puedes encontrar en las 3 bases.',
    )
    // Sin el espacio que separaba las dos frases.
    expect(guide.body[0]).toMatchObject({ html: expect.stringMatching(/^<p[^>]*>Simplemente/) })
  })

  it('del párrafo de cierre quita solo la frase de cierre y conserva el resto', () => {
    const closings: [string, string][] = [
      [
        'el-cazador-cazado',
        'Espero que te haya ayudado. Dale click aquí para ver las otras misiones y logros de Astrub.',
      ],
      [
        'intoxicacion-profunda',
        'Espero haberte ayudado. Puedes volver al logro de estas misiones en Test de impermeabilidad.',
      ],
      [
        'operacion-envenenamiento',
        'Espero que te haya ayudado. Si hablas con Oto Mustam, te entregará la siguiente misión 30: El desafío del maestro guerrero.',
      ],
      [
        'entretanto-un-renacer',
        'Espero que te haya ayudado. Ya te falta poco para terminar este logro. La siguiente y última misión se llama La bestia durmiente.',
      ],
      [
        'seis-pies-bajo-tierra',
        'Espero haberte ayudado. Si sigues hablando con Kerubim, te va a entregar la siguiente y última misión de este logro: El cazador cazado.',
      ],
    ]
    for (const [slug, rest] of closings) {
      const prose = richTexts(guideFor(slug).guide.body).join('\n')
      expect(prose, slug).toContain(rest)
      expect(prose, slug).not.toMatch(/aquí (se )?termina la misión/i)
    }
    const intoxication = guideFor('intoxicacion-profunda').guide.body
    expect(JSON.stringify(intoxication)).toContain('<a href=\\"/test-de-impermeabilidad\\">')
  })

  it('una frase de cierre con puntos suspensivos solo se lleva esa frase', () => {
    const page = pageWith(
      '<h2>PRUEBA</h2>',
      '<p>Primer paso.</p>',
      '<p>Aquí termina la misión… Texto que debe conservarse.</p>',
    )
    const { guide } = toQuestGuide(parsePage(page), { slug: 'prueba', questDofusIds: [1] })
    expect(richTexts(guide.body)).toEqual(['Primer paso. Texto que debe conservarse.'])
  })

  it('un párrafo de cierre sin nada más desaparece', () => {
    const page = parsePage(pageWith('<p>Último paso.</p><p>Aquí termina la misión.</p>'))
    const { guide } = toQuestGuide(page, { slug: 'prueba', questDofusIds: [1] })
    expect(richTexts(guide.body)).toEqual(['Último paso.'])
  })

  it('alterna texto e imágenes en el orden de la página y junta la prosa seguida', () => {
    const { guide } = guideFor('intoxicacion-profunda')
    expect(types(guide.body)).toEqual([
      'richText',
      'image',
      'richText',
      'image',
      'richText',
      'video',
    ])
    expect(richTexts(guide.body)[1]).toMatch(
      /^Para más información .* Una vez tengas los 10 ron marino/,
    )
  })

  it('conserva negritas y enlaces en el HTML de la prosa', () => {
    const [, second] = richTexts(guideFor('intoxicacion-profunda').guide.body)
    const block = guideFor('intoxicacion-profunda').guide.body.find(
      (candidate) => candidate.blockType === 'richText' && plain(candidate.html) === second,
    )
    expect(block).toMatchObject({ blockType: 'richText' })
    if (block?.blockType !== 'richText') return
    expect(block.html).toContain('<a href="/ron-marino"><strong>')
  })

  it('cada imagen es un bloque con su URL y su texto alternativo, o el título si no lo tiene', () => {
    const withAlt = guideFor('intoxicacion-profunda').guide.body.find(
      (block) => block.blockType === 'image',
    )
    expect(withAlt).toMatchObject({
      blockType: 'image',
      url: expect.stringMatching(/^https:\/\/images\.squarespace-cdn\.com\/.+203347\.png$/),
      alt: expect.stringMatching(/^Pantalla de diálogo/),
    })

    const withoutAlt = guideFor('operacion-envenenamiento').guide.body.find(
      (block) => block.blockType === 'image',
    )
    expect(withoutAlt).toMatchObject({ alt: 'Operación «envenenamiento»' })
  })

  it('las imágenes en la misma fila quedan seguidas, de izquierda a derecha', () => {
    const { guide } = guideFor('entretanto-un-renacer')
    const urls = guide.body.flatMap((block) => (block.blockType === 'image' ? [block.url] : []))
    const row = ['235335', '235344', '235351'].map((stamp) =>
      urls.findIndex((url) => url.includes(stamp)),
    )
    expect(row[0]).toBeGreaterThan(-1)
    expect(row).toEqual([row[0], row[0] + 1, row[0] + 2])
  })

  it('el vídeo queda como bloque con su URL https', () => {
    const video = guideFor('intoxicacion-profunda').guide.body.at(-1)
    expect(video).toEqual({
      blockType: 'video',
      url: 'https://www.youtube.com/watch?v=VaY3tyYTq4A',
    })
  })

  it('un párrafo que empieza por IMPORTANTE es un aviso de cuidado, separado de la prosa', () => {
    const { guide } = guideFor('seis-pies-bajo-tierra')
    const index = guide.body.findIndex((block) => block.blockType === 'callout')
    const callout = guide.body[index]
    expect(callout).toMatchObject({ blockType: 'callout', variant: 'warning' })
    if (callout?.blockType !== 'callout') return
    expect(plain(callout.html)).toMatch(/^IMPORTANTE: las anutrof NO deben morir/)
    const before = guide.body[index - 1]
    expect(before?.blockType === 'richText' && plain(before.html)).toMatch(
      /Básicamente tienen los mismos hechizos/,
    )
    expect(guide.body[index + 1]?.blockType).toBe('image')
  })

  it('CUIDADO es un aviso de cuidado y NOTA un consejo; los vacíos desaparecen', () => {
    const page = parsePage(
      pageWith(
        '<p>Primero.</p><p>CUIDADO: el jefe pega fuerte.</p><p> </p>',
        '<p>NOTA: puedes volver luego.</p><p>Cuidado, en minúsculas, es prosa.</p>',
      ),
    )
    const { guide } = toQuestGuide(page, { slug: 'prueba', questDofusIds: [1] })
    expect(
      guide.body.map((block) => [block.blockType, 'html' in block ? plain(block.html) : '']),
    ).toEqual([
      ['richText', 'Primero.'],
      ['callout', 'CUIDADO: el jefe pega fuerte.'],
      ['callout', 'NOTA: puedes volver luego.'],
      ['richText', 'Cuidado, en minúsculas, es prosa.'],
    ])
    expect(guide.body.filter((block) => block.blockType === 'callout')).toMatchObject([
      { variant: 'warning' },
      { variant: 'tip' },
    ])
  })

  it('anota las rarezas sin fallar: misión sin DofusDB, resumen o inicio que faltan, slug no válido', () => {
    const page = parsePage(pageWith('<p>Solo prosa.</p>'))
    const { oddities } = toQuestGuide(page, { slug: 'Misión_1', questDofusIds: [] })
    expect(oddities).toEqual([
      'Slug no válido: Misión_1',
      'Sin misión de DofusDB enlazada',
      'Falta el bloque Prerrequisitos',
      'Falta el bloque Necesitarás',
      'Falta el bloque Recompensas',
      'No se encontró la línea de inicio (PNJ y coordenadas)',
    ])
  })

  it('anota los bloques desconocidos y los deja fuera del cuerpo', () => {
    const page = parsePage(fixture('el-cazador-cazado'))
    page.blocks.push({ type: 'unknown', sqspType: 'button' })
    const { guide, oddities } = toQuestGuide(page, {
      slug: 'el-cazador-cazado',
      questDofusIds: [1977],
    })
    expect(oddities).toEqual(['Bloque de Squarespace sin convertir: button'])
    expect(guide.body).toEqual(guideFor('el-cazador-cazado', [1977]).guide.body)
  })
})
