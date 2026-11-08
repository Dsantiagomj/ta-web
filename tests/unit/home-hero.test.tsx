import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Hero } from '@/components/home/Hero'
import { LiveStrip } from '@/components/home/LiveStrip'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

const hero = () => renderToStaticMarkup(<Hero />)

describe('el hero de la portada', () => {
  it('el h1 lleva qué es y el nombre, y debajo la frase', () => {
    const markup = hero()
    expect(markup).toMatch(
      /<h1[^>]*><span class="hero__eyebrow">Guías de Dofus en español<\/span> Torrente Arcano<\/h1>/,
    )
    expect(markup).toContain(
      'Misiones, logros y Dofus explicados paso a paso, con capturas y coordenadas para copiar en el chat.',
    )
  })

  it('Torre pregunta qué misión estás haciendo, y la pregunta es la etiqueta del campo', () => {
    const markup = hero()
    expect(markup).toMatch(
      /<label[^>]*for="buscar-mision"[^>]*>¿Qué misión estás haciendo\?<\/label>/,
    )
    expect(markup).toMatch(
      /srcSet="[^"]*torre-pregunta-172\.webp 172w, [^"]*torre-pregunta-344\.webp 344w"/i,
    )
  })

  it('el campo es un combobox cerrado que, sin JavaScript, busca en la web de siempre', () => {
    const markup = hero()
    expect(markup).toMatch(/<form[^>]*role="search"[^>]*aria-label="Buscar una misión"/)
    expect(markup).toContain(`action="${LEGACY_SITE_ORIGIN}/search"`)
    const input = markup.match(/<input[^>]*id="buscar-mision"[^>]*>/)![0]
    expect(input).toContain('role="combobox"')
    expect(input).toContain('type="text"')
    expect(input).toContain('aria-autocomplete="list"')
    expect(input).toContain('aria-expanded="false"')
    expect(input).toContain('aria-controls="buscar-mision-lista"')
    expect(input).toContain('name="q"')
    // El estado para el lector de pantalla está siempre en el DOM.
    expect(markup).toMatch(/<p class="sr-only" role="status"><\/p>/)
  })

  it('la isla es la imagen principal: prioridad alta, AVIF y WebP, y sin carga diferida', () => {
    const isle = hero().match(
      /<picture[^>]*>(?:(?!<\/picture>).)*hero__isle(?:(?!<\/picture>).)*<\/picture>/,
    )![0]
    expect(isle).toContain('type="image/avif"')
    expect(isle).toContain('fetchPriority="high"')
    expect(isle).not.toContain('loading="lazy"')
  })

  it('los seis Dofus primordiales flotan alrededor, decorativos', () => {
    const art = hero().match(/<div class="hero__art" aria-hidden="true">.*<\/div>/)![0]
    expect(art.match(/class="orb"/g)).toHaveLength(6)
  })
})

describe('la franja del directo', () => {
  it('solo aparece en directo, y enlaza al canal de Twitch', () => {
    expect(renderToStaticMarkup(<LiveStrip live={{ live: false }} />)).toBe('')
    const markup = renderToStaticMarkup(<LiveStrip live={{ live: true }} />)
    expect(markup).toContain('Torre está en directo')
    expect(markup).toContain('href="https://www.twitch.tv/torrentearcano"')
  })
})

describe('el peso de la isla de la portada', () => {
  const island = readFileSync('src/components/home/HeroSearch.tsx', 'utf8')

  it('el motor y las filas llegan con import(), nunca en el JavaScript inicial', () => {
    expect(island).toMatch(/import\('\.\/HeroResults'\)/)
    expect(island).not.toMatch(
      /^import (?!type )[^\n]*from '(@\/components\/site\/(search|SearchList)|\.\/HeroResults)'/m,
    )
    expect(island).not.toMatch(/from '\.\/strings'/)
  })
})
