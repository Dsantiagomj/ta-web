import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DofusPart, DofusSheet, hasDofusSheet } from '@/components/dofus/DofusGuideParts'
import type { DofusGuideView, DofusQuestCard } from '@/lib/dofus-guides/page'
import type { RichTextState } from '@/lib/guides/page'

// La guía de Dofus con la disposición de la página de logro (DESIGN.md, Dofus guide page,
// 2026-11-23): la ficha (Prerrequisitos, Necesitarás y Recompensas) con las filas de la ficha
// del logro, y las misiones de cada logro en su lista numerada, en una sola columna.

const rich = (...paragraphs: string[]) =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((value) => ({
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: value, version: 1 }],
      })),
    },
  }) as unknown as RichTextState

const icon = { src: '/img/item-366.webp', width: 96, height: 96 }
const boss = { src: '/api/media/file/wey-wabbit.png', width: 128, height: 128 }
const text = (markup: string) => markup.replace(/<[^>]+>/g, '')

type Sheet = Pick<DofusGuideView, 'prerequisites' | 'needs' | 'rewards'>

const sheet: Sheet = {
  prerequisites: [
    { kind: 'text', text: rich('Nivel mínimo 120 para las últimas misiones.') },
    { kind: 'quest', label: 'La hechicera de los pantanos', href: '/la-hechicera' },
  ],
  needs: {
    title: 'Necesitarás',
    note: '(no te he puesto los recursos de Incarnam)',
    groups: [
      {
        key: 'combates',
        name: 'Combates',
        parts: [
          {
            rows: [
              { kind: 'note', text: rich('combates (solo).'), quantity: 3, combat: true },
              { kind: 'note', text: rich('Algunos combates.'), combat: true },
            ],
          },
        ],
      },
      {
        key: 'mazmorras',
        name: 'Mazmorras',
        parts: [
          {
            rows: [
              {
                kind: 'note',
                text: rich('Mazmorra Wey Wabbit.'),
                quantity: 1,
                dungeon: true,
                boss,
              },
              { kind: 'note', text: rich('Mazmorras nivel 200'), dungeon: true },
            ],
          },
          {
            subtitle: '1 × Mazmorra:',
            rows: [{ kind: 'note', text: rich('Malefíscof.'), dungeon: true }],
          },
        ],
      },
      {
        key: 'recursos',
        name: 'Recursos',
        parts: [
          {
            rows: [
              { kind: 'note', text: rich('Piedras de alma.', 'También del mercadillo.') },
              { kind: 'item', item: { name: 'Pico de tofu', icon }, quantity: 3 },
              { kind: 'item', item: { name: 'Ojo' }, quantity: 1, note: '(o fabricarlo)' },
            ],
          },
        ],
      },
    ],
  },
  rewards: rich('4 311 804 XP'),
}

const html = renderToStaticMarkup(<DofusSheet view={sheet} />)
/** Las filas (li) de la parte cuyo título es heading. */
const rowsOf = (heading: string) => {
  const from = html.indexOf(`>${heading}</h3>`)
  const next = html.indexOf('<div class="lneeds__g">', from)
  return html
    .slice(from, next < 0 ? html.indexOf('</section>', from) : next)
    .split(/<li(?=[ >])/)
    .slice(1)
}

