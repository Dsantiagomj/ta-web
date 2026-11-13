import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { achievementProse, type ProseItem } from '../../scripts/import/achievements/prose'
import {
  parsePage,
  type PageBlock,
  type SquarespacePage,
} from '../../scripts/import/squarespace/parse-page'

// La entrada y el cierre de Torre en sus páginas de logro de Squarespace, sobre páginas
// cacheadas del rastreo de 2026-11-02, recortadas a su artículo.

function page(slug: string): SquarespacePage {
  const html = readFileSync(
    path.join(__dirname, '../fixtures/squarespace/logros', `${slug}.html`),
    'utf8',
  )
  return parsePage(html)
}

const prose = (slug: string) => achievementProse(page(slug))

/** Un bloque de texto con un elemento, como lo da parsePage. */
function textBlock(tag: string, text: string, inner = text): PageBlock {
  return { type: 'text', elements: [{ tag, text, html: `<${tag}>${inner}</${tag}>` }] }
}

/** La página con unos bloques metidos justo antes del primero cuyo texto empieza así. */
function inserting(base: SquarespacePage, before: string, blocks: PageBlock[]): SquarespacePage {
  const at = base.blocks.findIndex(
    (block) => block.type === 'text' && block.elements[0]?.text.startsWith(before),
  )
  if (at === -1) throw new Error(`No hay bloque que empiece por «${before}»`)
  return { ...base, blocks: [...base.blocks.slice(0, at), ...blocks, ...base.blocks.slice(at)] }
}

/** La página sin los bloques de texto cuyo texto empieza así (y lo que haya dentro). */
function without(base: SquarespacePage, ...starts: string[]): SquarespacePage {
  return {
    ...base,
    blocks: base.blocks.flatMap((block): PageBlock[] => {
      if (block.type !== 'text') return [block]
      const elements = block.elements.filter(
        (element) => !starts.some((start) => element.text.startsWith(start)),
      )
      return elements.length ? [{ ...block, elements }] : []
    }),
  }
}

/** Un resumen legible de cada pieza: la etiqueta y las seis primeras palabras de su texto. */
function outline(items: ProseItem[]): string[] {
  return items.map((item) => {
    if (item.type === 'video') return `vídeo ${item.url} ${item.title ?? '(sin título)'}`
    if (item.type === 'image') return `imagen ${item.url.split('/').pop()}`
    const tag = /^<(\w+)/.exec(item.html)![1]
    const text = item.html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return `${tag}: ${text.split(' ').slice(0, 6).join(' ')}`
  })
}

