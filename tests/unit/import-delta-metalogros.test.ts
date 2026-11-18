import { describe, expect, it } from 'vitest'

import { compareMetalogro, linkedSlugs } from '../../scripts/import/delta/metalogros'

describe('linkedSlugs', () => {
  it('los slugs de este sitio que enlaza la página, sin repetir ni enlaces de fuera', () => {
    expect(
      linkedSlugs([
        '/se-busca-atcham',
        'https://www.torrentearcano.com/se-busca-boarus?x=1',
        '/Se-busca-atcham/',
        'https://www.youtube.com/watch?v=x',
        '//otro.com/a',
        '/a/b',
      ]),
    ).toEqual(['se-busca-atcham', 'se-busca-boarus'])
  })
})

describe('compareMetalogro', () => {
  const panel = {
    group: 'en-busca-y-captura',
    pageGroups: new Map<string, string | null>([
      ['capturas-amakneanas', 'en-busca-y-captura'],
      ['capturas-burguesas', 'en-busca-y-captura'],
      ['correccional', 'alineamiento'],
      ['sin-grupo', null],
    ]),
    guides: ['se-busca-atcham'],
    questGuides: new Set(['se-busca-atcham', 'se-busca-boarus']),
  }

  it('dice lo que Squarespace enlaza y el panel no tiene, y lo que el panel tiene de más', () => {
    expect(
      compareMetalogro(
        [
          'capturas-amakneanas',
          'se-busca-atcham',
          'se-busca-boarus',
          'correccional',
          'sin-grupo',
          'logro-nuevo',
          'metalogro-incarnam',
        ],
        panel,
      ),
    ).toEqual({
      group: 'en-busca-y-captura',
      onlySquarespace: [
        { slug: 'se-busca-boarus', note: 'guía de misión, no está en «Otras guías»' },
        { slug: 'correccional', note: 'página de logro de alineamiento' },
        { slug: 'sin-grupo', note: 'página de logro sin metalogro' },
        { slug: 'logro-nuevo', note: 'sin página aquí' },
      ],
      onlyPanel: ['capturas-burguesas'],
    })
  })
})
