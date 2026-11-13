import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import type { ChecklistEntry } from '@/lib/checklists/list'

// El índice /checklists (DESIGN.md, Checklists index).

const legacy: ChecklistEntry = {
  name: 'Almas del Ocre',
  slug: 'lista-ocre',
  state: 'preparing',
  href: 'https://www.torrentearcano.com/lista-ocre',
  legacy: true,
}

describe('ChecklistsIndex', () => {
  it('sin checklists que enseñar, el título y un aviso en vez de una rejilla vacía', () => {
    const markup = renderToStaticMarkup(<ChecklistsIndex entries={[]} />)
    expect(markup).toMatch(/<h1 class="ck-h1">Checklists<\/h1>/)
    expect(markup).not.toContain('data-checklist-grid')
    expect(markup).toContain('class="ck-empty"')
    expect(markup).toContain('Todavía no hay checklists publicadas.')
  })

  it('con checklists, la rejilla y ningún aviso', () => {
    const markup = renderToStaticMarkup(<ChecklistsIndex entries={[legacy]} />)
    expect(markup).toContain('data-checklist-grid')
    expect(markup).not.toContain('class="ck-empty"')
  })

  it('la tarjeta de Squarespace no lleva clases sin estilo', () => {
    const markup = renderToStaticMarkup(<ChecklistsIndex entries={[legacy]} />)
    expect(markup).toContain('<a class="ckcard" href="https://www.torrentearcano.com/lista-ocre"')
  })
})