describe('achievementProse', () => {
  it('el cierre tras las recompensas, con su vídeo en su sitio y el HTML de Torre tal cual', () => {
    const { intro, outro } = prose('verde-esmeralda')
    expect(intro).toEqual([])
    expect(outline(outro)).toEqual([
      'p: Aquí tienes también un vídeo guía',
      'vídeo https://www.youtube.com/watch?v=ovPAxnBdKYQ GUÍA actualizada DOFUS ESMERALDA 2026 || DOFUS 3.5',
      'p: No te olvides suscribirte al canal',
    ])
    expect(outro[0]).toEqual({
      type: 'html',
      html:
        '<p class="" style="white-space:pre-wrap;">Aquí tienes  también un vídeo guía de ' +
        'TODAS las misiones del Dofus esmeralda. Mucha suerte mi kingu &lt;3. </p>',
    })
  })

  it('un vídeo envuelto en Embedly, sin título que sirva', () => {
    expect(outline(prose('lfavores-encadenados').outro)).toEqual([
      'p: Te dejo con un vídeo guía',
      'vídeo https://www.youtube.com/watch?v=3D89qGThRAI (sin título)',
      'p: No olvides suscribirte al canal UwU',
    ])
  })

  it('dos vídeos seguidos, en su orden', () => {
    const videos = prose('el-perforar-se-va-a-acabar').outro.filter((item) => item.type === 'video')
    expect(videos.map((video) => video.type === 'video' && video.url)).toEqual([
      'https://www.youtube.com/watch?v=kfhabQMxSHg',
      'https://www.youtube.com/watch?v=Tf9DaWKJNqg',
    ])
  })

  it('el cierre con sus capturas entre los párrafos', () => {
    const { outro } = prose('experimentos-al-azar')
    expect(outline(outro).map((line) => line.split(' ')[0])).toEqual([
      'p:',
      'imagen',
      'p:',
      'imagen',
      'p:',
      'imagen',
      'p:',
    ])
    expect(outro[1]).toMatchObject({
      type: 'image',
      url: expect.stringMatching(/^https:\/\/images\.squarespace-cdn\.com\/.+\.png$/),
    })
  })

  it('la entrada antes de las misiones', () => {
    const { intro, outro } = prose('el-cazador-que-lo-cace')
    expect(outline(intro)).toEqual(['p: Solo hay que hacer una de'])
    expect(outro).toEqual([])
  })

  it('una entrada que presenta una lista se lleva su lista', () => {
    const { intro, outro } = prose('en-marcha-hacia-la-aventura')
    expect(outline(intro)).toEqual([
      'p: Se recomienda haber hecho las misiones',
      'ul: Empezar bien.Vencer a los monstruos.El anillo',
    ])
    expect(outro).toEqual([])
  })

  it('lo que Torre escribe entre las misiones y las recompensas va al cierre', () => {
    expect(outline(prose('capturas-amakneanas').outro)).toEqual([
      'h4: Milicia de astrub',
      'p: Ubicada en [5,-19], esta milicia cuenta',
      'p: El NPC correspondiente es el “Guardián',
      'ul: Peazo bellotaTortacia LeukocitinaOgivol scarrateroBrumen TinctoriasQil BilNoai',
      'imagen image.png',
    ])
  })

  it('una frase con su lista dentro de Necesitarás es prosa; un rótulo de grupo, no', () => {
    expect(outline(prose('pesca-fresca-fresquisima').outro)).toEqual([
      'p: Misiones que no aparecen en el',
      'ul: La pesca de Mel.Mel odiosa.Mel, o',
    ])
    // «Combates:» y «Mazmorras:» son grupos de Necesitarás, no prosa.
    expect(outline(prose('ocre-de-ambar').outro)).toEqual([
      'p: Aquí te dejo un video guía',
      'vídeo https://www.youtube.com/watch?v=ou3O6UVGO0E (sin título)',
      'p: No olvides suscribirte al canal UwU',
    ])
  })

  it('las listas que siguen a las recompensas no son cierre (dos columnas en Squarespace)', () => {
    const { intro, outro } = prose('el-monarquico')
    expect(outline(intro)).toEqual(['p: IMPORTANTE: Las primeras 2 misiones no'])
    expect(outro).toEqual([])
  })

  it('una página con solo las listas no tiene prosa', () => {
    expect(prose('la-ocasion-hace-al-ladron')).toEqual({ intro: [], outro: [] })
  })

  it('una página sin misiones ni recompensas es toda entrada, con su vídeo', () => {
    const { intro, outro } = prose('draguisla-tortilla')
    expect(outline(intro).slice(0, 2)).toEqual([
      'p: Explicación del monstruo y las sinergias:',
      'p: Draguisla Bonita es un monstruo que',
    ])
    expect(outline(intro).slice(-4)).toEqual([
      'p: RECOMENDACIONES',
      'ul: Antes de nada, te recomiendo buscar',
      'vídeo https://www.youtube.com/watch?v=l6cfC8E63WU (sin título)',
      'p: No te olvides suscribirte al canal',
    ])
    expect(outro).toEqual([])
  })

  describe('la plantilla se reconoce por su forma exacta, y nada de Torre se pierde', () => {
    it('sin «Recompensas», los grupos de Necesitarás siguen siendo plantilla', () => {
      // Ocre de ámbar sin sus recompensas: «Combates:» y «Mazmorras:» con sus listas no
      // pasan al cierre; el texto de Torre después del vídeo, sí.
      const base = without(page('ocre-de-ambar'), 'Recompensas del logro', '4 874 772 XP')
      expect(outline(achievementProse(base).outro)).toEqual([
        'p: Aquí te dejo un video guía',
        'vídeo https://www.youtube.com/watch?v=ou3O6UVGO0E (sin título)',
        'p: No olvides suscribirte al canal UwU',
      ])
    })

    it('una frase de Torre que habla de lo que vas a necesitar no es el rótulo de la plantilla', () => {
      const sentence = 'Para este logro vas a necesitar mucha paciencia, te recomiendo:'
      const base = inserting(page('el-cazador-que-lo-cace'), 'Solo hay que hacer', [
        textBlock('p', sentence),
        textBlock('ul', 'Ir con amigos.', '<li><p>Ir con amigos.</p></li>'),
      ])
      expect(outline(achievementProse(base).intro)).toEqual([
        'p: Para este logro vas a necesitar',
        'ul: Ir con amigos.',
        'p: Solo hay que hacer una de',
      ])
    })

    it('«Necesitarás mucha suerte.» en el cierre es de Torre', () => {
      const base = inserting(page('verde-esmeralda'), 'No te olvides', [
        textBlock('p', 'Necesitarás mucha suerte, mi kingu.'),
      ])
      expect(outline(achievementProse(base).outro)).toContain(
        'p: Necesitarás mucha suerte, mi kingu.',
      )
    })

    it('un subtítulo corto de Torre con su lista, dentro de Necesitarás, es prosa', () => {
      // Justo después de la lista de Necesitarás, donde un rótulo de grupo sería plantilla.
      const base = inserting(page('pesca-fresca-fresquisima'), 'Misiones que no aparecen', [
        textBlock('p', 'Consejo importante:'),
        textBlock('ul', 'Lleva pociones.', '<li><p>Lleva pociones.</p></li>'),
      ])
      expect(outline(achievementProse(base).outro)).toEqual([
        'p: Consejo importante:',
        'ul: Lleva pociones.',
        'p: Misiones que no aparecen en el',
        'ul: La pesca de Mel.Mel odiosa.Mel, o',
      ])
    })
  })
})
