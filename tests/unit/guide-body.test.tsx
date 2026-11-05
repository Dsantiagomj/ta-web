import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GuideBody } from '@/components/game/GuideBody'
import { GuideRichText } from '@/components/game/GuideRichText'
import type { RichTextState } from '@/lib/guides/page'

type Node = Record<string, unknown>

const text = (value: string, format = 0): Node => ({
  type: 'text',
  text: value,
  format,
  version: 1,
})
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', version: 1, children })
const root = (...children: Node[]) =>
  ({
    root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children },
  }) as unknown as RichTextState

const html = (node: React.ReactNode) => renderToStaticMarkup(node)

describe('GuideRichText', () => {
  it('convierte cada [x,y] de la prosa en un chip de coordenadas', () => {
    const markup = html(
      <GuideRichText content={root(paragraph(text('Ve a [7,-19] y a [ 5 , -18 ].')))} />,
    )
    expect(markup).toContain('data-copy="/travel 7,-19"')
    expect(markup).toContain('data-copy="/travel 5,-18"')
    expect(markup).toMatch(/^<p>Ve a <span class="coord"/)
  })

  it('respeta negrita y cursiva alrededor de los chips', () => {
    const markup = html(<GuideRichText content={root(paragraph(text('Luci [3,-17]', 1)))} />)
    expect(markup).toMatch(/<strong>Luci <span class="coord"[^]*<\/strong>/)
  })

  it('no toca las coordenadas dentro de un enlace ni en código', () => {
    const link = {
      type: 'link',
      version: 1,
      fields: { url: 'https://dofusdb.fr/es/tools/map?coord=7,-19', linkType: 'custom' },
      children: [text('[7,-19]')],
    }
    const markup = html(<GuideRichText content={root(paragraph(link, text(' y [1,2]', 16)))} />)
    expect(markup).not.toContain('data-copy')
    expect(markup).toContain('<a href="https://dofusdb.fr/es/tools/map?coord=7,-19">[7,-19]</a>')
    expect(markup).toContain('<code> y [1,2]</code>')
  })

  it('un enlace con un protocolo que no es web queda como texto', () => {
    const link = {
      type: 'link',
      version: 1,
      fields: { url: 'javascript:alert(1)', linkType: 'custom' },
      children: [text('pulsa')],
    }
    const markup = html(<GuideRichText content={root(paragraph(link))} />)
    expect(markup).not.toContain('javascript:')
    expect(markup).not.toContain('<a')
    expect(markup).toContain('pulsa')
  })

  it('un enlace que abre otra pestaña lleva noopener', () => {
    const link = {
      type: 'link',
      version: 1,
      fields: { url: 'https://www.youtube.com/@TorrenteArcano', newTab: true, linkType: 'custom' },
      children: [text('canal')],
    }
    expect(html(<GuideRichText content={root(paragraph(link))} />)).toContain(
      'rel="noopener noreferrer" target="_blank"',
    )
  })

  it('un h1 de la prosa baja a h2: el único h1 es el título de la guía', () => {
    const heading = { type: 'heading', tag: 'h1', version: 1, children: [text('Combate')] }
    expect(html(<GuideRichText content={root(heading)} />)).toBe('<h2>Combate</h2>')
  })

  it('un nodo desconocido no pinta nada', () => {
    expect(html(<GuideRichText content={root({ type: 'misterio', version: 1 })} />)).toBe('')
  })
})

describe('GuideBody', () => {
  it('pinta los bloques en orden: prosa, captura, vídeo y aviso', () => {
    const markup = html(
      <GuideBody
        blocks={[
          { kind: 'richText', key: 'a', content: root(paragraph(text('Habla con Hupe Esse.'))) },
          {
            kind: 'image',
            key: 'b',
            image: { src: '/api/media/file/hupe.webp', width: 800, height: 551 },
            alt: 'Hupe Esse',
            caption: 'En la biblioteca.',
            priority: false,
          },
          { kind: 'video', key: 'c', url: 'https://youtu.be/VaY3tyYTq4A', title: 'El vídeo' },
          { kind: 'callout', key: 'd', variant: 'warning', content: root(paragraph(text('Ojo.'))) },
        ]}
      />,
    )
    const order = ['Habla con Hupe Esse.', 'data-image-viewer', 'data-video-embed', 'role="note"']
    const positions = order.map((needle) => markup.indexOf(needle))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(markup).toContain('Ver imagen a pantalla completa: Hupe Esse')
    expect(markup).toContain('Importante')
  })

  it('sin bloques, nada', () => {
    expect(html(<GuideBody blocks={[]} />)).toBe('')
  })
})
