import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GuideBody } from '@/components/game/GuideBody'
import { GuideTable } from '@/components/game/GuideTable'
import type { GuideBlock } from '@/lib/guides/page'

// La tabla del cuerpo de una guía o una página (DESIGN.md, Table block): una <table> de
// verdad, en el servidor, dentro de una región que se desplaza sola en un móvil.

type TableBlock = Extract<GuideBlock, { kind: 'table' }>

const pets: TableBlock = {
  kind: 'table',
  key: 't',
  title: 'Familiares de Astrub',
  rowHeaders: true,
  columns: [
    { header: 'Familiar', align: 'start' },
    { header: 'Nivel', align: 'end' },
    { header: 'Zona', align: 'center' },
  ],
  rows: [
    ['Tofu', '12', 'Astrub'],
    ['Bwak', '', 'Incarnam'],
  ],
}

const html = (table: TableBlock) => renderToStaticMarkup(<GuideTable table={table} />)

describe('GuideTable', () => {
  it('nombra la tabla con su <caption>, y la región que se desplaza con el mismo texto', () => {
    const markup = html(pets)
    const id = markup.match(/<caption id="([^"]+)">Familiares de Astrub<\/caption>/)?.[1]
    expect(id).toBeTruthy()
    expect(markup).toMatch(
      new RegExp(`^<div class="gtable" role="region" tabindex="0" aria-labelledby="${id}">`),
    )
  })

  it('los encabezados de columna son <th scope="col"> dentro de <thead>', () => {
    const markup = html(pets)
    expect(markup).toContain(
      '<thead><tr><th scope="col">Familiar</th><th scope="col" class="gtable__end">Nivel</th>' +
        '<th scope="col" class="gtable__center">Zona</th></tr></thead>',
    )
  })

  it('con la primera columna como encabezado de fila, esa celda es <th scope="row">', () => {
    const markup = html(pets)
    expect(markup).toContain(
      '<tr><th scope="row">Tofu</th><td class="gtable__end">12</td>' +
        '<td class="gtable__center">Astrub</td></tr>',
    )
    expect(markup).toContain('<td class="gtable__end"></td>')
    expect(markup).toContain('class="gtable__table gtable__table--rows"')
  })

  it('sin encabezados de fila, todas son <td>', () => {
    const markup = html({ ...pets, rowHeaders: false })
    expect(markup).not.toContain('scope="row"')
    expect(markup).toContain('<tr><td>Tofu</td>')
    expect(markup).not.toContain('gtable__table--rows')
  })

  it('sin título no hay <caption>: la región se nombra por sus columnas', () => {
    const { title: _title, ...untitled } = pets
    const markup = html(untitled)
    expect(markup).not.toContain('<caption')
    expect(markup).toContain('aria-label="Tabla: Familiar, Nivel, Zona"')
  })

  it('el texto de las celdas sale tal cual, escapado', () => {
    const markup = html({ ...pets, rows: [['<b>Tofu</b>', '1 & 2', 'x']] })
    expect(markup).toContain('&lt;b&gt;Tofu&lt;/b&gt;')
    expect(markup).toContain('1 &amp; 2')
  })

  it('GuideBody la pinta entre los demás bloques', () => {
    const markup = renderToStaticMarkup(<GuideBody blocks={[pets]} />)
    expect(markup).toContain('<table class="gtable__table gtable__table--rows">')
  })
})
