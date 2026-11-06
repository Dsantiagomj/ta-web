import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GuideBody, GuideSteps } from '@/components/game/GuideBody'
import { GuideRichText } from '@/components/game/GuideRichText'
import type { GuideStep, RichTextState } from '@/lib/guides/page'

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

  it('con un nivel mínimo, los títulos del texto bajan por debajo del título que los contiene', () => {
    const h2 = { type: 'heading', tag: 'h2', version: 1, children: [text('Recomendaciones')] }
    const h5 = { type: 'heading', tag: 'h5', version: 1, children: [text('Nota')] }
    expect(html(<GuideRichText content={root(h2, h5)} minHeading={4} />)).toBe(
      '<h4>Recomendaciones</h4><h5>Nota</h5>',
    )
  })

  it('con priorityImage, solo la primera imagen subida va sin diferir y con prioridad alta', () => {
    const media = {
      id: 5,
      alt: 'Hupe Esse',
      url: '/api/media/file/hupe.webp',
      width: 800,
      height: 551,
      updatedAt: '2026-11-05T00:00:00.000Z',
      createdAt: '2026-11-05T00:00:00.000Z',
    }
    const upload = { type: 'upload', version: 1, relationTo: 'media', value: media, fields: null }
    const content = root(paragraph(text('Mira.')), upload, upload)
    const first = html(<GuideRichText content={content} priorityImage />)
    expect(first.match(/fetchPriority="high"/g)).toHaveLength(1)
    expect(first.match(/loading="lazy"/g)).toHaveLength(1)
    // Sin priorityImage, todas diferidas.
    const lazy = html(<GuideRichText content={content} />)
    expect(lazy).not.toContain('fetchPriority')
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

describe('GuideSteps', () => {
  const steps: GuideStep[] = [
    {
      key: 'p1',
      title: 'Habla con Hupe Esse',
      coordinates: { x: 7, y: -19 },
      blocks: [
        {
          kind: 'richText',
          key: 'a',
          content: root(paragraph(text('Habla con Hupe Esse [7,-19].'))),
        },
      ],
    },
    {
      key: 'p2',
      coordinates: { x: 3, y: -17 },
      blocks: [
        { kind: 'richText', key: 'b', content: root(paragraph(text('Vuelve con Luci.'))) },
        { kind: 'callout', key: 'c', variant: 'warning', content: root(paragraph(text('Ojo.'))) },
        { kind: 'callout', key: 'd', variant: 'tip', content: root(paragraph(text('Ve lejos.'))) },
      ],
    },
  ]

  it('pinta cada paso numerado con su ancla y sus bloques, sin títulos ni casillas', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup).toContain('<li id="paso-1" class="qstep" data-step="true">')
    expect(markup).toContain('<li id="paso-2" class="qstep" data-step="true">')
    // El título del bloque Paso no se pinta en v4: la lista «Pasos» saca su etiqueta del texto.
    expect(markup).not.toContain('Habla con Hupe Esse</h3>')
    expect(markup).not.toContain('type="checkbox"')
  })

  it('las coordenadas del paso van como chip solo si su texto no las nombra', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup.match(/data-copy="\/travel 7,-19"/g)).toHaveLength(1)
    expect(markup).toContain('<p><span class="coord" data-copy="/travel 3,-17"')
  })

  it('un aviso es «¡Importante!» y un consejo, las recomendaciones de Torre', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup).toContain('role="note"')
    expect(markup).toMatch(/<h3 id="[^"]+" class="callout__title">¡Importante!<\/h3>/)
    expect(markup).toContain('class="torre"')
    expect(markup).toContain('Recomendaciones de Torre')
  })

  it('un título dentro del texto de un paso baja a h3, bajo el h2 «Pasos»', () => {
    const withHeading = html(
      <GuideSteps
        steps={[
          {
            key: 'p',
            blocks: [
              {
                kind: 'richText',
                key: 'r',
                content: root({
                  type: 'heading',
                  tag: 'h2',
                  version: 1,
                  children: [text('Consejos')],
                }),
              },
            ],
          },
        ]}
      />,
    )
    expect(withHeading).toContain('<h3>Consejos</h3>')
  })
})