describe('DofusSheet', () => {
  it('la ficha del logro: Prerrequisitos y Necesitarás plegables, y Recompensas al final', () => {
    expect(html).toContain('<div class="lsheet">')
    const parts = [...html.matchAll(/<section class="([^"]+)" aria-labelledby="[^"]*-(\w+)">/g)]
    expect(parts.map(([, className, id]) => [className, id])).toEqual([
      ['lsheet__p', 'pre'],
      ['lsheet__p lneeds', 'nec'],
      ['lsheet__p', 'rec'],
    ])
    expect(html.match(/<details class="lsheet__d" data-sheet="">/g)).toHaveLength(2)
    const headings = [...html.matchAll(/<h2 class="lsheet__k" id="[^"]+">([^<]+)<\/h2>/g)]
    expect(headings.map(([, name]) => name)).toEqual([
      'Prerrequisitos',
      'Necesitarás',
      'Recompensas',
    ])
    expect(text(html)).toContain('4 311 804 XP')
  })

  it('Prerrequisitos: una misión con el icono de misión; la frase de Torre, sin icono', () => {
    const pre = html.slice(0, html.indexOf('lneeds'))
    const [sentence, quest] = pre.split(/<li(?=[ >])/).slice(1)
    expect(sentence).not.toContain('class="well"')
    expect(text(`<li${sentence}`)).toBe('Nivel mínimo 120 para las últimas misiones.')
    expect(quest).toContain('data-icon="quest"')
    expect(quest).toContain('<a href="/la-hechicera">La hechicera de los pantanos</a>')
  })

  it('Necesitarás: la nota de Torre encima, y cada grupo con su título y una fila por línea', () => {
    const plain = text(html)
    expect(plain.indexOf('(no te he puesto los recursos de Incarnam)')).toBeLessThan(
      plain.indexOf('Combates'),
    )
    const groups = [...html.matchAll(/<h3 class="lneeds__k" id="[^"]+">([^<]+)<\/h3>/g)]
    expect(groups.map(([, name]) => name)).toEqual(['Combates', 'Mazmorras', 'Recursos'])
    expect(html).not.toContain('needs__notes')
  })

  it('Combates: el icono de combate y la cantidad en negrita, «3 ×», delante de la nota', () => {
    const [counted, loose] = rowsOf('Combates')
    expect(counted).toContain('data-icon="combat"')
    expect(counted).toContain('<b>3 ×</b>')
    expect(text(`<li${counted}`)).toBe('3 × combates (solo).')
    expect(loose).toContain('data-icon="combat"')
    expect(text(`<li${loose}`)).toBe('Algunos combates.')
  })

  it('Mazmorras: el jefe que nombra o el icono de mazmorra; el subtítulo, encima de sus filas', () => {
    const [named, generic, nested] = rowsOf('Mazmorras')
    expect(named).toContain('wey-wabbit.png')
    expect(text(`<li${named}`)).toBe('1 × Mazmorra Wey Wabbit.')
    expect(generic).toContain('/img/game/jefes/crunchidor.webp')
    expect(text(nested!)).toContain('Malefíscof.')
    const plain = text(html)
    expect(plain.indexOf('1 × Mazmorra:')).toBeLessThan(plain.indexOf('Malefíscof.'))
    expect(plain.indexOf('Mazmorras nivel 200')).toBeLessThan(plain.indexOf('1 × Mazmorra:'))
  })

  it('Recursos: los objetos primero, con su icono y su nombre que se copia; la nota, sin icono', () => {
    const [first, second, note] = rowsOf('Recursos')
    expect(first).toContain('class="row copyhost"')
    expect(text(`<li${first}`)).toContain('3 × Pico de tofu')
    expect(text(`<li${second}`)).toContain('(o fabricarlo)')
    expect(note).not.toContain('class="well"')
    expect(text(`<li${note}`)).toBe('Piedras de alma.También del mercadillo.')
  })

  it('sin nada que enseñar no hay ficha', () => {
    const empty: Sheet = { prerequisites: [], needs: null, rewards: null }
    expect(hasDofusSheet(empty)).toBe(false)
    expect(renderToStaticMarkup(<DofusSheet view={empty} />)).toBe('')
    expect(hasDofusSheet({ ...empty, rewards: rich('1 x Domakuro') })).toBe(true)
  })
})

describe('DofusPart: las misiones en la lista numerada de la página de logro', () => {
  const giver = { src: '/api/media/file/pnj.png', width: 64, height: 96 }
  const quests: DofusQuestCard[] = [
    { position: 1, title: 'El libro de los toros', href: '/el-libro', level: 110, giver },
    { position: 2, title: 'Toro de rodeo', href: '/toro', level: 120 },
    { position: 3, title: 'El cazador cazado', note: '(solo empezarla)' },
    {
      position: 4,
      title: 'La fatalidad - El destino',
      links: [
        { text: 'La fatalidad', href: '/la-fatalidad' },
        { text: ' - ' },
        { text: 'El destino', href: '/el-destino' },
      ],
      level: 30,
    },
    { kind: 'link', position: 4, title: 'Logro: Cazadores cazados', href: '/cazadores' },
  ]
  const markup = renderToStaticMarkup(
    <DofusPart
      part={{
        kind: 'achievement',
        achievement: {
          name: 'Púrpura profundo',
          href: '/purpura',
          disabled: false,
          meta: [],
          quests,
        },
      }}
    />,
  )
  const rows = markup.split(/<li(?=[ >])/).slice(1)

  it('una sola columna, aunque pase de tres misiones', () => {
    expect(markup).toContain('<ol class="lq__list" role="list">')
    expect(markup).not.toContain('lq__list--cols')
    expect(rows).toHaveLength(5)
  })

  it('cada misión: su número, su PNJ, el título que abre su guía y «Nivel 110»', () => {
    expect(rows[0]).toContain('data-link=""')
    expect(rows[0]).toContain('<span class="lq__n" aria-hidden="true">1</span>')
    expect(rows[0]).toContain('pnj.png')
    expect(rows[0]).toContain('<a href="/el-libro">El libro de los toros</a>')
    expect(rows[0]).toContain('<p class="lq__k">Nivel 110</p>')
  })

  it('sin el render de su PNJ, el icono genérico de misión', () => {
    expect(rows[1]).toContain('data-icon="quest"')
  })

  it('sin guía: sin enlace, con la nota de Torre y «Sin guía todavía»', () => {
    expect(rows[2]).not.toContain('data-link')
    expect(rows[2]).not.toContain('<a ')
    expect(text(`<li${rows[2]}`)).toContain('(solo empezarla)')
    expect(text(`<li${rows[2]}`)).toContain('Sin guía todavía')
  })

  it('una fila de varias guías enlaza cada trozo y no abre la fila entera', () => {
    expect(rows[3]).not.toContain('data-link')
    expect(rows[3]).toContain('<a href="/la-fatalidad">La fatalidad</a>')
    expect(rows[3]).toContain('<a href="/el-destino">El destino</a>')
  })

  it('lo que Torre enlaza que no es una misión va sin número', () => {
    expect(rows[4]).toContain('<span class="lq__n" aria-hidden="true"></span>')
    expect(rows[4]).toContain('<a href="/cazadores">Logro: Cazadores cazados</a>')
  })
})
