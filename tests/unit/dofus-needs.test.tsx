import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DofusNeeds } from '@/components/dofus/DofusGuideParts'
import type { DofusGuideView } from '@/lib/dofus-guides/page'
import type { RichTextState } from '@/lib/guides/page'

// Necesitarás de una guía de Dofus (DESIGN.md, Dofus guides components): los grupos uno
// debajo de otro y, en cada uno, los objetos en columnas y después las notas de Torre.

const note = (value: string) =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        { type: 'paragraph', version: 1, children: [{ type: 'text', text: value, version: 1 }] },
      ],
    },
  }) as unknown as RichTextState

const icon = { src: '/img/item-366.webp', width: 96, height: 96 }

const needs: NonNullable<DofusGuideView['needs']> = {
  title: 'Necesitarás',
  groups: [
    {
      rows: [
        { kind: 'note', text: note('1 x combates.') },
        { kind: 'item', item: { name: 'Pico de tofu', icon }, quantity: 3 },
        { kind: 'note', text: note('Alineamiento 100 (Bonta o Brakmar).') },
        { kind: 'item', item: { name: 'Ojo de arakmutada' }, quantity: 1, note: '(o fabricarlo)' },
      ],
    },
    { name: 'Mazmorras', rows: [{ kind: 'note', text: note('1 x Mazmorra Rey Nidas.') }] },
  ],
}

const html = renderToStaticMarkup(<DofusNeeds needs={needs} />)
const text = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('DofusNeeds', () => {
  it('sin columnas de grupos: los grupos van uno debajo de otro', () => {
    expect(html).not.toContain('dg-needs__cols')
    expect(html.match(/class="dg-needs__g"/g)).toHaveLength(2)
  })

  it('en cada grupo, primero los objetos y después las notas, cada uno en el orden de Torre', () => {
    const first = html.slice(0, html.indexOf('Mazmorras'))
    const items = first.indexOf('<ul role="list" class="needs__items">')
    const notes = first.indexOf('<ul role="list" class="needs__notes">')
    expect(items).toBeGreaterThan(-1)
    expect(notes).toBeGreaterThan(items)
    const itemList = first.slice(items, notes)
    expect(itemList.match(/class="row copyhost"/g)).toHaveLength(2)
    expect(text(itemList).indexOf('Pico de tofu')).toBeLessThan(
      text(itemList).indexOf('Ojo de arakmutada'),
    )
    expect(text(itemList)).toContain('(o fabricarlo)')
    const noteList = text(first.slice(notes))
    expect(noteList.indexOf('1 x combates.')).toBeGreaterThan(-1)
    expect(noteList.indexOf('1 x combates.')).toBeLessThan(noteList.indexOf('Alineamiento 100'))
    expect(first.slice(notes)).not.toContain('data-copy')
  })

  it('un grupo solo con notas no pinta la lista de objetos', () => {
    const last = html.slice(html.indexOf('Mazmorras'))
    expect(last).not.toContain('needs__items')
    expect(last).toContain('<ul role="list" class="needs__notes">')
  })
})
