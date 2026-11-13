import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GuideBody, GuideSteps } from '@/components/game/GuideBody'
import { GuideRichText } from '@/components/game/GuideRichText'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'
import type { GuideBlock, GuideStep, RichTextState } from '@/lib/guides/page'

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

  it('un enlace vacío de la web de siempre («…/guia#») queda como texto, con su chip', () => {
    // Squarespace dejó así algunas coordenadas: enlazaban a la propia guía en su web.
    const link = {
      type: 'link',
      version: 1,
      fields: {
        url: 'https://www.torrentearcano.com/una-profecia-bastante-extraa#',
        linkType: 'custom',
      },
      children: [text('[38,-45]', 1)],
    }
    const markup = html(<GuideRichText content={root(paragraph(link))} />)
    expect(markup).not.toContain('torrentearcano.com')
    expect(markup).not.toContain('<a')
    expect(markup).toContain('data-copy="/travel 38,-45"')
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

  it('un vídeo del texto es la fachada: enlace a YouTube, portada propia y su título', () => {
    const poster = {
      id: 7,
      alt: 'Portada del vídeo',
      url: '/api/media/file/video-ovPAxnBdKYQ.webp',
      width: 480,
      height: 360,
      updatedAt: '2026-11-13T00:00:00.000Z',
      createdAt: '2026-11-13T00:00:00.000Z',
    }
    const video = (fields: Record<string, unknown>) => ({
      type: 'block',
      version: 2,
      format: '',
      fields: { id: 'x', blockName: '', blockType: 'proseVideo', ...fields },
    })
    const markup = html(
      <GuideRichText
        content={root(
          paragraph(text('Aquí tienes un vídeo guía.')),
          video({
            url: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ',
            title: 'Guía del Dofus Esmeralda',
            poster,
          }),
          // Sin portada, el recuadro enseña el título.
          video({ url: 'https://youtu.be/3D89qGThRAI', title: 'Favores encadenados' }),
        )}
      />,
    )
    // Nada de YouTube hasta pulsar: un enlace, sin iframe ni imágenes de i.ytimg.com.
    expect(markup).not.toContain('<iframe')
    expect(markup).not.toContain('ytimg')
    expect(markup).toContain('href="https://www.youtube.com/watch?v=ovPAxnBdKYQ"')
    expect(markup).toContain('data-video-embed="https://www.youtube-nocookie.com/embed/ovPAxnBdKYQ')
    expect(markup).toContain('aria-label="Ver el vídeo: Guía del Dofus Esmeralda"')
    expect(markup).toContain('/api/media/file/video-ovPAxnBdKYQ.webp')
    expect(markup).toContain('loading="lazy"')
    expect(markup).toMatch(/<span class="video__title">Favores encadenados<\/span>/)
    expect(markup.indexOf('Aquí tienes')).toBeLessThan(markup.indexOf('video__frame'))
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

  it('pinta cada paso con su ancla y sus bloques, sin números, títulos ni casillas', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup).toContain('<li id="paso-1" class="qstep">')
    expect(markup).toContain('<li id="paso-2" class="qstep">')
    expect(markup).not.toContain('qstep__n')
    // El título del bloque Paso no se pinta.
    expect(markup).not.toContain('Habla con Hupe Esse</h3>')
    expect(markup).not.toContain('type="checkbox"')
  })

  it('las coordenadas del paso van como chip solo si su texto no las nombra', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup.match(/data-copy="\/travel 7,-19"/g)).toHaveLength(1)
    expect(markup).toContain('<p><span class="coord" data-copy="/travel 3,-17"')
  })

  describe('la frase de inicio del paso 1', () => {
    const start = { npc: 'Hupe Esse', x: 7, y: -19 }
    // Un paso 1 importado sin texto: el importador pasó «Habla con Hupe Esse [7,-19] para
    // empezar la misión.» al resumen y solo quedan la captura y las coordenadas del paso.
    const bare: GuideStep = { key: 'p1', coordinates: { x: 7, y: -19 }, blocks: [] }

    it('sin texto y con las coordenadas del inicio, pinta la frase con el PNJ y la chincheta', () => {
      const markup = html(<GuideSteps steps={[bare, steps[1]!]} start={start} />)
      expect(markup).toMatch(
        /<div class="qstep__body prose-guide"><p>Habla con <strong>Hupe Esse<\/strong> <span class="coord" data-copy="\/travel 7,-19"[^]*?<\/span> para empezar la misión\.<\/p>/,
      )
      expect(markup.match(/data-copy="\/travel 7,-19"/g)).toHaveLength(1)
    })

    it('con otras coordenadas, solo la chincheta, como siempre', () => {
      const other = { ...bare, coordinates: { x: 1, y: -17 } }
      const markup = html(<GuideSteps steps={[other]} start={start} />)
      expect(markup).not.toContain('para empezar la misión')
      expect(markup).toContain('<p><span class="coord" data-copy="/travel 1,-17"')
    })

    it('si el paso 1 tiene texto, o no hay PNJ de inicio, no se añade nada', () => {
      expect(html(<GuideSteps steps={steps} start={start} />)).not.toContain(
        'para empezar la misión',
      )
      expect(html(<GuideSteps steps={[bare]} />)).not.toContain('para empezar la misión')
      expect(html(<GuideSteps steps={[bare]} />)).toContain('<p><span class="coord"')
    })

    it('solo en el primer paso', () => {
      const markup = html(<GuideSteps steps={[steps[1]!, bare]} start={start} />)
      expect(markup).not.toContain('para empezar la misión')
    })
  })

  it('un aviso es «¡Importante!» y un consejo, las recomendaciones de Torre', () => {
    const markup = html(<GuideSteps steps={steps} />)
    expect(markup).toContain('role="note"')
    expect(markup).toMatch(/<h3 id="[^"]+" class="callout__title">¡Importante!<\/h3>/)
    expect(markup).toContain('class="torre"')
    expect(markup).toContain('Recomendaciones de Torre')
  })

  describe('las capturas de un paso', () => {
    const shot = (key: string, priority = false): GuideBlock => ({
      kind: 'image',
      key,
      image: {
        src: `/api/media/file/${key}-800.webp`,
        width: 800,
        height: 500,
        srcSet: [
          { src: `/api/media/file/${key}-480.webp`, width: 480 },
          { src: `/api/media/file/${key}-800.webp`, width: 800 },
        ],
      },
      alt: key,
      priority,
    })
    const prose = (key: string, value: string): GuideBlock => ({
      kind: 'richText',
      key,
      content: root(paragraph(text(value))),
    })

    it('las seguidas van juntas en una rejilla, a media columna', () => {
      const markup = html(
        <GuideSteps
          steps={[{ key: 'p', blocks: [prose('t', 'Habla con Luci.'), shot('a'), shot('b')] }]}
        />,
      )
      expect(markup).toMatch(
        /<p>Habla con Luci\.<\/p><div class="figs"><figure>.*a-800\.webp.*<\/figure><figure>.*b-800\.webp.*<\/figure><\/div>/,
      )
      expect(markup.match(new RegExp(`sizes="${escape(IMAGE_SIZES.half)}"`, 'g'))).toHaveLength(2)
    })

    it('el texto entre dos capturas las separa; una sola va también en su rejilla, debajo', () => {
      const markup = html(
        <GuideSteps
          steps={[{ key: 'p', blocks: [shot('a'), prose('t', 'Luego ve al zaap.'), shot('b')] }]}
        />,
      )
      expect(markup.match(/<div class="figs">/g)).toHaveLength(2)
      expect(markup).toMatch(/<\/div><p>Luego ve al zaap\.<\/p><div class="figs">/)
    })

    it('fuera de los pasos, las capturas siguen a lo ancho de la columna', () => {
      const markup = html(<GuideBody blocks={[shot('a'), shot('b')]} />)
      expect(markup).not.toContain('class="figs"')
      expect(markup).toContain(`sizes="${IMAGE_SIZES.prose}"`)
    })
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
