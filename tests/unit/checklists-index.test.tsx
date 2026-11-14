import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import type { ImageAsset } from '@/components/ui/types'
import type { ChecklistEntry, ChecklistTeaser } from '@/lib/checklists/list'

// El índice /checklists (DESIGN.md, Checklists index): una fila de carteles, como el hub de
// Squarespace. Cada cartel es la escena, el PNJ, el huevo y solo el nombre.

const asset = (src: string, width = 128): ImageAsset => ({ src, width, height: width })

const published: ChecklistEntry = {
  name: 'Dofus Nebuloso',
  slug: 'checklist-nebuloso',
  state: 'published',
  href: '/checklist-nebuloso',
  description: 'Anutropía, Sramvil y Xelorium.',
  egg: asset('/media/nebuloso.png'),
  color: '#875cd2',
  ink: { dark: '#9f7fda', light: '#5b3e8e' },
  scene: asset('/media/xelorium.jpg', 960),
  npc: asset('/media/khelebragon.png', 300),
  npcFit: { height: 72, right: -30, top: 4 },
}

const legacy: ChecklistEntry = {
  name: 'Dofus Silvestre',
  slug: 'checklist-silvestre',
  state: 'preparing',
  href: 'https://www.torrentearcano.com/checklist-silvestre',
  legacy: true,
  description: 'Todo el Mundo de los Doce.',
}

const off: ChecklistEntry = {
  name: 'Checklist del Jyfus',
  slug: 'checklist-jyfus',
  state: 'preparing',
}

const teaser: ChecklistTeaser = {
  label: 'En camino',
  text: '???',
  egg: asset('/media/soon.png'),
  scene: asset('/media/krosmoz.jpg', 960),
}

const render = (entries: ChecklistEntry[], soon: ChecklistTeaser | null = null) =>
  renderToStaticMarkup(<ChecklistsIndex entries={entries} teaser={soon} />)

describe('ChecklistsIndex', () => {
  it('sin checklists que enseñar, el título y un aviso en vez de una fila vacía', () => {
    const markup = render([])
    expect(markup).toMatch(/<h1 class="ck-h1">Checklists<\/h1>/)
    expect(markup).not.toContain('data-checklist-grid')
    expect(markup).toContain('class="ck-empty"')
    expect(markup).toContain('Todavía no hay checklists publicadas.')
  })

  it('con checklists, la fila de carteles y ningún aviso', () => {
    const markup = render([published])
    expect(markup).toContain('data-checklist-grid')
    expect(markup).not.toContain('class="ck-empty"')
  })

  it('un cartel es un enlace con la escena, el PNJ, el huevo y solo el nombre', () => {
    const markup = render([published])
    expect(markup).toMatch(/<a class="poster" href="\/checklist-nebuloso"[^>]*data-tilt=""/)
    expect(markup).toContain('<span class="poster__name">Dofus Nebuloso</span>')
    // Ni la frase de Torre ni ninguna otra línea bajo el nombre.
    expect(markup).not.toContain(published.description)
    for (const src of ['xelorium.jpg', 'khelebragon.png', 'nebuloso.png']) {
      expect(markup).toContain(src)
    }
    // Las imágenes son decorativas: el nombre es el texto del enlace.
    expect(markup.match(/<img [^>]*>/g)!.every((img) => img.includes('alt=""'))).toBe(true)
  })

  it('el color del Dofus, el del nombre en cada modo y el encuadre del PNJ van como datos', () => {
    const markup = render([published])
    expect(markup).toContain('--egg:#875cd2')
    expect(markup).toContain('--egg-ink-dark:#9f7fda')
    expect(markup).toContain('--egg-ink-light:#5b3e8e')
    expect(markup).toContain('--npc-h:72%;--npc-r:-30%;--npc-t:4%')
  })

  it('una Publicada reserva el sitio de su progreso, oculto hasta que se sabe', () => {
    const markup = render([published])
    expect(markup).toMatch(
      /<span class="poster__ring" data-poster-progress="checklist-nebuloso" hidden="">/,
    )
  })

  it('una En preparación que enlaza a Squarespace es un cartel normal: sin píldora, sin aviso y sin progreso', () => {
    const markup = render([legacy])
    expect(markup).toMatch(
      /<a class="poster" href="https:\/\/www.torrentearcano.com\/checklist-silvestre"/,
    )
    expect(markup).not.toContain('En preparación')
    expect(markup).not.toContain('web anterior')
    expect(markup).not.toContain('data-poster-progress')
  })

  it('una En preparación sin enlace sale apagada, sin inclinarse, con la píldora «En preparación»', () => {
    const markup = render([off])
    expect(markup).toMatch(/<div class="poster poster--off" aria-disabled="true"/)
    expect(markup).not.toMatch(/poster--off"[^>]*data-tilt/)
    expect(markup).toContain('<span class="poster__badge">En preparación</span>')
  })

  it('la tarjeta «???» va la última, sin enlace ni inclinación, con su etiqueta y su texto', () => {
    const markup = render([published, legacy], teaser)
    const items = markup.match(/<li[^>]*>[\s\S]*?<\/li>/g)!
    expect(items).toHaveLength(3)
    const soon = items.at(-1)!
    expect(soon).toContain('poster poster--soon')
    expect(soon).not.toContain('<a ')
    expect(soon).not.toContain('data-tilt')
    expect(soon).toContain('<span class="poster__badge">En camino</span>')
    expect(soon).toContain('<span class="poster__name">???</span>')
    expect(soon).toContain('krosmoz.jpg')
  })

  it('cada imagen dice cuánto ocupa, así un móvil no baja el archivo más ancho', () => {
    const variants = (name: string, widths: number[]): ImageAsset => ({
      src: `/media/${name}-${widths.at(-1)}.webp`,
      width: widths.at(-1)!,
      height: widths.at(-1)!,
      srcSet: widths.map((width) => ({ src: `/media/${name}-${width}.webp`, width })),
    })
    const markup = render([
      {
        ...published,
        egg: variants('huevo', [96, 128]),
        scene: variants('zona', [480, 800, 960]),
        npc: variants('pnj', [300, 600]),
      },
    ])
    const sizesOf = (name: string) =>
      markup
        .match(new RegExp(`<img [^>]*src="/media/${name}[^>]*>`))![0]
        .match(/sizes="([^"]+)"/)![1]
    // Lo último de cada sizes es el móvil: lo que mide de verdad a 390 px.
    expect(sizesOf('huevo')).toMatch(/, 70px$/)
    expect(sizesOf('zona')).toMatch(/, 460px$/)
    expect(sizesOf('pnj')).toMatch(/, 150px$/)
  })

  it('sin la tarjeta «???» (apagada en el panel), solo las checklists', () => {
    expect(render([published])).not.toContain('poster--soon')
  })
})
