import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { achievementProse, type ProseItem } from '../../scripts/import/achievements/prose'
import { parsePage } from '../../scripts/import/squarespace/parse-page'

// La entrada y el cierre de Torre en sus páginas de logro de Squarespace, sobre páginas
// cacheadas del rastreo de 2026-11-02, recortadas a su artículo.

function prose(slug: string) {
  const html = readFileSync(
    path.join(__dirname, '../fixtures/squarespace/logros', `${slug}.html`),
    'utf8',
  )
  return achievementProse(parsePage(html))
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
})
